import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// When deploying to GitHub Pages at https://<user>.github.io/<repo>/,
// Vite needs to know the sub-path. Set VITE_BASE_PATH in your GitHub Actions
// workflow (already wired up in .github/workflows/deploy.yml) or a .env file.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
});
