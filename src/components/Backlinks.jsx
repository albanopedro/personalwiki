import { cleanContext } from '../utils/cleanContext.js';

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
