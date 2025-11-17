import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ['even-obvious-highlighted-complicated.trycloudflare.com']
  }
});
