import { useState } from 'react';
import SearchResults from './SearchResults.jsx';

// Menu lateral: campo de busca + lista de notas agrupadas por pasta.
export default function Sidebar({ notes, selectedId, onSelect, error }) {
  // O que esta escrito no campo de busca.  (Parte 9)
  const [query, setQuery] = useState('');
  const searching = query.trim().length >= 2;

  return (
    <aside className="sidebar">
      <h1>Personal Wiki</h1>

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
        ? <SearchResults query={query} selectedId={selectedId} onSelect={onSelect} />
        : <NoteTree notes={notes} selectedId={selectedId} onSelect={onSelect} />}
    </aside>
  );
}

// A lista de notas agrupada por pasta (a mesma da Parte 6).
function NoteTree({ notes, selectedId, onSelect }) {
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
            <button
              className={note.id === selectedId ? 'note-button active' : 'note-button'}
              onClick={() => onSelect(note.id)}
            >
              <span>{note.name}</span>
              {note.backlinkCount > 0 && (
                <span className="count" title={`${note.backlinkCount} notas apontam para esta`}>
                  {note.backlinkCount}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  ));
}
