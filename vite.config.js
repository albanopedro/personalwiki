import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { config } from './config.js';

export default defineConfig({
  plugins: [react()],   // ensina o Vite a entender arquivos .jsx
  server: {
    port: 5273,         // endereco onde o site vai abrir: localhost:5273
    proxy: {
      // Tudo que o navegador pedir comecando com /api, o Vite repassa
      // para o servidor da API (Parte 5). O navegador nem fica sabendo
      // que existe um segundo servidor.
      '/api': `http://localhost:${config.apiPort}`,
    },
  },
});
