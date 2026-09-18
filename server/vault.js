// PARTE 4: o indice do vault.
//
// Le TODAS as notas uma unica vez e guarda tudo na memoria, ja processado.
// Depois disso, perguntas como "quem aponta para esta nota?" sao respondidas
// na hora, sem reabrir nenhum arquivo.

import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { parseFrontmatter, extractWikiLinks, toKey } from './parser.js';

// Pastas que existem dentro do vault mas nao sao notas.
const IGNORED = ['.obsidian', '.trash', '.git'];

/**
 * Acha todos os arquivos .md do vault, entrando em cada subpasta.
 *
 * Repare que a funcao chama a SI MESMA quando encontra uma pasta.
 * Isso e recursao: nao importa quantos niveis de pasta existam,
 * ela desce ate o fundo de cada um.
 */
function findNoteFiles(dir) {
  const files = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED.includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findNoteFiles(fullPath));   // entra na subpasta
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

/** O frontmatter pode trazer um valor solto ou uma lista: sempre vira lista. */
function toList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value) return [value];
  return [];
}

export function buildIndex() {
  // PASSO 1: ler e processar cada nota -------------------------------------
  const notes = new Map();   // id -> nota

  for (const fullPath of findNoteFiles(config.vaultPath)) {
    const id = path.relative(config.vaultPath, fullPath).normalize('NFC');
    let raw;
    try {
      raw = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;   // o arquivo sumiu entre listar e ler: renomeado ou apagado agora mesmo (Parte 15)
    }
    const { data, body } = parseFrontmatter(raw);

    notes.set(id, {
      id,                                        // caminho dentro do vault
      name: path.basename(id, '.md'),            // nome do arquivo, sem .md
      folder: path.dirname(id) === '.' ? '' : path.dirname(id),
      tags: toList(data.tags),
      aliases: toList(data.aliases),
      links: extractWikiLinks(body),             // o que ESTA nota aponta
      body,
    });
  }

  // PASSO 2: a "lista telefonica" - dado um nome, qual e o arquivo? ---------
  const byName = new Map();  // chave do nome -> id

  for (const note of notes.values()) {
    byName.set(toKey(note.name), note.id);
  }

  // PASSO 3: inverter as setas para descobrir os backlinks ------------------
  const backlinks = new Map();   // id -> quem aponta para ele
  const broken = [];             // links para notas que nao existem

  for (const note of notes.values()) {
    for (const link of note.links) {
      const targetId = byName.get(toKey(link.target));

      if (!targetId) {
        broken.push({ from: note.id, target: link.target, line: link.line });
        continue;
      }
      if (targetId === note.id) continue;        // nota apontando para si mesma

      if (!backlinks.has(targetId)) backlinks.set(targetId, []);
      backlinks.get(targetId).push({
        from: note.id,
        context: link.context,
        line: link.line,
      });
    }
  }

  // builtAt: o momento em que este indice foi montado. Funciona como o
  // "numero da versao" do indice: se mudou, alguma nota mudou.  (Parte 15)
  return { notes, byName, backlinks, broken, builtAt: Date.now() };
}

/**
 * Fica de olho no vault e chama onChange quando alguma nota muda.  (Parte 15)
 *
 * O fs.watch e do proprio Node: o macOS avisa a cada arquivo criado,
 * alterado, renomeado ou apagado, em todas as subpastas (recursive).
 *
 * Um "salvar" do Obsidian pode gerar varios avisos seguidos (e o Obsidian
 * salva sozinho enquanto voce digita). Entao os avisos sao juntados: so
 * depois de 300ms sem nenhum aviso novo e que o onChange e chamado, com a
 * lista de arquivos que mudaram. Uma rajada de avisos, uma reconstrucao.
 */
export function watchVault(onChange) {
  const changed = new Set();
  let timer = null;

  fs.watch(config.vaultPath, { recursive: true }, (event, filename) => {
    if (!filename || !filename.endsWith('.md')) return;                     // so notas
    if (filename.split(path.sep).some((part) => IGNORED.includes(part))) return;   // nada da .obsidian

    changed.add(filename.normalize('NFC'));
    clearTimeout(timer);
    timer = setTimeout(() => {
      const files = [...changed];
      changed.clear();
      onChange(files);
    }, 300);
  });
}
