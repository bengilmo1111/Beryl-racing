import { defineConfig } from 'vite';

// Relative base ('./') so the built asset URLs resolve correctly BOTH ways:
//   • directly at https://beryl-racing.vercel.app/   (project root), and
//   • via the gateway at https://gilmore.games/beryl-racing/  (which strips the
//     /beryl-racing prefix before proxying to this project).
//
// An absolute base like '/beryl-racing/' only works through the gateway and
// 404s at the project root; an absolute '/' only works at the root and breaks
// through the gateway. Relative paths satisfy both, as long as the page is
// served with a trailing slash (the directory card links to /beryl-racing/).
// See PRD.md §11 and gilmore-directory/docs/ADDING_A_GAME.md ("prefer relative
// paths").
export default defineConfig(() => ({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2019',
  },
}));
