import { Link } from 'react-router';
import { cleanContext } from '../utils/cleanContext.js';
import { noteUrl } from '../utils/routes.js';

// Quem aponta para a nota aberta.  (Parte 8)
// Os dados ja vinham prontos da API desde a Parte 5: o indice da Parte 4
// inverteu as setas, e aqui a gente so mostra.
export default function Backlinks({ note }) {
  if (!note) return null;

  return (
    <section className="backlinks">
      <h3 className="panel-title">
        Backlinks <span className="count">{note.backlinks.length}</span>
      </h3>

      {note.backlinks.length === 0 && (
        <p className="backlinks-empty">Nenhuma nota aponta para esta.</p>
      )}

      <ul>
        {note.backlinks.map((b, i) => (
          <li key={`${b.from}:${b.line}:${i}`}>
            {/* A linha vai junto: a nota de origem abre ja na secao do link  (Partes 10 e 12) */}
            <Link className="backlink" to={noteUrl(b.from, b.line)}>
              <span className="backlink-name">{b.fromName}</span>
              <span className="backlink-context">{cleanContext(b.context)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
