// Script de teste da Parte 4: monta o indice do vault inteiro.
// Rode com:  npm run indice

import { buildIndex } from './vault.js';

const start = Date.now();
const { notes, backlinks, broken } = buildIndex();
const ms = Date.now() - start;

const totalLinks = [...notes.values()].reduce((sum, n) => sum + n.links.length, 0);

console.log(`${notes.size} notas lidas em ${ms}ms`);
console.log(`${totalLinks} links, ${totalLinks - broken.length} resolvidos, ${broken.length} quebrado(s)`);

console.log('\n--- NOTAS POR PASTA ---');
const perFolder = {};
for (const note of notes.values()) {
  const folder = note.folder || '(raiz)';
  perFolder[folder] = (perFolder[folder] || 0) + 1;
}
for (const [folder, count] of Object.entries(perFolder)) {
  console.log(`  ${String(count).padStart(2)}  ${folder}`);
}

console.log('\n--- MAIS CITADAS ---');
[...backlinks.entries()]
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 5)
  .forEach(([id, list]) => {
    console.log(`  ${String(list.length).padStart(2)} backlinks  ${notes.get(id).name}`);
  });

const example = 'Apostila Engenharia de Software/10 — Controle de Versão com Git.md';
console.log(`\n--- QUEM APONTA PARA "${notes.get(example).name}" ---`);
for (const b of backlinks.get(example) ?? []) {
  console.log(`  de: ${notes.get(b.from).name}  (linha ${b.line})`);
  console.log(`      "${b.context.slice(0, 95)}"`);
}

console.log('\n--- LINKS QUEBRADOS ---');
for (const b of broken) {
  console.log(`  [[${b.target}]] em ${notes.get(b.from).name}, linha ${b.line}`);
}
