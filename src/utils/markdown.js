// PARTE 7: transforma o texto markdown da nota em HTML formatado.

import MarkdownIt from 'markdown-it';
import { splitTarget } from '../../server/parser.js';
import { noteUrl } from './routes.js';

// ---------------------------------------------------------------------------
// Cores no codigo  (Parte 14)
// ---------------------------------------------------------------------------
// O highlight.js conhece 193 linguagens. O "lib/core" vem sem nenhuma, e a
// gente registra so as que aparecem no seu vault (medido na Parte 14 -
// inclusive lua e yaml, que estao em blocos dentro de callouts): o
// site fica bem mais leve do que carregando todas. Se um dia voce escrever
// um bloco de outra linguagem, e so importar e registrar ela aqui.
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';   // cobre o jsx tambem
import json from 'highlight.js/lib/languages/json';
import less from 'highlight.js/lib/languages/less';
import lua from 'highlight.js/lib/languages/lua';
import makefile from 'highlight.js/lib/languages/makefile';
import python from 'highlight.js/lib/languages/python';
import scss from 'highlight.js/lib/languages/scss';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';                 // cobre o html tambem
import yaml from 'highlight.js/lib/languages/yaml';

const LANGUAGES = { bash, css, javascript, json, less, lua, makefile, python, scss, sql, typescript, xml, yaml };
for (const [name, language] of Object.entries(LANGUAGES)) {
  hljs.registerLanguage(name, language);
}

/**
 * Pinta um bloco de codigo. O markdown-it chama isto para cada bloco, com o
 * texto do bloco e a linguagem escrita depois das crases (```python).
 *
 * Devolver '' quer dizer "nao pintei": o markdown-it mostra o codigo sem
 * cores. E o que acontece com bloco sem linguagem e com linguagem que nao
 * registramos (o mermaid, por exemplo) - igual ao Obsidian.
 */
function highlightCode(code, lang) {
  if (!lang || !hljs.getLanguage(lang)) return '';
  // ignoreIllegals: codigo "estranho" (como os colados sem quebra de linha da
  // resumo fases luri) e pintado do jeito que der, em vez de dar erro
  return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
}

const md = new MarkdownIt({
  html: false,     // HTML escrito dentro da nota aparece como TEXTO, nunca e executado
  linkify: true,   // um https://... solto no texto vira link clicavel
  breaks: true,    // uma quebra de linha vira quebra de linha, igual ao seu Obsidian
  highlight: highlightCode,   // cores nos blocos de codigo (Parte 14)
});

// ---------------------------------------------------------------------------
// Links externos abrem em outra aba. Sem isso, clicar numa fonte da internet
// tiraria voce do wiki (e voce perderia a nota que estava aberta).
// ---------------------------------------------------------------------------
const defaultLinkOpen = md.renderer.rules.link_open
  || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank');
  tokens[idx].attrSet('rel', 'noopener noreferrer');
  return defaultLinkOpen(tokens, idx, options, env, self);
};

// ---------------------------------------------------------------------------
// Wiki links: [[nota]] e [[nota|apelido]] viram links clicaveis  (Parte 8)
// ---------------------------------------------------------------------------

/**
 * Regra "inline": roda DENTRO de cada trecho de texto, posicao por posicao.
 * Quando encontra [[, procura o ]] que fecha e troca tudo por uma peca
 * nova, do tipo "wikilink".
 *
 * Para separar alvo e apelido, usa o MESMO splitTarget do servidor
 * (server/parser.js). Assim o indice e a tela nunca discordam sobre o
 * que e um link.
 */
md.inline.ruler.before('link', 'wikilink', (state, silent) => {
  const start = state.pos;
  if (state.src.charCodeAt(start) !== 0x5b || state.src.charCodeAt(start + 1) !== 0x5b) {
    return false;                                  // nao comeca com [[
  }

  const end = state.src.indexOf(']]', start + 2);
  if (end === -1) return false;                    // abriu e nao fechou

  const inner = state.src.slice(start + 2, end);
  if (!inner.trim() || /[\[\]\n]/.test(inner)) return false;   // mesmas regras do parser

  // "silent" = o markdown-it so quer saber SE aqui tem um link, sem criar nada
  if (!silent) {
    const { target, display } = splitTarget(inner);
    const token = state.push('wikilink', '', 0);
    token.meta = { target, display };
  }

  state.pos = end + 2;                             // continua depois do ]]
  return true;
});

