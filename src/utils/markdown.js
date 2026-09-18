// PARTE 7: transforma o texto markdown da nota em HTML formatado.

import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: false,     // HTML escrito dentro da nota aparece como TEXTO, nunca e executado
  linkify: true,   // um https://... solto no texto vira link clicavel
  breaks: true,    // uma quebra de linha vira quebra de linha, igual ao seu Obsidian
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
      `${md.renderInline(title)}</div>`;
    tokens.splice(i + 1, 0, header);
  }
});

/** Recebe o texto markdown e devolve o HTML pronto para a tela. */
export function renderMarkdown(text) {
  return md.render(text);
}
