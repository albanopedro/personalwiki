import { useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router';
import SearchResults from './SearchResults.jsx';
import NewNoteForm from './NewNoteForm.jsx';
import { noteUrl } from '../utils/routes.js';

// Menu lateral: campo de busca + lista de notas agrupadas por pasta.
export default function Sidebar({ notes, selectedId, error, indexVersion }) {
  // O que esta escrito no campo de busca.  (Parte 9)
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);   // Parte 18

  // As pastas que ja existem no vault, para escolher onde a nota nasce
  const folders = useMemo(
    () => [...new Set(notes.map((n) => n.folder))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [notes],
  );
  const searching = query.trim().length >= 2;

  return (
    <aside className="sidebar">
      <h1>Personal Wiki</h1>

      {/* NavLink e um Link que sabe se aponta para o endereco atual: quando voce
          esta no /grafo, ele ganha sozinho a classe "active".  (Parte 16) */}
      <NavLink to="/grafo" className="nav-link">Grafo</NavLink>

      {/* Parte 18: criar nota. O formulario so aparece quando voce pede. */}
      {creating ? (
        <NewNoteForm
          folders={folders}
          defaultFolder={notes.find((n) => n.id === selectedId)?.folder ?? ''}
          onClose={() => setCreating(false)}
        />
      ) : (
        <button className="nav-link nav-button" onClick={() => setCreating(true)}>+ Nova nota</button>
      )}

      {/* Campo "controlado": o valor mora no estado query, e cada tecla
          atualiza o estado. E assim que a busca fica sabendo o que foi digitado. */}
      <input
        className="search-input"
        type="search"
        placeholder="Buscar nas notas..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error && <p className="error">{error}</p>}

      {searching
        ? <SearchResults query={query} selectedId={selectedId} indexVersion={indexVersion} />
        : <NoteTree notes={notes} selectedId={selectedId} />}
    </aside>
  );
}

// A lista de notas agrupada por pasta (a mesma da Parte 6).
function NoteTree({ notes, selectedId }) {
  // Agrupa assim: { "Apostila Engenharia de Software": [nota, nota, ...], "vida": [...] }
  const groups = {};
  for (const note of notes) {
    const folder = note.folder || 'Raiz';
    if (!groups[folder]) groups[folder] = [];
    groups[folder].push(note);
  }

  return Object.entries(groups).map(([folder, items]) => (
    <section key={folder}>
      <h3 className="folder">{folder}</h3>
      <ul>
        {items.map((note) => (
          <li key={note.id}>
            {/* Parte 12: um link de verdade (um <a href> na pagina). O clique
                normal troca a nota sem recarregar nada; Cmd+clique abre em outra aba. */}
            <Link
              to={noteUrl(note.id)}
              className={note.id === selectedId ? 'note-button active' : 'note-button'}
            >
              <span>{note.name}</span>
              {note.backlinkCount > 0 && (
                <span className="count" title={`${note.backlinkCount} notas apontam para esta`}>
                  {note.backlinkCount}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  ));
}
