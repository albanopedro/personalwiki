// Menu lateral: lista as notas agrupadas por pasta.
export default function Sidebar({ notes, selectedId, onSelect, error }) {
  // Agrupa assim: { "Apostila Engenharia de Software": [nota, nota, ...], "vida": [...] }
  const groups = {};
  for (const note of notes) {
    const folder = note.folder || 'Raiz';
    if (!groups[folder]) groups[folder] = [];
    groups[folder].push(note);
  }

  return (
    <aside className="sidebar">
      <h1>Personal Wiki</h1>

      {error && <p className="error">{error}</p>}

      {Object.entries(groups).map(([folder, items]) => (
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
      ))}
    </aside>
  );
}
