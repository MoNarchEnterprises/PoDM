import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const repositoryRoot = path.resolve(process.cwd(), '..');

export default defineConfig({
  plugins: [react()],
  server: {
    port: 6969,
    // The portal imports the repository's architecture artifacts at build time.
    fs: { allow: [repositoryRoot] },
  },
  resolve: {
    alias: {
      '@': '/src',
      '@knowledge': path.resolve(repositoryRoot, 'docs/knowledge'),
      '@artifacts': path.resolve(repositoryRoot, 'docs'),
    },
  },
});
