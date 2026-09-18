import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import App from './App.jsx';
import './styles.css';
// As cores de cada pedaco do codigo (palavra-chave, texto, comentario...).
// So as cores: a caixa do bloco continua a do nosso styles.css.  (Parte 14)
import 'highlight.js/styles/github-dark.css';

// Os enderecos do wiki.  (Parte 11)
// O App e o layout de todas as telas: as tres colunas. As rotas filhas nao
// desenham nada sozinhas - so declaram quais enderecos existem. Quem le do
// endereco qual nota mostrar e o proprio App, porque as tres colunas (menu,
// nota e painel) dependem da nota aberta.
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true },      // "/"                    -> nenhuma nota aberta
      { path: 'nota/*' },   // "/nota/<pasta>/<nome>" -> o * pega todo o resto, com as barras
      { path: 'grafo' },    // "/grafo"               -> o grafo das notas (Parte 16)
    ],
  },
]);

createRoot(document.getElementById('root')).render(<RouterProvider router={router} />);
