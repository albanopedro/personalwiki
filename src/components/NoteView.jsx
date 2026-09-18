import { useNavigate } from 'react-router';

// Area principal: mostra a nota aberta, ja formatada.
// Parte 11: a rolagem ate a secao foi para o App, que e quem le o endereco.
// A NoteView so desenha; o articleRef vem do App e aponta para o <article>.
export default function NoteView({ note, rendered, articleRef }) {
  // Hook antes de qualquer "return": o React exige a mesma ordem em todo desenho.
  const navigate = useNavigate();

  if (!note) {
    return (
      <main className="note-view">
        <p className="empty">Escolha uma nota no menu ao lado.</p>
      </main>
    );
  }

  if (!rendered) return <main className="note-view" />;   // a lista de notas ainda nao chegou (Parte 13)

  // Os [[links]] vieram prontos do markdown-it: sao <a href> comuns, nao
  // <Link> do React Router. E um clique comum num <a href> recarregaria a
  // pagina inteira. Entao UM ouvinte so, no <article> (delegacao de eventos,
  // Parte 8), faz o mesmo que o <Link> faz por dentro (Parte 12): segura o
  // clique esquerdo sem teclas e troca a nota sem recarregar; o resto -
  // Cmd+clique, Shift+clique... - fica com o navegador.  (Parte 13)
  function handleClick(event) {
    const link = event.target.closest('a.wikilink');
    if (!link) return;                                     // clicou em outra coisa
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (event.button !== 0 || modified) return;            // aba nova: e com o navegador
    event.preventDefault();                                // sem isso, a pagina recarregaria
    navigate(link.getAttribute('href'));
  }

  return (
    // A key faz o React trocar o <main> inteiro quando a nota muda. Sem ela,
    // abrir uma nota nova mantinha a rolagem da anterior (voce estaria no
    // meio da nota nova sem entender por que).
    <main className="note-view" key={note.id}>
      <div className="folder-path">{note.folder || 'Raiz'}</div>
      <h2 className="note-title">{note.name}</h2>

      {note.tags.length > 0 && (
        <div className="tags">
          {note.tags.map((tag) => <span key={tag} className="tag">#{tag}</span>)}
        </div>
      )}

      {/* "dangerously" e um aviso do proprio React: voce esta colocando HTML
          pronto na tela, e se esse HTML tivesse codigo malicioso, ele rodaria.
          Aqui e seguro porque o markdown-it esta com html: false. */}
      <article
        ref={articleRef}
        className="markdown"
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: rendered.html }}
      />
    </main>
  );
}
