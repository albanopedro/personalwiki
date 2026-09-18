import { splitTarget } from '../../server/parser.js';

// Painel lateral: quem aponta para a nota aberta.  (Parte 8)
// Os dados ja vinham prontos da API desde a Parte 5: o indice da Parte 4
// inverteu as setas, e aqui a gente so mostra.
export default function Backlinks({ note, onSelect }) {
  if (!note) return <aside className="backlinks" />;

  return (
    <aside className="backlinks">
      <h3 className="backlinks-title">
        Backlinks <span className="count">{note.backlinks.length}</span>
      </h3>

      {note.backlinks.length === 0 && (
        <p className="backlinks-empty">Nenhuma nota aponta para esta.</p>
      )}

      <ul>
        {note.backlinks.map((b, i) => (
          <li key={`${b.from}:${b.line}:${i}`}>
            <button className="backlink" onClick={() => onSelect(b.from)}>
              <span className="backlink-name">{b.fromName}</span>
              <span className="backlink-context">{cleanContext(b.context)}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/**
 * A linha de contexto vem crua do arquivo, por exemplo:
 *   > [!note]+ Versionamento → [[10 — Controle de Versão com Git|Módulo 10]]
 * Aqui ela vira algo legivel:
 *   Versionamento → Módulo 10
 */
function cleanContext(line) {
  return line
    .replace(/^(>\s*)+/, '')                    // os > de citacao
    .replace(/^\[!\w+\][+-]?\s*/, '')           // o [!note]+ de callout
    .replace(/^([-*]|\d+\.)\s+/, '')            // marcador de lista
    .replace(/^…[^\[\]]*\]\]/, '…')              // outro link cortado no comeco do trecho
    .replace(/\[\[[^\]]*…$/, '…')                // outro link cortado no fim do trecho
    .replace(/\[\[([^\[\]\n]+?)\]\]/g, (_, inner) => splitTarget(inner).display)
    .replace(/^\|\s*|\s*\|$/g, '')              // linha de tabela: tira o | do comeco e do fim...
    .replace(/\s*\|\s*/g, ' · ')                // ...e troca os do meio por um ponto
    .replace(/\*\*|`/g, '');                    // negrito e crases
}
