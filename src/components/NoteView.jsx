// Area principal: mostra a nota aberta, ja formatada.
// Parte 11: a rolagem ate a secao foi para o App, que e quem le o endereco.
// A NoteView so desenha; o articleRef vem do App e aponta para o <article>.
export default function NoteView({ note, rendered, articleRef, onOpenLink }) {
  if (!note) {
    return (
      <main className="note-view">
        <p className="empty">Escolha uma nota no menu ao lado.</p>
      </main>
    );
  }

  // Os links vieram prontos do markdown-it, entao o React nao colocou
  // onClick em nenhum deles. Em vez de um ouvinte por link, fica UM so no
  // <article>: todo clique la dentro "sobe" ate ele (isso se chama
  // delegacao de eventos), e aqui a gente ve se foi num wiki link.
  function handleClick(event) {
    const link = event.target.closest('a.wikilink');
    if (!link) return;                  // clicou em outra coisa: segue normal
    event.preventDefault();             // impede o href="#" de pular a pagina
    onOpenLink(link.dataset.target);    // data-target="..." vira dataset.target
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
