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
      // 127.0.0.1 escrito por extenso, e nao "localhost": em alguns sistemas
      // o Node traduz "localhost" primeiro para o endereco IPv6 (::1), e a
      // API agora escuta so no IPv4.  (Parte 20)
      '/api': `http://127.0.0.1:${config.apiPort}`,
    },
  },
});
