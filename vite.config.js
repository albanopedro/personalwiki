import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],   // ensina o Vite a entender arquivos .jsx
  server: {
    port: 5273,         // endereco onde o site vai abrir: localhost:5273
  },
});
