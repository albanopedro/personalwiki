import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import Sidebar from './components/Sidebar.jsx';
import NoteView from './components/NoteView.jsx';
import Outline from './components/Outline.jsx';
import Backlinks from './components/Backlinks.jsx';
import { renderMarkdown, sectionAt } from './utils/markdown.js';
import { noteUrl } from './utils/routes.js';

export default function App() {
  const [notes, setNotes] = useState([]);    // a lista do menu lateral
  const [note, setNote] = useState(null);    // a nota aberta (null = nenhuma)
  const [error, setError] = useState(null);  // mensagem de erro, se houver

  // Parte 11: o ENDERECO passou a dizer qual nota esta aberta e em que secao.
  //
  //   /nota/Apostila Engenharia de Software/05 — Arquitetura...#representacao-de-numeros...
  //         '------------------ params['*'] ------------------' '------ location.hash ------'
  const { '*': notePath } = useParams();
  const noteId = notePath ? `${notePath}.md`.normalize('NFC') : null;
  const location = useLocation();
  const navigate = useNavigate();
  const articleRef = useRef(null);   // o <article> da nota, para achar os titulos na hora de rolar

  // Converte a nota aberta em HTML + lista de titulos. O useMemo guarda o
  // resultado e so refaz a conversao quando a NOTA muda.  (Parte 10)
  const rendered = useMemo(() => (note ? renderMarkdown(note.body) : null), [note]);

  // Roda UMA vez, quando a tela aparece: pede a lista de notas para a API.
  useEffect(() => {
    async function loadNotes() {
      const res = await fetch('/api/notes');
      if (!res.ok) {
        setError('A API não respondeu. Ela está rodando? (npm run api)');
        return;
      }
      setNotes(await res.json());
    }
    loadNotes();
  }, []);

  // Sempre que o endereco aponta para outra nota, busca essa nota.
  useEffect(() => {
    if (!noteId) {
      setNote(null);
      return;
    }
    let cancelled = false;
    async function loadNote() {
      // encodeURIComponent protege espacos, acentos e barras do id
      const res = await fetch(`/api/note?id=${encodeURIComponent(noteId)}`);
      if (cancelled) return;          // o endereco ja mudou de novo: resposta velha
      if (!res.ok) {
        setError(`Nota não encontrada: ${noteId}`);
        setNote(null);
        return;
      }
      setError(null);
      setNote(await res.json());
    }
    loadNote();
    return () => { cancelled = true; };
  }, [noteId]);

  // Rola ate a secao que o endereco pede.  (Partes 10 e 11)
  // O location.key muda a CADA navegacao, ate quando o endereco e o mesmo:
  // e isso que faz clicar de novo no mesmo titulo do sumario funcionar.
  useEffect(() => {
    // a nota do endereco ainda nao chegou da API: espera o proximo desenho
    if (!rendered || note.id !== noteId || !articleRef.current) return;

    // A busca e os backlinks mandam uma LINHA (no location.state); o sumario
    // e o endereco recarregado mandam uma SECAO (no #hash).
    const line = location.state?.line;
    const slug = line != null ? sectionAt(rendered.headings, line) : location.hash.slice(1) || null;

    const target = slug && articleRef.current.querySelector(`#${CSS.escape(slug)}`);
    if (target) target.scrollIntoView({ block: 'start' });
    else articleRef.current.parentElement.scrollTop = 0;   // sem secao: topo da nota

    // Veio por linha? Escreve a secao no endereco (substituindo o passo atual
    // do historico, sem criar outro), para que voltar, avancar e recarregar a
    // pagina caiam no mesmo lugar.
    if (line != null && slug) navigate(`${location.pathname}#${slug}`, { replace: true });
  }, [rendered, location.key]);

  // Abrir uma nota agora e so MUDAR O ENDERECO. Buscar a nota e rolar ate a
  // secao acontecem sozinhos, nos efeitos acima, porque o endereco mudou - e
  // cada mudanca de endereco vira um passo no historico do navegador.
  function openNote(id, line = null) {
    navigate(noteUrl(id), { state: line === null ? null : { line } });
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
      <NoteView note={note} rendered={rendered} articleRef={articleRef} onOpenLink={openLink} />
      <aside className="panel">
        {/* "#slug" sozinho e relativo: continua na mesma nota, so muda a secao.
            Clicar de novo na secao em que voce ja esta substitui o passo do
            historico em vez de criar outro igual. */}
        <Outline
          headings={rendered?.headings ?? []}
          onJump={(slug) => navigate(`#${slug}`, { replace: location.hash === `#${slug}` })}
        />
        <Backlinks note={note} onSelect={openNote} />
      </aside>
    </div>
  );
}
