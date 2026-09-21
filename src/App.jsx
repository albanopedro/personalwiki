import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import Sidebar from './components/Sidebar.jsx';
import NoteView from './components/NoteView.jsx';
import Outline from './components/Outline.jsx';
import Backlinks from './components/Backlinks.jsx';
import GraphView from './components/GraphView.jsx';
import { renderMarkdown, sectionAt } from './utils/markdown.js';
import { toKey } from '../server/parser.js';

export default function App() {
  const [notes, setNotes] = useState([]);    // a lista do menu lateral
  const [note, setNote] = useState(null);    // a nota aberta (null = nenhuma)
  const [error, setError] = useState(null);  // mensagem de erro, se houver
  const [indexVersion, setIndexVersion] = useState(null);   // a versao do indice que o servidor anunciou (Parte 15)

  // Parte 11: o ENDERECO passou a dizer qual nota esta aberta e em que secao.
  //
  //   /nota/Apostila Engenharia de Software/05 — Arquitetura...#representacao-de-numeros...
  //         '------------------ params['*'] ------------------' '------ location.hash ------'
  const { '*': notePath } = useParams();
  const noteId = notePath ? `${notePath}.md`.normalize('NFC') : null;
  const location = useLocation();
  const navigate = useNavigate();
  const onGraph = location.pathname === '/grafo';   // Parte 16
  const articleRef = useRef(null);   // o <article> da nota, para achar os titulos na hora de rolar

  // A "lista telefonica" da Parte 4, agora tambem no navegador: nome da
  // nota -> id. Montada com a lista do menu, que ja estava aqui.  (Parte 13)
  const byName = useMemo(() => new Map(notes.map((n) => [toKey(n.name), n.id])), [notes]);

  // Converte a nota aberta em HTML + lista de titulos, ja traduzindo cada
  // [[link]] para o endereco da nota. So refaz quando a nota ou a lista mudam.
  // Espera a lista chegar: sem ela, todo link pareceria quebrado.  (Partes 10 e 13)
  // A traducao de um nome de [[link]] no id da nota. Fica separada porque o
  // editor tambem usa, para desenhar a previa do rascunho.  (Partes 13 e 17)
  const resolveLink = useMemo(() => (name) => byName.get(toKey(name)) ?? null, [byName]);

  const rendered = useMemo(() => {
    if (!note || byName.size === 0) return null;
    return renderMarkdown(note.body, resolveLink);
  }, [note, byName, resolveLink]);

  // Fica ouvindo o servidor: ele avisa quando voce edita uma nota no
  // Obsidian (Parte 15). O EventSource e o jeito do navegador de ouvir uma
  // rota de Server-Sent Events - e se a conexao cair (a API reiniciou, o
  // Mac dormiu), ele reconecta sozinho.
  useEffect(() => {
    const events = new EventSource('/api/events');
    events.onmessage = (message) => setIndexVersion(JSON.parse(message.data).builtAt);
    return () => events.close();   // a tela sumiu: para de ouvir
  }, []);

  // Pede a lista de notas para a API: quando a tela aparece e, desde a
  // Parte 15, de novo a cada versao nova do indice (uma nota foi criada,
  // apagada ou mudou de backlinks).
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
  }, [indexVersion]);

  // Busca a nota do endereco: quando o endereco aponta para outra nota e,
  // desde a Parte 15, quando o indice muda (voce pode ter editado ESTA nota,
  // ou outra nota pode ter passado a apontar para ela - backlinks).
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
  }, [noteId, indexVersion]);

  // Rola ate a secao que o endereco pede.  (Partes 10, 11 e 12)
  // O location.key muda a CADA navegacao, ate quando o endereco e o mesmo:
  // e isso que faz clicar de novo no mesmo titulo do sumario funcionar.
  const scrolledFor = useRef(null);   // a ultima navegacao (location.key) que ja rolou  (Parte 15)
  useEffect(() => {
    // a nota do endereco ainda nao chegou da API: espera o proximo desenho
    if (!rendered || note.id !== noteId || !articleRef.current) return;

    // A nota foi so ATUALIZADA (voce editou no Obsidian), mas voce nao
    // navegou: o location.key e o mesmo da ultima rolagem. Nao rola - voce
    // continua lendo exatamente onde estava.  (Parte 15)
    if (scrolledFor.current === location.key) return;
    scrolledFor.current = location.key;

    // A busca e os backlinks mandam uma LINHA, no "?linha=412" do endereco;
    // o sumario e o endereco recarregado mandam uma SECAO, no "#hash".
    const lineParam = new URLSearchParams(location.search).get('linha');
    const line = /^\d+$/.test(lineParam ?? '') ? Number(lineParam) : null;
    const slug = line !== null ? sectionAt(rendered.headings, line) : location.hash.slice(1) || null;

    const target = slug && articleRef.current.querySelector(`#${CSS.escape(slug)}`);
    if (target) target.scrollIntoView({ block: 'start' });
    else articleRef.current.parentElement.scrollTop = 0;   // sem secao: topo da nota

    // Veio por linha? Troca o "?linha=412" pela secao ("#..."), substituindo o
    // passo atual do historico: o endereco fica limpo, e voltar, avancar e
    // recarregar a pagina caem no mesmo lugar.
    if (line !== null) {
      navigate(slug ? `${location.pathname}#${slug}` : location.pathname, { replace: true });
    }
  }, [rendered, location.key]);

  return (
    <div className="app">
      {/* Parte 12: menu, busca, sumario e backlinks agora sao <Link>. Nenhum
          deles precisa mais receber uma funcao para abrir nota: cada link ja
          sabe o seu endereco. */}
      <Sidebar notes={notes} selectedId={note?.id} error={error} />
      {/* No /grafo, o grafo ocupa o lugar da nota E do painel da direita (Parte 16) */}
      {onGraph ? (
        <GraphView indexVersion={indexVersion} />
      ) : (
        <>
          {/* A key faz o React trocar a NoteView inteira quando a nota muda: sem
              ela, o editor aberto numa nota continuaria aberto na proxima.
              Uma atualizacao da MESMA nota (Parte 15) nao troca a key, entao
              o que voce esta escrevendo nao se perde.  (Parte 17) */}
          <NoteView
            key={note?.id}
            note={note}
            rendered={rendered}
            articleRef={articleRef}
            resolveLink={resolveLink}
          />
          <aside className="panel">
            <Outline headings={rendered?.headings ?? []} />
            <Backlinks note={note} />
          </aside>
        </>
      )}
    </div>
  );
}
