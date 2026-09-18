import { useEffect, useState } from 'react';
import { cleanContext } from '../utils/cleanContext.js';

// Resultados da busca, no lugar da lista de notas.  (Parte 9)
export default function SearchResults({ query, selectedId, onSelect }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    // Espera 200ms sem digitar antes de perguntar a API. Sem isso,
    // digitar "banco de dados" dispararia 14 buscas, uma por letra.
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const json = res.ok ? await res.json() : { failed: true, results: [] };
      if (!cancelled) setData(json);   // resposta de uma busca que ja ficou velha e descartada
    }, 200);

    // O React roda isto quando a query muda de novo (ou o componente some):
    // cancela o timer pendente e marca a busca anterior como velha.
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  if (!data) return <p className="search-info">Buscando...</p>;
  if (data.failed) return <p className="error">A busca falhou. A API está rodando?</p>;
  if (data.results.length === 0) return <p className="search-info">Nada encontrado.</p>;

  return (
    <div className="search-results">
      <p className="search-info">{data.total} nota(s)</p>
      <ul>
        {data.results.map((r) => (
          <li key={r.id}>
            <button
              className={r.id === selectedId ? 'result active' : 'result'}
              onClick={() => onSelect(r.id)}
            >
              <span className="result-name">{r.name}</span>

              {r.hits.map((h) => (
                <span key={h.line} className="result-hit">
                  {h.section && <span className="result-section">{h.section}</span>}
                  {/* se o que casou foi o proprio titulo, ele ja apareceu na linha de cima */}
                  {!h.isHeading && <span className="result-text">{cleanContext(h.text)}</span>}
                </span>
              ))}

              {r.lineHits > r.hits.length && (
                <span className="result-more">+ {r.lineHits - r.hits.length} ocorrência(s)</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
