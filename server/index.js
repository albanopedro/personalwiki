// PARTE 5: a API.
//
// O navegador, por seguranca, nao consegue ler arquivos do seu computador.
// Entao ele PEDE para este servidor, que le o vault e RESPONDE em JSON.
// Cada rota abaixo e uma "pergunta" que o navegador pode fazer.

import express from 'express';
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
// (A antiga pergunta 3, /api/resolve, saiu na Parte 13: o navegador
// passou a traduzir os [[links]] sozinho, na hora de desenhar.)
app.get('/api/search', (req, res) => {
  res.json(search(index, String(req.query.q ?? '')));
});

// Pergunta 5: "como as notas se ligam?"  (Parte 16)
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

// Pergunta 4: "me avisa quando o vault mudar"  (Parte 15)
//
// Server-Sent Events. Em todas as outras rotas, o navegador pergunta e o
// servidor responde uma vez. Aqui, a resposta NUNCA TERMINA: o navegador
// abre a conexao e fica ouvindo, e o servidor escreve uma mensagem nela
// sempre que o indice e refeito. E o servidor falando primeiro.
//
// Cada mensagem leva o builtAt do indice. Logo ao conectar vai a versao
// atual - assim uma aba que ficou desconectada (o Mac dormiu, a API
// reiniciou) percebe que perdeu alguma coisa e busca tudo de novo.
const listeners = new Set();   // as abas abertas, ouvindo

function sendVersion(res) {
  res.write(`data: ${JSON.stringify({ builtAt: index.builtAt })}\n\n`);
}

app.get('/api/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',   // o formato do Server-Sent Events
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();                      // manda o cabecalho ja, sem esperar o "fim"
  sendVersion(res);
  listeners.add(res);
  req.on('close', () => listeners.delete(res));   // a aba fechou: para de avisar
});

// Quando uma nota muda no disco: refaz o indice inteiro e avisa todo mundo.
watchVault((files) => {
  const started = Date.now();
  try {
    index = buildIndex();
  } catch (err) {
    console.error(`Nao consegui refazer o indice (${err.message}); fica o anterior.`);
    return;
  }
  console.log(`Vault mudou: ${files.join(', ')} -> indice refeito em ${Date.now() - started}ms, ` +
              `avisando ${listeners.size} aba(s).`);
  for (const res of listeners) sendVersion(res);
});

app.listen(config.apiPort, () => {
  console.log(`API rodando em http://localhost:${config.apiPort}`);
});
