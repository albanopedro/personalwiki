// Sumario: a lista de titulos da nota aberta.  (Parte 10)
// Clicar num titulo nao rola nada aqui: so avisa o App ("pula para este
// titulo"), e quem rola e a NoteView - o mesmo caminho da busca e dos backlinks.
export default function Outline({ headings, onJump }) {
  if (headings.length === 0) return null;

  return (
    <section className="outline">
      <h3 className="panel-title">
        Sumário <span className="count">{headings.length}</span>
      </h3>
      <ul>
        {headings.map((h) => (
          <li key={h.slug}>
            <button
              className="outline-item"
              style={{ paddingLeft: 8 + (h.level - 1) * 12 }}   // recuo de acordo com o nivel
              onClick={() => onJump(h.slug)}
            >
              {h.text}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
