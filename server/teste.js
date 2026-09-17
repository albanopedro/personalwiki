// Script de teste da Parte 2: le UMA nota e mostra o que o parser entendeu.
// Rode com:  npm run teste

import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { parseFrontmatter } from './parser.js';

const noteRelPath = 'Apostila Engenharia de Software/00 — Índice.md';

const fullPath = path.join(config.vaultPath, noteRelPath);
const raw = fs.readFileSync(fullPath, 'utf8');

const { data, body } = parseFrontmatter(raw);

console.log('ARQUIVO:', noteRelPath);
console.log('tamanho total:', raw.length, 'caracteres\n');

console.log('--- CABEÇALHO (frontmatter) ---');
console.log(data);

console.log('\n--- CORPO (primeiras 5 linhas) ---');
console.log(body.split('\n').slice(0, 5).join('\n'));

console.log('\n--- CONFERINDO ---');
console.log('tags encontradas   :', data.tags?.length ?? 0);
console.log('aliases encontrados:', data.aliases?.length ?? 0);
console.log('corpo tem          :', body.length, 'caracteres');
