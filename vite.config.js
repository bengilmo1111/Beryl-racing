import { defineConfig } from 'vite';

// Gilmore Games directory contract: production is served beneath /beryl-racing/.
// Local dev stays at /. See PRD.md §11 and gilmore-directory/docs/ADDING_A_GAME.md.
const productionBase = '/beryl-racing/';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? productionBase : '/',
  build: {
    outDir: 'dist',
    target: 'es2019',
  },
}));
