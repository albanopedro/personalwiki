import { Link } from 'react-router';

// Sumario: a lista de titulos da nota aberta.  (Parte 10)
// Cada titulo e um link para "#secao" - so a parte do fim do endereco muda,
// a nota continua a mesma. Quem rola ate la e o App, que le o endereco.
// Clicar de novo no titulo em que voce ja esta nao cria passo repetido no
// historico: o Link percebe que o destino e o endereco atual e substitui.
export default function Outline({ headings }) {
  if (headings.length === 0) return null;

  return (
    <section className="outline">
      <h3 className="panel-title">
        Sumário <span className="count">{headings.length}</span>
      </h3>
      <ul>
        {headings.map((h) => (
          <li key={h.slug}>
            <Link
              className="outline-item"
              to={`#${h.slug}`}
              style={{ paddingLeft: 8 + (h.level - 1) * 12 }}   // recuo de acordo com o nivel
            >
              {h.text}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
