// PARTE 5: a API.
//
// O navegador, por seguranca, nao consegue ler arquivos do seu computador.
// Entao ele PEDE para este servidor, que le o vault e RESPONDE em JSON.
// Cada rota abaixo e uma "pergunta" que o navegador pode fazer.

import express from 'express';
import { config } from '../config.js';
import { buildIndex } from './vault.js';
import { search } from './search.js';

// O indice e montado UMA vez, quando o servidor liga.
// Todas as perguntas depois disso sao respondidas direto da memoria.
const index = buildIndex();
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

app.listen(config.apiPort, () => {
  console.log(`API rodando em http://localhost:${config.apiPort}`);
});
