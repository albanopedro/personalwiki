// Script de teste: le UMA nota e mostra o que o parser entendeu.
// Rode com:  npm run teste

import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { parseFrontmatter, extractWikiLinks } from './parser.js';

const noteRelPath = 'Apostila Engenharia de Software/00 — Índice.md';

const fullPath = path.join(config.vaultPath, noteRelPath);
const raw = fs.readFileSync(fullPath, 'utf8');

const { data, body } = parseFrontmatter(raw);
const links = extractWikiLinks(body);

console.log('ARQUIVO:', noteRelPath, `(${raw.length} caracteres)\n`);

console.log('--- CABEÇALHO ---');
console.log('tags   :', data.tags);
console.log('aliases:', data.aliases);

console.log(`\n--- WIKI LINKS (${links.length}) ---`);
for (const link of links) {
  const apelido = link.alias ? `  apelido: "${link.alias}"` : '';
  console.log(`  linha ${String(link.line).padStart(3)} -> ${link.target}${apelido}`);
}