// Como uma peca "wikilink" vira HTML.  (Partes 8 e 13)
// O nome do link e traduzido para o endereco da nota AQUI, na hora de
// desenhar, pela funcao "resolve" que chega no env (o App monta essa funcao
// com a lista de notas do menu). Assim o link ja nasce com o endereco certo,
// como qualquer link da internet: Cmd+clique, copiar endereco, tudo funciona.
md.renderer.rules.wikilink = (tokens, idx, options, env) => {
  const { target, display } = tokens[idx].meta;
  const esc = md.utils.escapeHtml;
  const id = env.resolve?.(target) ?? null;

  // Nota que ainda nao existe: nao parece clicavel, e o mouse em cima explica
  if (!id) {
    return `<span class="wikilink wikilink-broken" title="A nota “${esc(target)}” ainda não existe no vault">${esc(display)}</span>`;
  }
  return `<a class="wikilink" href="${esc(noteUrl(id))}">${esc(display)}</a>`;
};

// ---------------------------------------------------------------------------
// Callouts do Obsidian
// ---------------------------------------------------------------------------

// Um icone para cada tipo que aparece no seu vault
const CALLOUT_ICONS = {
  bug: '🐞', info: 'ℹ️', tip: '💡', note: '📝',
  question: '❓', warning: '⚠️', success: '✅', abstract: '📄',
};

/**
 * O markdown-it nao conhece callouts. Para ele, isto e so uma citacao:
 *
 *   > [!bug] Cuidado com o pipe
 *   > texto do aviso
 *
 * Antes de virar HTML, o markdown-it quebra a nota numa lista de pecas
 * (tokens): "abre citacao", "abre paragrafo", "texto", "fecha paragrafo"...
 * Esta regra roda nessa lista, procura citacoes cuja primeira linha e
 * [!tipo] e transforma cada uma num callout.
 */
md.core.ruler.push('callouts', (state) => {
  const tokens = state.tokens;

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'blockquote_open') continue;

    // Logo depois de "abre citacao" vem "abre paragrafo" e depois o texto
    const inline = tokens[i + 2];
    if (!inline || inline.type !== 'inline') continue;

    // O [+-]? aceita os callouts dobraveis ([!note]+). Todos os seus sao
    // "+", que no Obsidian ja comecam abertos - entao so mostramos abertos.
    const [firstLine, ...rest] = inline.content.split('\n');
    const match = /^\[!(\w+)\][+-]?\s*(.*)$/.exec(firstLine);
    if (!match) continue;   // citacao comum, nao e callout

    const type = match[1].toLowerCase();
    const title = match[2] || type[0].toUpperCase() + type.slice(1);

    // 1. a citacao ganha a classe do tipo (as cores ficam no CSS)
    tokens[i].attrJoin('class', `callout callout-${type}`);

    // 2. o texto perde a linha do marcador [!tipo]
    inline.content = rest.join('\n');
    inline.children = md.parseInline(inline.content, state.env)[0].children;

    // 3. um titulo entra no lugar dela
    const header = new state.Token('html_block', '', 0);
    header.content =
      `<div class="callout-title">${CALLOUT_ICONS[type] ?? '📌'} ` +
      `${md.renderInline(title, state.env)}</div>`;   // o env vai junto: sem ele, um [[link]] no titulo nao seria traduzido
    tokens.splice(i + 1, 0, header);
  }
});

// ---------------------------------------------------------------------------
// Ancoras nos titulos + lista do sumario  (Parte 10)
// ---------------------------------------------------------------------------

/** "9.2 O modelo relacional" -> "9-2-o-modelo-relacional" */
function slugify(text) {
  return text
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // tira os acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')                        // o que nao e letra nem numero vira -
    .replace(/^-+|-+$/g, '')                            // sem - sobrando nas pontas
    || 'secao';                                         // titulo feito so de simbolos
}

