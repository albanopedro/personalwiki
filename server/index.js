// PARTE 5: a API.
//
// O navegador, por seguranca, nao consegue ler arquivos do seu computador.
// Entao ele PEDE para este servidor, que le o vault e RESPONDE em JSON.
// Cada rota abaixo e uma "pergunta" que o navegador pode fazer.

import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { buildIndex, watchVault } from './vault.js';
import { search } from './search.js';

// O indice e montado UMA vez, quando o servidor liga.
// Todas as perguntas depois disso sao respondidas direto da memoria.
// "let", e nao mais "const": o indice agora e TROCADO por um novo quando
// voce edita uma nota no Obsidian. As rotas leem esta variavel a cada
// pergunta, entao sempre enxergam o indice mais recente.  (Parte 15)
let index = buildIndex();
console.log(`Índice pronto: ${index.notes.size} notas.`);

const app = express();

// O editor manda o texto da nota no corpo do pedido, em JSON. O limite
// padrao do express e 100 KB - pequeno demais para a sua nota de 268 KB.
app.use(express.json({ limit: '10mb' }));

const listeners = new Set();   // as abas abertas, ouvindo os avisos (Parte 15)

function sendVersion(res) {
  res.write(`data: ${JSON.stringify({ builtAt: index.builtAt })}\n\n`);
}

/**
 * Le o vault de novo e avisa todas as abas abertas.  (Partes 15 e 18)
 *
 * Duas coisas chamam esta funcao: o vigia de arquivos, quando voce edita no
 * Obsidian, e a criacao de uma nota pelo wiki - que precisa do indice novo
 * na hora, para conseguir abrir a nota que acabou de nascer.
 */
function rebuildIndex(motivo) {
  const started = Date.now();
  try {
    index = buildIndex();
  } catch (err) {
    console.error(`Nao consegui refazer o indice (${err.message}); fica o anterior.`);
    return false;
  }
  console.log(`${motivo} -> indice refeito em ${Date.now() - started}ms, avisando ${listeners.size} aba(s).`);
  for (const res of listeners) sendVersion(res);
  return true;
}

/**
 * O caminho real do arquivo de uma nota. Esta funcao e a UNICA porta de
 * entrada para escrever no vault, e tem duas travas.  (Parte 17)
 *
 * 1. O id precisa ser de uma nota que o indice CONHECE. Ninguem inventa
 *    caminho: "../../.ssh/config" nao esta no indice, entao nao passa.
 * 2. Mesmo assim, o caminho final precisa cair dentro da pasta do vault.
 *    Duas travas para a mesma coisa e de proposito: se um dia a primeira
 *    mudar de ideia, a segunda ainda segura.
 */
function notePath(id) {
  if (!index.notes.has(id)) return null;
  const vault = path.resolve(config.vaultPath);
  const full = path.resolve(vault, id);
  if (!full.startsWith(vault + path.sep)) return null;
  return full;
}

// Pergunta 1: "quais notas existem?"
// Devolve a lista SEM o texto das notas - so o necessario para montar o
// menu lateral. Mandar os 627 KB do vault inteiro so para listar nomes
// seria desperdicio.
app.get('/api/notes', (req, res) => {
  const list = [...index.notes.values()]
    .map((note) => ({
      id: note.id,
      name: note.name,
      folder: note.folder,
      tags: note.tags,
      backlinkCount: index.backlinks.get(note.id)?.length ?? 0,
    }))
    .sort((a, b) => a.id.localeCompare(b.id, 'pt-BR'));

  res.json(list);
});

// Pergunta 2: "me mostra a nota X"
// O id vai na URL assim:  /api/note?id=Apostila.../01 — Fundamentos.md
app.get('/api/note', (req, res) => {
  // Mesma pegadinha de acento da Parte 4: normaliza antes de procurar.
  const id = String(req.query.id ?? '').normalize('NFC');
  const note = index.notes.get(id);

  if (!note) {
    return res.status(404).json({ error: `Nota não encontrada: ${id}` });
  }

  const backlinks = (index.backlinks.get(note.id) ?? []).map((b) => ({
    ...b,
    fromName: index.notes.get(b.from).name,   // a tela vai querer mostrar o nome
  }));

  res.json({ ...note, backlinks });
});

// Pergunta 3: "onde aparece este texto?"  (Parte 9)
// (Uma rota /api/resolve existiu aqui ate a Parte 13, quando o navegador
// passou a traduzir os [[links]] sozinho, na hora de desenhar.)
app.get('/api/search', (req, res) => {
  res.json(search(index, String(req.query.q ?? '')));
});

