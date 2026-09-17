import { createRoot } from 'react-dom/client';

// Procura a <div id="root"> la do index.html...
const root = createRoot(document.getElementById('root'));

// ...e manda o React desenhar isto dentro dela.
root.render(
  <div style={{ padding: 40 }}>
    <h1>Personal Wiki</h1>
    <p style={{ color: '#9aa3b2' }}>Parte 1: o esqueleto está de pé.</p>
  </div>
);
