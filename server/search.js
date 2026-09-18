// PARTE 9: a busca.
//
// Procura um texto em todas as notas do indice (que ja esta na memoria desde
// a Parte 4) e diz, para cada resultado, em que SECAO da nota ele esta. Isso
// importa porque suas notas sao longas: saber so a nota nao ajuda muito.

/**
 * Deixa um texto "comparavel": sem acento, minusculo, e com qualquer tipo
 * de espaco virando espaco comum.
 *
 *   "Lógica"             -> "logica"        (quem digita "logica" acha)
 *   "const&nbsp;estilo"  -> "const estilo"  (o espaco especial das Notas da Apple)
 */
export function normalize(text) {
  return text
    .normalize('NFD')                  // separa cada letra do seu acento: "ó" vira "o" + "´"
    .replace(/[̀-ͯ]/g, '')   // e joga fora os acentos soltos
    .replace(/\s+/g, ' ')              // o \s tambem pega o &nbsp;
    .toLowerCase();
}

/**
 * Transforma o que a pessoa digitou numa lista de termos.
 *   crise software        -> ["crise", "software"]   cada palavra, em qualquer ordem
 *   "crise do software"   -> ["crise do software"]   entre aspas: a frase exata
 */
function parseQuery(query) {
  const text = normalize(query).trim();
  const phrase = /^["“](.+)["”]$/.exec(text);
  if (phrase) return [phrase[1].trim()];
  return text.split(' ').filter(Boolean);
}

/** Escapa os caracteres que tem significado especial em regex: ( ) . * + ? etc. */
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Cada termo vira um "procurador" que so aceita o termo no COMECO de uma
 * palavra. Sem isso, "moc" (de MOC) casava com "pro-moc-ao", "re-moc-oes"
 * e "co-moc-ao": 7 dos 8 resultados eram falsos. E "logic" continua
 * achando "logica", porque esta no comeco da palavra.
 */
function wordStart(term) {
  const boundary = /^[a-z0-9]/.test(term) ? '(?:^|[^a-z0-9])' : '';
  return { term, re: new RegExp(boundary + escapeRegExp(term)) };
}

/**
 * O trecho da linha em volta do que foi encontrado. E o mesmo problema dos
 * backlinks da Parte 8: numa linha de 400 caracteres, o comeco dela pode
 * nao ter nada a ver com a busca.
 */
function snippet(line, matcher) {
  const m = matcher.re.exec(normalize(line));
  const pos = m ? m.index + m[0].length - matcher.term.length : 0;   // posicao aproximada
  const from = Math.max(0, pos - 60);
  const to = Math.min(line.length, pos + matcher.term.length + 80);
  return (from > 0 ? '…' : '') + line.slice(from, to).trim() + (to < line.length ? '…' : '');
}

const FENCE = /^\s{0,3}(```|~~~)/;   // abre ou fecha bloco de codigo (ate 3 espacos, regra do Markdown)
// # Titulo, ## Titulo... O \s* aceita titulo recuado (dentro de uma lista), como o
// markdown-it aceita. Sem ele, servidor e tela discordavam em 27 linhas.  (Parte 10)
const HEADING = /^\s*#{1,6}\s+(.+)$/;

export function search(index, query) {
  const terms = parseQuery(query);
  if (terms.join('').length < 2) {
    return { query, terms, total: 0, results: [] };   // uma letra so casaria com quase tudo
  }

  // O texto tem TODOS os termos? (em qualquer ordem, cada um no comeco de uma palavra)
  const matchers = terms.map(wordStart);
  const hasAll = (text) => {
    const n = normalize(text);
    return matchers.every((m) => m.re.test(n));
  };

  const results = [];

  for (const note of index.notes.values()) {
    let score = 0;
    if (hasAll(note.name)) score += 100;            // esta no nome do arquivo
    if (note.aliases.some(hasAll)) score += 50;     // num apelido: "MOC" acha o Índice
    if (note.tags.some(hasAll)) score += 20;        // numa tag

    const hits = [];
    let lineHits = 0;
    let section = null;     // o ultimo titulo visto, lendo a nota de cima para baixo
    let inCode = false;

    note.body.split('\n').forEach((line, i) => {
      if (FENCE.test(line)) {
        inCode = !inCode;
        return;                                     // a linha ``` em si nao e resultado
      }

      // Dentro de codigo, "# comentario" do Python NAO e titulo de secao
      const heading = inCode ? null : HEADING.exec(line);
      if (heading) section = heading[1].trim();

      if (!line.trim() || !hasAll(line)) return;

      lineHits++;
      score += heading ? 10 : 1;                    // achar num titulo vale mais que no texto
      if (hits.length < 3) {
        hits.push({ line: i, section, isHeading: Boolean(heading), text: snippet(line.trim(), matchers[0]) });
      }
    });

    if (score > 0) {
      results.push({ id: note.id, name: note.name, folder: note.folder, score, lineHits, hits });
    }
  }

  results.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'pt-BR'));
  return { query, terms, total: results.length, results: results.slice(0, 30) };
}