// Pergunta 4: "como as notas se ligam?"  (Parte 16)
// Tudo que o grafo precisa, de uma vez so: as notas (os nos) e os pares de
// notas ligadas (as arestas). As arestas saem dos backlinks, que o indice ja
// resolveu na Parte 4 - nenhum nome precisa ser traduzido de novo aqui.
app.get('/api/graph', (req, res) => {
  const pairs = new Map();   // par de notas -> { source, target, count }

  for (const [target, list] of index.backlinks) {
    for (const b of list) {
      // Sem direcao: "A aponta para B" e "B aponta para A" viram a MESMA
      // linha (16 pares do seu vault sao assim). Ordenar o par garante isso.
      const [source, dest] = [b.from, target].sort();
      const key = JSON.stringify([source, dest]);
      const pair = pairs.get(key) ?? { source, target: dest, count: 0 };
      pair.count++;                          // quantos links ligam as duas
      pairs.set(key, pair);
    }
  }

  // Grau: com quantas outras notas cada nota esta ligada (define o tamanho)
  const degree = new Map();
  for (const { source, target } of pairs.values()) {
    degree.set(source, (degree.get(source) ?? 0) + 1);
    degree.set(target, (degree.get(target) ?? 0) + 1);
  }

  const nodes = [...index.notes.values()].map((note) => ({
    id: note.id,
    name: note.name,
    folder: note.folder,
    degree: degree.get(note.id) ?? 0,
  }));

  res.json({ nodes, edges: [...pairs.values()] });
});

// Pergunta 5: "me da o texto CRU da nota"  (Parte 17)
//
// O editor precisa do arquivo inteiro, inclusive o frontmatter - que o
// indice guarda separado desde a Parte 3. Se o editor salvasse so o corpo,
// as tags e os aliases sumiriam do arquivo.
//
// E le do disco AGORA, nao da memoria: assim o mtime (o momento da ultima
// gravacao) e o mais atual possivel. Ele e a base da protecao contra
// escrever por cima de uma alteracao feita no Obsidian.
app.get('/api/raw', (req, res) => {
  const id = String(req.query.id ?? '').normalize('NFC');
  const full = notePath(id);
  if (!full) {
    return res.status(404).json({ error: `Nota não encontrada: ${id}` });
  }

  try {
    const raw = fs.readFileSync(full, 'utf8');
    res.json({ id, raw, mtime: fs.statSync(full).mtimeMs });
  } catch (err) {
    res.status(500).json({ error: `Não consegui ler o arquivo: ${err.message}` });
  }
});

// Pergunta 6: "guarda este texto na nota X"  (Parte 17)
//
// A UNICA rota do wiki que escreve no seu vault.
app.put('/api/note', (req, res) => {
  const id = String(req.body?.id ?? '').normalize('NFC');
  const raw = req.body?.raw;
  const expected = Number(req.body?.mtime);

  const full = notePath(id);
  if (!full) {
    return res.status(404).json({ error: `Nota não encontrada: ${id}` });
  }
  if (typeof raw !== 'string') {
    return res.status(400).json({ error: 'Faltou o texto da nota.' });
  }
  if (!Number.isFinite(expected)) {
    return res.status(400).json({ error: 'Faltou dizer de quando é a versão que você editou.' });
  }

  try {
    // Alguem mexeu no arquivo depois que o editor abriu? O Obsidian, por
    // exemplo. Entao NAO grava por cima: devolve 409 e a tela avisa.
    const atual = fs.statSync(full).mtimeMs;
    if (Math.abs(atual - expected) > 1) {
      return res.status(409).json({
        error: 'A nota mudou no disco depois que você começou a editar. Feche o editor e abra de novo para ver a versão atual.',
      });
    }

    // Gravacao em dois passos: escreve num arquivo temporario e SO ENTAO
    // renomeia por cima do original. O renomear e atomico - nao existe um
    // instante em que a sua nota esteja pela metade no disco, nem se faltar
    // energia no meio. O temporario comeca com ponto e nao termina em .md,
    // entao nem o Obsidian nem o vigia da Parte 15 se importam com ele.
    const temp = path.join(path.dirname(full), `.${path.basename(full)}.tmp`);
    fs.writeFileSync(temp, raw, 'utf8');
    fs.renameSync(temp, full);

    console.log(`Nota gravada: ${id} (${Buffer.byteLength(raw)} bytes)`);
    res.json({ id, mtime: fs.statSync(full).mtimeMs });
  } catch (err) {
    res.status(500).json({ error: `Não consegui salvar: ${err.message}` });
  }
});

