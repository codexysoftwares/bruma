import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@huggingface/transformers'] },
  server: { proxy: { '/api': 'http://localhost:8787' } },
  build: { target: 'es2022', chunkSizeWarningLimit: 4000 },
});
