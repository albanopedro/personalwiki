import { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import NoteView from './components/NoteView.jsx';
import Outline from './components/Outline.jsx';
import Backlinks from './components/Backlinks.jsx';
import { renderMarkdown } from './utils/markdown.js';

export default function App() {
  const [notes, setNotes] = useState([]);    // a lista do menu lateral
  const [note, setNote] = useState(null);    // a nota aberta (null = nenhuma)
  const [error, setError] = useState(null);  // mensagem de erro, se houver
  const [jump, setJump] = useState(null);    // para onde rolar: { line } ou { slug }  (Parte 10)

  // Converte a nota aberta em HTML + lista de titulos. O useMemo guarda o
  // resultado e so refaz a conversao quando a NOTA muda: converter a nota de
  // 268 KB toda vez que o App redesenha por outro motivo seria desperdicio.
  const rendered = useMemo(() => (note ? renderMarkdown(note.body) : null), [note]);

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

  // Abre uma nota. Quem conhece uma linha de interesse - a busca e os
  // backlinks - manda a linha junto, e a nota abre ja rolada ate a secao
  // dela. O menu lateral e os [[links]] nao mandam: a nota abre no topo.
  async function openNote(id, line = null) {
    // encodeURIComponent protege espacos, acentos e barras do id
    const res = await fetch(`/api/note?id=${encodeURIComponent(id)}`);
    if (!res.ok) {
      setError('Não consegui abrir essa nota.');
      return;
    }
    setError(null);
    setNote(await res.json());
    setJump(line === null ? null : { line });
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
      <NoteView note={note} rendered={rendered} jump={jump} onOpenLink={openLink} />
      <aside className="panel">
        <Outline headings={rendered?.headings ?? []} onJump={(slug) => setJump({ slug })} />
        <Backlinks note={note} onSelect={openNote} />
      </aside>
    </div>
  );
}
