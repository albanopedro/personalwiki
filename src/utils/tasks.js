import { parseFrontmatter } from '../../server/parser.js';

// A linha de uma tarefa: recuo, marcador da lista, [estado], e o texto
const TASK_LINE = /^(\s*(?:[-*+]|\d+\.)\s+\[)([ xX])(\]\s*)(.*)$/;

/**
 * So as letras e numeros, em minusculas. Serve para comparar o texto que
 * esta na TELA com o texto que esta no ARQUIVO: na tela, o markdown ja
 * virou formatacao ("**Compreender**" aparece como "Compreender"), entao
 * comparar letra por letra nao funcionaria.
 */
const key = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').slice(0, 25);

/**
 * Marca ou desmarca a tarefa da linha N, dentro do texto CRU do arquivo.  (Parte 19)
 *
 * Devolve o texto novo do arquivo - ou null, se alguma conferencia falhar.
 * Sao duas, porque isto grava no vault:
 *   1. a linha precisa MESMO ser uma tarefa;
 *   2. o texto dela precisa ser o mesmo que voce viu na tela.
 * Se o arquivo tiver mudado por fora (voce editou no Obsidian), uma das
 * duas falha e nada e escrito.
 */
export function toggleTaskLine(raw, line, textOnScreen) {
  const { body } = parseFrontmatter(raw);

  // O numero da linha veio do CORPO da nota, e o arquivo pode ter o
  // frontmatter antes. A diferenca de linhas entre os dois e o deslocamento.
  const rawLines = raw.split('\n');
  const offset = rawLines.length - body.split('\n').length;
  const target = rawLines[line + offset];

  const match = TASK_LINE.exec(target ?? '');
  if (!match) return null;

  const [, prefix, state, middle, text] = match;
  const noArquivo = key(text);
  const naTela = key(textOnScreen);
  if (!noArquivo.startsWith(naTela) && !naTela.startsWith(noArquivo)) return null;

  rawLines[line + offset] = prefix + (state === ' ' ? 'x' : ' ') + middle + text;
  return rawLines.join('\n');
}
