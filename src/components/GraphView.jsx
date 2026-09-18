import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force';
import { noteUrl } from '../utils/routes.js';

// O grafo das notas.  (Parte 16)
//
// Divisao de trabalho:
//   - o d3-force CALCULA onde cada bolinha fica, com uma simulacao de fisica;
//   - o React DESENHA tudo em SVG, a cada passo da simulacao.

const COLORS = ['#8b87f5', '#12a594', '#f0a92f', '#e5484d', '#3b82f6', '#a371f7'];
const CLICK_TOLERANCE = 4;   // pixels: mexeu menos que isso entre apertar e soltar = clique, nao arraste

// Mais ligacoes, bolinha maior. A raiz quadrada impede que o Indice (14 ligacoes) fique gigante.
const radius = (node) => 5 + Math.sqrt(node.degree) * 3;

// Depois que a simulacao comeca, o d3 troca o id da ponta de cada ligacao pela propria nota
const idOf = (end) => (typeof end === 'object' ? end.id : end);

// Nome curto na bolinha (o inteiro aparece quando o mouse passa por cima)
const shortName = (name) => (name.length > 18 ? `${name.slice(0, 17)}…` : name);

export default function GraphView({ indexVersion }) {
  const navigate = useNavigate();
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const positions = useRef(new Map());   // ultima posicao de cada nota
  const gesture = useRef(null);          // o que o ponteiro esta fazendo: arrastar nota ou mover a tela

  const [graph, setGraph] = useState(null);                 // { nodes, edges } vindos da API
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });   // deslocamento a partir do centro (x, y) e zoom (k)
  const [size, setSize] = useState({ w: 0, h: 0 });          // tamanho atual da area de desenho
  const sizeRef = useRef(size);                              // o mesmo, para o ouvinte da roda do mouse
  const [hovered, setHovered] = useState(null);              // id da nota sob o mouse
  const [hideIsolated, setHideIsolated] = useState(false);
  const [, setFrame] = useState(0);                          // so serve para redesenhar a cada passo da fisica

  // 1. Busca o grafo. De novo a cada versao do indice: se voce criar um link
  //    no Obsidian, a linha nova aparece aqui (Parte 15).
  useEffect(() => {
    let cancelled = false;
    fetch('/api/graph')
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setGraph(data); });
    return () => { cancelled = true; };
  }, [indexVersion]);

  // 2. Mede a area de desenho - e mede DE NOVO sempre que ela muda de tamanho
  //    (janela redimensionada, por exemplo). O ponto (0, 0) do grafo fica no
  //    centro dela; o arrastar e o zoom so somam um deslocamento a partir dai.
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const next = { w: entry.contentRect.width, h: entry.contentRect.height };
      sizeRef.current = next;
      setSize(next);
    });
    observer.observe(svgRef.current);
    return () => observer.disconnect();
  }, []);

  // Onde o (0, 0) do grafo esta na tela: o centro da area + o deslocamento
  const originX = size.w / 2 + view.x;
  const originY = size.h / 2 + view.y;

  // 3. As notas e ligacoes que vao para a tela. Sao COPIAS dos dados da API,
  //    porque o d3 escreve nelas (posicao, velocidade...). Uma nota que ja
  //    tinha posicao comeca de onde estava: editar uma nota no Obsidian, ou
  //    ligar o filtro, nao embaralha o grafo inteiro.
  const { nodes, links } = useMemo(() => {
    if (!graph) return { nodes: [], links: [] };
    const nodes = graph.nodes
      .filter((n) => !hideIsolated || n.degree > 0)
      .map((n) => ({ ...n, ...positions.current.get(n.id) }));
    const shown = new Set(nodes.map((n) => n.id));
    const links = graph.edges
      .filter((e) => shown.has(e.source) && shown.has(e.target))
      .map((e) => ({ ...e }));
    return { nodes, links };
  }, [graph, hideIsolated]);

  // 4. A fisica. Cada "forca" empurra ou puxa as notas um pouquinho a cada
  //    passo; depois de uns 300 passos tudo se acomoda e a simulacao para.
  useEffect(() => {
    if (nodes.length === 0) return;
    const alreadyPlaced = nodes.every((n) => n.x !== undefined);

    const sim = forceSimulation(nodes)
      .force('link', forceLink(links).id((n) => n.id).distance(160))  // cada ligacao e um elastico
      .force('charge', forceManyBody().strength(-900))                 // as notas se repelem, como imas
      // Um puxao fraco para o centro. As notas SOLTAS ganham um puxao mais forte:
      // sem nenhum elastico segurando, a repulsao das outras as jogaria longe.
      .force('x', forceX(0).strength((n) => (n.degree === 0 ? 0.15 : 0.05)))
      .force('y', forceY(0).strength((n) => (n.degree === 0 ? 0.15 : 0.05)))
      .force('collide', forceCollide((n) => radius(n) + 20))           // bolinhas (e nomes) nao se encostam
      .alpha(alreadyPlaced ? 0.3 : 1)                                  // ja arrumado? so um ajuste leve
      .on('tick', () => {
        for (const n of nodes) positions.current.set(n.id, { x: n.x, y: n.y });
        setFrame((f) => f + 1);
      });

    simRef.current = sim;
    return () => sim.stop();
  }, [nodes, links]);

  // 5. Zoom com a roda do mouse (ou pinca no trackpad), mantendo parado o
  //    ponto que esta sob o cursor. Este ouvinte e registrado "na mao", com
  //    passive: false, porque so assim o preventDefault funciona. Sem ele, a
  //    pinca no trackpad daria zoom na PAGINA inteira, nao no grafo.
  useEffect(() => {
    const svg = svgRef.current;
    function onWheel(e) {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const speed = e.ctrlKey ? 0.01 : 0.002;   // a pinca chega com ctrlKey e passos pequenos
      setView((v) => {
        const k = Math.min(4, Math.max(0.25, v.k * Math.exp(-e.deltaY * speed)));
        const cx = sizeRef.current.w / 2;
        const cy = sizeRef.current.h / 2;
        // o ponto do grafo sob o cursor, antes do zoom...
        const gx = (sx - cx - v.x) / v.k;
        const gy = (sy - cy - v.y) / v.k;
        // ...continua sob o cursor depois do zoom
        return { k, x: sx - cx - gx * k, y: sy - cy - gy * k };
      });
    }
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  // Converte um ponto da tela para coordenadas do grafo (desfaz o deslocamento e o zoom)
  function toGraph(e) {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - originX) / view.k,
      y: (e.clientY - rect.top - originY) / view.k,
    };
  }

  // 6. Arrastar: apertou numa nota, move a nota; apertou no fundo, move a tela.
  function startDragNode(e, node) {
    e.stopPropagation();                          // nao deixa o fundo comecar a mover a tela
    svgRef.current.setPointerCapture(e.pointerId);
    gesture.current = { type: 'node', node, startX: e.clientX, startY: e.clientY, moved: false };
    node.fx = node.x;                             // fx/fy = "segura esta nota aqui"
    node.fy = node.y;
    simRef.current.alphaTarget(0.3).restart();    // as vizinhas vao se acomodando enquanto voce arrasta
  }

  function startPan(e) {
    svgRef.current.setPointerCapture(e.pointerId);
    gesture.current = { type: 'pan', startX: e.clientX, startY: e.clientY, from: view };
  }

  function onPointerMove(e) {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (Math.hypot(dx, dy) > CLICK_TOLERANCE) g.moved = true;

    if (g.type === 'node') {
      const p = toGraph(e);
      g.node.fx = p.x;
      g.node.fy = p.y;
    } else {
      setView({ ...g.from, x: g.from.x + dx, y: g.from.y + dy });
    }
  }

  // Soltou o ponteiro. Se era uma nota e ela quase nao se mexeu, foi um CLIQUE.
  function endGesture(e, canClick) {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.type !== 'node') return;

    g.node.fx = null;                             // solta a nota: a fisica volta a mandar nela
    g.node.fy = null;
    simRef.current.alphaTarget(0);
    if (!canClick || g.moved) return;

    // Clique abre a nota; com Cmd/Ctrl/Shift, em outra aba - como os links (Partes 12 e 13)
    const url = noteUrl(g.node.id);
    if (e.metaKey || e.ctrlKey || e.shiftKey) window.open(url, '_blank');
    else navigate(url);
  }

  // Vizinhas de cada nota, para destacar as ligacoes de quem esta sob o mouse
  const neighbors = useMemo(() => {
    const map = new Map(nodes.map((n) => [n.id, new Set([n.id])]));
    for (const l of links) {
      map.get(idOf(l.source)).add(idOf(l.target));
      map.get(idOf(l.target)).add(idOf(l.source));
    }
    return map;
  }, [nodes, links]);
  const lit = hovered ? neighbors.get(hovered) : null;

  // Uma cor por pasta. A pasta com mais notas (a Apostila) fica com a cor de destaque.
  const folderColor = useMemo(() => {
    const count = new Map();
    for (const n of graph?.nodes ?? []) count.set(n.folder, (count.get(n.folder) ?? 0) + 1);
    const folders = [...count.keys()].sort((a, b) => count.get(b) - count.get(a) || a.localeCompare(b));
    return new Map(folders.map((f, i) => [f, COLORS[i % COLORS.length]]));
  }, [graph]);

  const isolated = graph ? graph.nodes.filter((n) => n.degree === 0).length : 0;
  const ready = nodes.length > 0 && nodes.every((n) => n.x !== undefined);

  return (
    <div className="graph-area">
      <svg
        ref={svgRef}
        className="graph"
        onPointerDown={startPan}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endGesture(e, true)}
        onPointerCancel={(e) => endGesture(e, false)}
      >
        {ready && (
          <g transform={`translate(${originX} ${originY}) scale(${view.k})`}>
            {links.map((l) => {
              const touchesHovered = idOf(l.source) === hovered || idOf(l.target) === hovered;
              const state = !hovered ? '' : touchesHovered ? ' lit' : ' dim';
              return (
                <line
                  key={`${idOf(l.source)}|${idOf(l.target)}`}
                  className={`graph-edge${state}`}
                  x1={l.source.x}
                  y1={l.source.y}
                  x2={l.target.x}
                  y2={l.target.y}
                  strokeWidth={0.8 + l.count * 0.5}   // mais links entre as duas, linha mais grossa
                />
              );
            })}

            {nodes.map((n) => (
              <g
                key={n.id}
                className={`graph-node${n.id === hovered ? ' hovered' : ''}${lit && !lit.has(n.id) ? ' dim' : ''}`}
                transform={`translate(${n.x} ${n.y})`}
                onPointerDown={(e) => startDragNode(e, n)}
                onPointerEnter={() => setHovered(n.id)}
                onPointerLeave={() => setHovered(null)}
              >
                <circle r={radius(n)} fill={folderColor.get(n.folder)} />
                <text y={radius(n) + 13}>{n.id === hovered ? n.name : shortName(n.name)}</text>
                <title>{n.name}</title>
              </g>
            ))}
          </g>
        )}
      </svg>

      {graph && (
        <div className="graph-toolbar">
          <span>
            {graph.nodes.length} notas · {graph.edges.length} ligações · {isolated} sem ligação
          </span>
          <label>
            <input
              type="checkbox"
              checked={hideIsolated}
              onChange={(e) => setHideIsolated(e.target.checked)}
            />
            esconder notas sem ligação
          </label>
        </div>
      )}

      <div className="graph-legend">
        {[...folderColor].map(([folder, color]) => (
          <span key={folder} style={{ '--c': color }}>{folder || 'Raiz'}</span>
        ))}
      </div>
    </div>
  );
}
