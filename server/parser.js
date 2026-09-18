/**
 * Separa o frontmatter (o cabecalho entre --- no topo da nota) do texto.
 *
 * Entra isto:
 *   ---
 *   tags: [engenharia-de-software, moc]
 *   aliases: ["Índice", "MOC"]
 *   ---
 *   # Apostila
 *   texto...
 *
 * Sai isto:
 *   { data: { tags: [...], aliases: [...] }, body: "# Apostila\ntexto..." }
 */
export function parseFrontmatter(raw) {
  // Nota sem cabecalho: devolve o texto inteiro como corpo.
  if (!raw.startsWith('---')) {
    return { data: {}, body: raw };
  }

  const lines = raw.split('\n');

  // Procura o --- que FECHA o cabecalho (comeca no 1 para pular o de abertura).
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      end = i;
      break;
    }
  }

  // Abriu e nunca fechou: trata como se nao houvesse cabecalho.
  if (end === -1) {
    return { data: {}, body: raw };
  }

  const data = {};

  for (let i = 1; i < end; i++) {
    const line = lines[i];
    const colon = line.indexOf(':');
    if (colon === -1) continue;              // linha sem "chave:", ignora

    const keyk = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();

    if (value.startsWith('[') && value.endsWith(']')) {
      // Lista: [a, b, c] vira um array de verdade
      data[keyk] = value.slice(1, -1).split(',').map(clean).filter(Boolean);
    } else {
      data[keyk] = clean(value);
    }
  }

  return {
    data,
    body: lines.slice(end + 1).join('\n'),   // tudo depois do cabecalho
  };
}

/** Tira espacos e as aspas que o YAML as vezes coloca em volta do valor. */
function clean(text) {
  return text.trim().replace(/^["']|["']$/g, '');
}

// ---------------------------------------------------------------------------
// PARTE 3: wiki links
// ---------------------------------------------------------------------------

/**
 * Encontra todo [[assim]] dentro do texto.
 *
 *   \[\[            duas colchetes literais (a barra invertida tira o
 *                   significado especial que [ tem em expressoes regulares)
 *   ([^\[\]\n]+?)   captura o miolo: qualquer coisa que NAO seja [ ] ou
 *                   quebra de linha. O +? pega o menos possivel, para que
 *                   [[a]] [[b]] vire dois links e nao um so.
 *   \]\]            as duas colchetes que fecham
 *   g               procura todas as ocorrencias, nao so a primeira
 */
const WIKILINK_RE = /\[\[([^\[\]\n]+?)\]\]/g;

/**
 * Separa o miolo de um link em alvo e apelido.
 *
 *   [[00 — Índice]]                  -> alvo "00 — Índice",  apelido nenhum
 *   [[00 — Índice|Voltar]]           -> alvo "00 — Índice",  apelido "Voltar"
 *   [[10 — Git\|10.7]]               -> alvo "10 — Git",     apelido "10.7"
 *
 * O terceiro caso e o pega-ratao: dentro de uma tabela Markdown a barra
 * vertical separa colunas, entao ela precisa vir escapada como \| - e o
 * parser tem que aceitar as duas formas.
 */
export function splitTarget(inner) {
  const parts = inner.split(/\\\||\|/);
  const target = parts[0].trim();
  const alias = parts.length > 1 ? parts.slice(1).join('|').trim() : null;

  return {
    target,
    alias,
    display: alias || target,   // o texto que o usuario enxerga
  };
}

/** Lista todos os wiki links do corpo da nota, com a linha onde aparecem. */
export function extractWikiLinks(body) {
  const links = [];

  body.split('\n').forEach((line, i) => {
    // Trecho entre crases e codigo, nao link: em `[[exemplo]]` o autor so
    // esta mostrando a sintaxe. Apaga esses trechos antes de procurar.
    const withoutCode = line.replace(/`[^`]*`/g, '');

    for (const match of withoutCode.matchAll(WIKILINK_RE)) {
      const { target, alias, display } = splitTarget(match[1]);
      if (!target) continue;

      links.push({
        target,                              // para onde aponta
        alias,                               // apelido, se tiver
        display,                             // o que aparece na tela
        line: i,                             // em que linha estava
        context: line.trim().slice(0, 160),  // o trecho ao redor (usado depois
                                             // para montar os backlinks)
      });
    }
  });

  return links;
}
