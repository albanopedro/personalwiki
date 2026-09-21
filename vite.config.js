import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { config } from './config.js';

export default defineConfig({
  plugins: [react()],   // ensina o Vite a entender arquivos .jsx
  server: {
    // Tambem pode vir do ambiente: WIKI_PORT=5373 npm run dev
    port: Number(process.env.WIKI_PORT) || 5273,   // localhost:5273 por padrao
    proxy: {
      // Tudo que o navegador pedir comecando com /api, o Vite repassa
      // para o servidor da API (Parte 5). O navegador nem fica sabendo
      // que existe um segundo servidor.
      '/api': `http://localhost:${config.apiPort}`,
    },
  },
});
