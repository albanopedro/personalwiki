// PARTE 4: o indice do vault.
//
// Le TODAS as notas uma unica vez e guarda tudo na memoria, ja processado.
// Depois disso, perguntas como "quem aponta para esta nota?" sao respondidas
// na hora, sem reabrir nenhum arquivo.

import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { parseFrontmatter, extractWikiLinks } from './parser.js';

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

/**
 * Transforma um nome em "chave de busca": minusculo e com acentos num
 * formato unico.
 *
 * O normalize('NFC') resolve uma pegadinha do macOS: ele as vezes grava
 * o "í" do nome do arquivo como DOIS caracteres ("i" + acento solto),
 * enquanto o "í" digitado dentro da nota e UM caractere so. Na tela sao
 * identicos; para o computador sao textos diferentes. No seu vault, sem
 * esta linha, 35 dos 74 links quebram.
 */
function toKey(name) {
  return name.normalize('NFC').toLowerCase().trim();
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
    const raw = fs.readFileSync(fullPath, 'utf8');
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

  return { notes, byName, backlinks, broken };
}
