import { useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router';
import { parseFrontmatter } from '../../server/parser.js';
import { renderMarkdown } from '../utils/markdown.js';

// O editor de notas.  (Parte 17)
//
// Edita o arquivo INTEIRO, do jeito que ele esta no disco - inclusive o
// frontmatter. E a unica parte do wiki que escreve no seu vault.
export default function NoteEditor({ note, resolveLink, onClose }) {
  const [draft, setDraft] = useState(null);    // o texto no editor (null = ainda carregando)
  const [saved, setSaved] = useState(null);    // o texto como esta gravado no disco
  const [mtime, setMtime] = useState(null);    // quando o arquivo foi gravado pela ultima vez
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);   // { tipo: 'erro' | 'ok', texto }
  const textRef = useRef(null);

  const dirty = draft !== null && draft !== saved;

  // 1. Ao abrir, busca o texto cru do arquivo (e o mtime que vai junto)
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/raw?id=${encodeURIComponent(note.id)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('não consegui abrir o arquivo'))))
      .then((data) => {
        if (cancelled) return;
        setDraft(data.raw);
        setSaved(data.raw);
        setMtime(data.mtime);
      })
      .catch((err) => { if (!cancelled) setMessage({ tipo: 'erro', texto: err.message }); });
    return () => { cancelled = true; };
  }, [note.id]);

  // 2. Com alteracao nao salva, segura a navegacao dentro do wiki. O React
  //    Router nao pergunta nada sozinho: ele PARA a navegacao e deixa a
  //    gente mostrar o aviso (a barra la embaixo) e decidir.
  const blocker = useBlocker(dirty);

  // 3. ...e avisa tambem se voce for fechar a aba ou recarregar a pagina.
  //    Esse aviso e do navegador, nao nosso: so da para pedir, nao desenhar.
  useEffect(() => {
    if (!dirty) return;
    const avisar = (e) => e.preventDefault();
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [dirty]);

  async function salvar() {
    if (!dirty || saving) return;
    setSaving(true);
    setMessage(null);

    const res = await fetch('/api/note', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: note.id, raw: draft, mtime }),
    });
    setSaving(false);

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setMessage({ tipo: 'erro', texto: error ?? 'Não consegui salvar.' });
      return;
    }

    // Guarda o mtime NOVO: sem isso, o segundo salvo seguido seria recusado
    // como se outra pessoa tivesse mexido no arquivo.
    const { mtime: agora } = await res.json();
    setMtime(agora);
    setSaved(draft);
    setMessage({ tipo: 'ok', texto: 'Salvo no vault.' });
  }

  // Cmd+S (ou Ctrl+S) salva, como em qualquer editor
  function onKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      salvar();
    }
  }

  // A previa mostra o rascunho JA formatado. O parseFrontmatter (o mesmo da
  // Parte 3) tira o bloco de tags do comeco, que nao vira texto na tela.
  const previewHtml = useMemo(() => {
    if (!preview || draft === null) return '';
    return renderMarkdown(parseFrontmatter(draft).body, resolveLink).html;
  }, [preview, draft, resolveLink]);

  return (
    <main className="note-view editor" onKeyDown={onKeyDown}>
      <div className="editor-bar">
        <span className="editor-file" title="o arquivo que vai ser gravado">{note.id}</span>
        <div className="editor-actions">
          {dirty && <span className="editor-dirty">alterações não salvas</span>}
          <button onClick={() => setPreview(!preview)}>{preview ? 'Voltar ao texto' : 'Prévia'}</button>
          <button className="primary" onClick={salvar} disabled={!dirty || saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          <button onClick={onClose}>Fechar</button>
        </div>
      </div>

      {message && <p className={message.tipo === 'erro' ? 'editor-erro' : 'editor-ok'}>{message.texto}</p>}

      {draft === null ? (
        <p className="empty">Abrindo o arquivo…</p>
      ) : preview ? (
        <article className="markdown" dangerouslySetInnerHTML={{ __html: previewHtml }} />
      ) : (
        <textarea
          ref={textRef}
          className="editor-text"
          value={draft}
          spellCheck="false"
          onChange={(e) => setDraft(e.target.value)}
        />
      )}

      {/* A navegacao foi segurada: voce decide o que fazer com o que escreveu */}
      {blocker.state === 'blocked' && (
        <div className="editor-blocked">
          <span>Você tem alterações não salvas.</span>
          <button className="primary" onClick={() => { salvar().then(() => blocker.proceed()); }}>
            Salvar e sair
          </button>
          <button onClick={() => blocker.proceed()}>Sair sem salvar</button>
          <button onClick={() => blocker.reset()}>Continuar editando</button>
        </div>
      )}
    </main>
  );
}