/** O texto do titulo como aparece na tela: sem ** e `, e [[alvo|apelido]] vira o apelido. */
export function headingText(raw) {
  return raw
    .replace(/\[\[([^\[\]\n]+?)\]\]/g, (_, inner) => splitTarget(inner).display)
    .replace(/\*\*|`/g, '')
    .trim();
}

/**
 * Cada titulo da nota ganha um id - a "ancora", o endereco para onde a tela
 * pode rolar - e entra na lista do sumario. A lista guarda tambem a LINHA do
 * arquivo de onde o titulo veio: e por ela que a busca e os backlinks, que
 * so conhecem numeros de linha, descobrem para qual titulo rolar.
 */
md.core.ruler.push('headings', (state) => {
  // O renderInline do titulo de um callout tambem passa por aqui; so interessa a nota inteira
  if (state.inlineMode) return;

  const used = new Map();     // slug -> quantas vezes ja apareceu nesta nota
  const headings = [];

  state.tokens.forEach((token, i) => {
    if (token.type !== 'heading_open') return;

    const text = headingText(state.tokens[i + 1].content);
    let slug = slugify(text);
    const seen = used.get(slug) ?? 0;
    used.set(slug, seen + 1);
    if (seen > 0) slug = `${slug}-${seen + 1}`;   // titulos repetidos: "exemplo", "exemplo-2"...

    token.attrSet('id', slug);
    headings.push({
      level: Number(token.tag.slice(1)),          // "h2" -> 2
      text,
      slug,
      line: token.map[0],                          // a linha do arquivo onde o titulo esta
    });
  });

  state.env.headings = headings;
});

// ---------------------------------------------------------------------------
// Caixinhas de tarefa  (Parte 19)
// ---------------------------------------------------------------------------

// "[ ] " ou "[x] " logo no comeco do item da lista
const TASK = /^\[([ xX])\]\s+/;

/**
 * Transforma "- [ ] estudar" numa caixinha de verdade.
 *
 * Esta regra roda DEPOIS da leitura do texto, entao cada item da lista ja
 * virou peca. Para cada item, ela olha o primeiro pedaco de texto: se ele
 * comeca com [ ] ou [x], tira esse pedaco e poe uma caixinha no lugar.
 *
 * O numero da linha (token.map, o mesmo da Parte 10) vai junto no HTML: e
 * por ele que o clique sabe qual linha do arquivo marcar.
 */
md.core.ruler.push('tasks', (state) => {
  if (state.inlineMode) return;

  state.tokens.forEach((token, i) => {
    if (token.type !== 'list_item_open') return;

    // Num item simples, as pecas vem assim: item, paragrafo, TEXTO, ...
    const inline = state.tokens[i + 2];
    if (!inline || inline.type !== 'inline') return;

    const first = inline.children[0];
    if (!first || first.type !== 'text') return;
    const match = TASK.exec(first.content);
    if (!match) return;

    const done = match[1] !== ' ';
    first.content = first.content.slice(match[0].length);   // tira o "[ ] " do texto

    // A caixinha e um pedaco de HTML que NOS criamos - nao veio da nota -,
    // por isso e seguro mesmo com o html: false da Parte 7.
    const box = new state.Token('html_inline', '', 0);
    box.content = `<input class="task-check" type="checkbox"${done ? ' checked' : ''}> `;
    inline.children.unshift(box);

    token.attrJoin('class', done ? 'task done' : 'task');
    if (token.map) token.attrSet('data-line', String(token.map[0]));
  });
});

/**
 * Recebe o texto markdown e devolve o HTML pronto para a tela e a lista de
 * titulos (para o sumario). O "env" e um objeto que o markdown-it carrega
 * pelas regras durante a conversao - e por ele que a regra acima devolve a lista.
 */
export function renderMarkdown(text, resolve = null) {
  const env = { resolve };   // Parte 13: a funcao que traduz o nome de um [[link]] no id da nota
  const html = md.render(text, env);
  return { html, headings: env.headings ?? [] };
}

/**
 * Em qual secao esta a linha N? No ultimo titulo que aparece antes dela.
 * Devolve o slug desse titulo (ou null, se a linha vem antes do primeiro).
 */
export function sectionAt(headings, line) {
  let found = null;
  for (const h of headings) {
    if (h.line > line) break;
    found = h;
  }
  return found?.slug ?? null;
}
