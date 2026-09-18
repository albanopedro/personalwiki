import { useEffect, useRef } from 'react';
import { sectionAt } from '../utils/markdown.js';

// Area principal: mostra a nota aberta, ja formatada.
export default function NoteView({ note, rendered, jump, onOpenLink }) {
  // Os hooks (useRef, useEffect) ficam ANTES do "if (!note) return" la embaixo:
  // o React exige que eles rodem sempre, na mesma ordem, em todo desenho.
  const articleRef = useRef(null);   // aponta para o <article> de verdade na pagina

  // Rola ate o titulo pedido.  (Parte 10)
  // Roda DEPOIS que o React colocou o HTML na tela - antes disso, o titulo
  // ainda nao existe para ser encontrado.
  useEffect(() => {
    if (!jump || !rendered || !articleRef.current) return;

    // Pedido do sumario: ja vem o slug. Pedido da busca ou de um backlink:
    // vem uma linha, e o titulo e o ultimo que aparece antes dela.
    const slug = jump.slug ?? sectionAt(rendered.headings, jump.line);
    const target = slug && articleRef.current.querySelector(`#${CSS.escape(slug)}`);

    if (target) target.scrollIntoView({ block: 'start' });
    else articleRef.current.parentElement.scrollTop = 0;   // linha antes do 1o titulo: topo
  }, [jump, rendered]);

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
