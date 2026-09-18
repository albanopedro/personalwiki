import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// Procura a <div id="root"> do index.html e desenha o App dentro dela.
createRoot(document.getElementById('root')).render(<App />);
