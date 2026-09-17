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
