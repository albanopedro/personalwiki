import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { noteUrl } from '../utils/routes.js';
import { cleanContext } from '../utils/cleanContext.js';
import { headingText } from '../utils/markdown.js';
import { api } from '../utils/api.js';

// Resultados da busca, no lugar da lista de notas.  (Parte 9)
export default function SearchResults({ query, selectedId, indexVersion }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    // Espera 200ms sem digitar antes de perguntar a API. Sem isso,
    // digitar "banco de dados" dispararia 14 buscas, uma por letra.
    const timer = setTimeout(async () => {
      try {
        const resultado = await api(`/api/search?q=${encodeURIComponent(query)}`);
        if (!cancelled) setData(resultado);   // se ja ficou velha, a resposta e descartada
      } catch (err) {
        if (!cancelled) setData({ failed: err.message, results: [] });
      }
    }, 200);

    // O React roda isto quando a query muda de novo (ou o componente some):
    // cancela o timer pendente e marca a busca anterior como velha.
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // O indexVersion entra aqui para a busca refazer o pedido quando o vault
    // muda (Parte 15) - e tambem quando a API volta depois de cair.  (Parte 20)
  }, [query, indexVersion]);

  if (!data) return <p className="search-info">Buscando...</p>;
  if (data.failed) return <p className="error">{data.failed}</p>;
  if (data.results.length === 0) return <p className="search-info">Nada encontrado.</p>;

  return (
    <div className="search-results">
      <p className="search-info">{data.total} nota(s)</p>
      <ul>
        {data.results.map((r) => (
          <li key={r.id} className={r.id === selectedId ? 'result active' : 'result'}>
            {/* O nome abre a nota no topo; cada trecho abre na secao dele  (Parte 10) */}
            <Link className="result-name" to={noteUrl(r.id)}>
              {r.name}
            </Link>

            {r.hits.map((h) => (
              <Link key={h.line} className="result-hit" to={noteUrl(r.id, h.line)}>
                {h.section && <span className="result-section">{headingText(h.section)}</span>}
                {/* se o que casou foi o proprio titulo, ele ja apareceu na linha de cima */}
                {!h.isHeading && <span className="result-text">{cleanContext(h.text)}</span>}
              </Link>
            ))}

            {r.lineHits > r.hits.length && (
              <span className="result-more">+ {r.lineHits - r.hits.length} ocorrência(s)</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