// Pergunta 7: "cria uma nota nova com este nome"  (Parte 18)
//
// A segunda rota que escreve no vault - e a unica que cria arquivo. O nome
// vem digitado por voce, entao ele passa por uma peneira antes de virar um
// caminho no disco.
app.post('/api/note', (req, res) => {
  const name = String(req.body?.name ?? '').normalize('NFC').trim();
  const folder = String(req.body?.folder ?? '').normalize('NFC');

  // Peneira do nome. A barra e a que mais importa: sem ela, "a/b" sairia da
  // pasta escolhida. O ponto no comeco esconderia o arquivo, e o Obsidian
  // ignora arquivo escondido. Os dois-pontos o Finder mostra como barra.
  if (!name) {
    return res.status(400).json({ error: 'Escreva um nome para a nota.' });
  }
  if (/[\\/:]/.test(name) || /[\x00-\x1f]/.test(name)) {
    return res.status(400).json({ error: 'O nome não pode ter / \\ nem :' });
  }
  if (name.startsWith('.') || name.length > 200) {
    return res.status(400).json({ error: 'Nome inválido: não pode começar com ponto nem ser tão longo.' });
  }

  // A pasta precisa ser uma que ja existe no vault (ou a raiz, "").
  const folders = new Set([...index.notes.values()].map((n) => n.folder));
  if (folder && !folders.has(folder)) {
    return res.status(400).json({ error: `Pasta desconhecida: ${folder}` });
  }

  const id = path.join(folder, `${name}.md`);
  const vault = path.resolve(config.vaultPath);
  const full = path.resolve(vault, id);
  if (!full.startsWith(vault + path.sep)) {
    return res.status(400).json({ error: 'Caminho inválido.' });
  }

  try {
    // A bandeira "wx" e a trava contra apagar nota existente sem querer:
    // ela cria o arquivo e FALHA se ja houver um com esse nome. Conferir
    // antes com "existe?" e depois gravar deixaria uma brecha entre as duas
    // coisas; assim, quem decide e o proprio sistema de arquivos, de uma vez.
    fs.writeFileSync(full, `# ${name}\n\n`, { encoding: 'utf8', flag: 'wx' });
  } catch (err) {
    if (err.code === 'EEXIST') {
      return res.status(409).json({ error: `Já existe uma nota chamada "${name}" nessa pasta.` });
    }
    return res.status(500).json({ error: `Não consegui criar: ${err.message}` });
  }

  // Refaz o indice JA: sem isso, a tela pediria a nota nova antes de ela
  // existir para o servidor (o vigia da Parte 15 so acorda 300ms depois).
  rebuildIndex(`Nota criada: ${id}`);
  res.status(201).json({ id });
});

// Pergunta 8: "me avisa quando o vault mudar"  (Parte 15)
//
// Server-Sent Events. Em todas as outras rotas, o navegador pergunta e o
// servidor responde uma vez. Aqui, a resposta NUNCA TERMINA: o navegador
// abre a conexao e fica ouvindo, e o servidor escreve uma mensagem nela
// sempre que o indice e refeito. E o servidor falando primeiro.
//
// Cada mensagem leva o builtAt do indice. Logo ao conectar vai a versao
// atual - assim uma aba que ficou desconectada (o Mac dormiu, a API
// reiniciou) percebe que perdeu alguma coisa e busca tudo de novo.
app.get('/api/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',   // o formato do Server-Sent Events
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();                      // manda o cabecalho ja, sem esperar o "fim"
  sendVersion(res);
  listeners.add(res);

  // Sinal de vida a cada 10 segundos.  (Parte 20)
  // Sem ele, uma aba nao tem como perceber que a API morreu: o Vite, no meio
  // do caminho, mantem a conexao aberta, e o navegador continua achando que
  // esta ouvindo. Reenviar a versao atual e inofensivo - se ela nao mudou, a
  // tela nem redesenha - e serve de batida do coracao.
  const heartbeat = setInterval(() => sendVersion(res), 10000);

  req.on('close', () => {                  // a aba fechou: para de avisar
    clearInterval(heartbeat);
    listeners.delete(res);
  });
});

// Quando uma nota muda no disco: refaz o indice inteiro e avisa todo mundo.
watchVault((files) => rebuildIndex(`Vault mudou: ${files.join(', ')}`));

// O '127.0.0.1' e o proprio computador, e so ele. Sem isso, o Node abre a
// API para TODAS as interfaces de rede: na rede da faculdade ou de um cafe,
// outro aparelho conseguiria ler - e, desde a Parte 17, gravar - no seu
// vault, porque estas rotas nao pedem senha nenhuma.  (Parte 20)
app.listen(config.apiPort, '127.0.0.1', () => {
  console.log(`API rodando em http://localhost:${config.apiPort}`);
});
