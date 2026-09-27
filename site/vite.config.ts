import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const config = defineConfig({
  plugins: [react()],
  // dist/.vite/manifest.json lists every file Vite emitted; the deploy tool caches only those forever
  build: { manifest: true },
});

export default config;
