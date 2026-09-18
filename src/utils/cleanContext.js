import { splitTarget } from '../../server/parser.js';

/**
 * Deixa legivel uma linha crua de markdown, para mostrar como trecho.
 * Usada no painel de backlinks (Parte 8) e nos resultados da busca (Parte 9).
 *
 *   > [!note]+ Versionamento → [[10 — Controle de Versão com Git|Módulo 10]]
 * vira
 *   Versionamento → Módulo 10
 */
export function cleanContext(line) {
  return line
    .replace(/^(>\s*)+/, '')                    // os > de citacao
    .replace(/^#{1,6}\s+/, '')                  // os # de titulo (Parte 9)
    .replace(/^\[!\w+\][+-]?\s*/, '')           // o [!note]+ de callout
    .replace(/^([-*]|\d+\.)\s+/, '')            // marcador de lista
    .replace(/^…[^\[\]]*\]\]/, '…')              // outro link cortado no comeco do trecho
    .replace(/\[\[[^\]]*…$/, '…')                // outro link cortado no fim do trecho
    .replace(/\[\[([^\[\]\n]+?)\]\]/g, (_, inner) => splitTarget(inner).display)
    .replace(/^\|\s*|\s*\|$/g, '')              // linha de tabela: tira o | do comeco e do fim...
    .replace(/\s*\|\s*/g, ' · ')                // ...e troca os do meio por um ponto
    .replace(/\*\*|`/g, '');                    // negrito e crases
}
