import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import NoteView from './components/NoteView.jsx';
import Backlinks from './components/Backlinks.jsx';

export default function App() {
  const [notes, setNotes] = useState([]);    // a lista do menu lateral
  const [note, setNote] = useState(null);    // a nota aberta (null = nenhuma)
  const [error, setError] = useState(null);  // mensagem de erro, se houver

  // Roda UMA vez, quando a tela aparece: pede a lista de notas para a API.
  useEffect(() => {
    // O useEffect nao aceita funcao async direto, entao criamos uma
    // aqui dentro e chamamos logo em seguida.
    async function loadNotes() {
      const res = await fetch('/api/notes');
      if (!res.ok) {
        setError('A API não respondeu. Ela está rodando? (npm run api)');
        return;
      }
      setNotes(await res.json());
    }
    loadNotes();
  }, []);   // [] vazio = "so na primeira vez"

  // Roda quando o usuario clica numa nota do menu.
  async function openNote(id) {
    // encodeURIComponent protege espacos, acentos e barras do id
    const res = await fetch(`/api/note?id=${encodeURIComponent(id)}`);
    if (!res.ok) {
      setError('Não consegui abrir essa nota.');
      return;
    }
    setError(null);
    setNote(await res.json());
  }

  // Roda quando o usuario clica num [[link]] dentro da nota.  (Parte 8)
  // O link so tem o NOME da nota; a API descobre qual e o arquivo.
  async function openLink(name) {
    const res = await fetch(`/api/resolve?name=${encodeURIComponent(name)}`);
    if (!res.ok) {
      setError(`A nota "${name}" ainda não existe no vault.`);
      return;
    }
    const { id } = await res.json();
    openNote(id);
  }

  return (
    <div className="app">
      <Sidebar notes={notes} selectedId={note?.id} onSelect={openNote} error={error} />
      <NoteView note={note} onOpenLink={openLink} />
      <Backlinks note={note} onSelect={openNote} />
    </div>
  );
}
