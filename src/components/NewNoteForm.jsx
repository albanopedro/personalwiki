import { useState } from 'react';
import { useNavigate } from 'react-router';
import { noteUrl } from '../utils/routes.js';
import { apiSend } from '../utils/api.js';

// Formulario de nota nova, no menu lateral.  (Parte 18)
export default function NewNoteForm({ folders, defaultFolder, onClose }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [folder, setFolder] = useState(defaultFolder ?? '');
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  async function criar(event) {
    // Sem isto, o navegador recarregaria a pagina inteira ao enviar o
    // formulario - que e o que ele faz com formulario desde sempre.
    event.preventDefault();
    if (creating) return;

    setCreating(true);
    setError(null);
    try {
      const { id } = await apiSend('/api/note', 'POST', { name, folder });
      onClose();
      // O "?editar=1" abre a nota ja no editor, para voce comecar a escrever
      navigate(`${noteUrl(id)}?editar=1`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <form
      className="new-note"
      onSubmit={criar}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <input
        className="new-note-name"
        autoFocus
        placeholder="Nome da nota"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <select className="new-note-folder" value={folder} onChange={(e) => setFolder(e.target.value)}>
        {folders.map((f) => (
          <option key={f} value={f}>{f || 'Raiz'}</option>
        ))}
      </select>

      {error && <p className="new-note-erro">{error}</p>}

      <div className="new-note-actions">
        <button type="submit" className="primary" disabled={!name.trim() || creating}>
          {creating ? 'Criando…' : 'Criar'}
        </button>
        <button type="button" onClick={onClose}>Cancelar</button>
      </div>
    </form>
  );
}
