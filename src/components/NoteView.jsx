import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import NoteEditor from './NoteEditor.jsx';
import { toggleTaskLine } from '../utils/tasks.js';

// Area principal: mostra a nota aberta, ja formatada.
// Parte 11: a rolagem ate a secao foi para o App, que e quem le o endereco.
// A NoteView so desenha; o articleRef vem do App e aponta para o <article>.
export default function NoteView({ note, rendered, articleRef, resolveLink }) {
  // Hooks antes de qualquer "return": o React exige a mesma ordem em todo desenho.
  const navigate = useNavigate();
  const location = useLocation();

  // Uma nota recem-criada chega com "?editar=1" no endereco: ja abre no
  // editor, para voce comecar a escrever.  (Parte 18)
  const [editing, setEditing] = useState(() => new URLSearchParams(location.search).has('editar'));
  const [taskError, setTaskError] = useState(null);   // Parte 19

  // ...e ai o "?editar=1" sai do endereco, que volta a ser so o da nota.
  // So depois que a nota chegou: antes disso a tela ainda vai ser trocada,
  // e o pedido de editar se perderia no caminho.
  useEffect(() => {
    if (note && editing && new URLSearchParams(location.search).has('editar')) {
      navigate(location.pathname, { replace: true });
    }
  }, [note, editing]);

  if (!note) {
    return (
      <main className="note-view">
        <p className="empty">Escolha uma nota no menu ao lado.</p>
      </main>
    );
  }

  if (!rendered) return <main className="note-view" />;   // a lista de notas ainda nao chegou (Parte 13)

  // No modo de edicao, o editor ocupa o lugar da nota.  (Parte 17)
  if (editing) {
    return <NoteEditor note={note} resolveLink={resolveLink} onClose={() => setEditing(false)} />;
  }

  // Os [[links]] vieram prontos do markdown-it: sao <a href> comuns, nao
  // <Link> do React Router. E um clique comum num <a href> recarregaria a
  // pagina inteira. Entao UM ouvinte so, no <article> (delegacao de eventos,
  // Parte 8), faz o mesmo que o <Link> faz por dentro (Parte 12): segura o
  // clique esquerdo sem teclas e troca a nota sem recarregar; o resto -
  // Cmd+clique, Shift+clique... - fica com o navegador.  (Parte 13)
  function handleClick(event) {
    // Caixinha de tarefa: marca, desmarca e grava no arquivo.  (Parte 19)
    const box = event.target.closest('.task-check');
    if (box) {
      alternarTarefa(box.closest('li.task'), box);
      return;
    }

    const link = event.target.closest('a.wikilink');
    if (!link) return;                                     // clicou em outra coisa
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (event.button !== 0 || modified) return;            // aba nova: e com o navegador
    event.preventDefault();                                // sem isso, a pagina recarregaria
    navigate(link.getAttribute('href'));
  }

  // Clicou numa caixinha: o navegador ja mudou o visual; agora a gente
  // guarda isso no arquivo, pelo mesmo caminho do editor (Parte 17).
  async function alternarTarefa(item, box) {
    setTaskError(null);

    // 1. O texto cru do arquivo e a data da ultima gravacao
    const lido = await fetch(`/api/raw?id=${encodeURIComponent(note.id)}`);
    if (!lido.ok) return desfazer(box, 'Não consegui ler a nota.');
    const { raw, mtime } = await lido.json();

    // 2. Troca [ ] por [x] na linha certa - ou desiste, se algo nao bater
    const novo = toggleTaskLine(raw, Number(item.dataset.line), item.textContent);
    if (!novo) return desfazer(box, 'A nota mudou no disco. Recarregue a página.');

    // 3. Grava, com a mesma protecao contra escrever por cima de outra edicao
    const gravou = await fetch('/api/note', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: note.id, raw: novo, mtime }),
    });
    if (!gravou.ok) {
      const { error } = await gravou.json().catch(() => ({}));
      desfazer(box, error ?? 'Não consegui salvar.');
    }
    // Deu certo: o aviso da Parte 15 chega logo em seguida e a nota se redesenha
  }

  function desfazer(box, mensagem) {
    box.checked = !box.checked;   // o navegador ja tinha marcado; volta atras
    setTaskError(mensagem);
  }

  return (
    // A key faz o React trocar o <main> inteiro quando a nota muda. Sem ela,
    // abrir uma nota nova mantinha a rolagem da anterior (voce estaria no
    // meio da nota nova sem entender por que).
    <main className="note-view" key={note.id}>
      <div className="folder-path">{note.folder || 'Raiz'}</div>
      <div className="note-head">
        <h2 className="note-title">{note.name}</h2>
        <button className="edit-button" onClick={() => setEditing(true)}>Editar</button>
      </div>

      {note.tags.length > 0 && (
        <div className="tags">
          {note.tags.map((tag) => <span key={tag} className="tag">#{tag}</span>)}
        </div>
      )}

      {taskError && <p className="task-erro">{taskError}</p>}

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
