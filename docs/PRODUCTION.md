# Production deployment

Beryl Racing is now the 3D game. The top-down 2D release is retired.

- Development and production branch: `main` in `bengilmo1111/Beryl-racing`.
- Vercel production project: `beryl-racing`, deployed at `https://beryl-racing.vercel.app`.
- Public game URL: `https://gilmore.games/beryl-racing/`.
- Gateway repository: `bengilmo1111/gilmore-directory`. Its existing `/beryl-racing/` rewrites proxy the production project, including assets and subpaths.
- The former `3d-port` branch and `beryl-racing-3d` project are historical development entry points. Do not target them for new releases.

Vite must retain `base: './'`; absolute asset paths break the directory gateway. Keep the trailing slash on the public URL. The game manifest uses the original `beryl-racing` identity because this replaces the existing game rather than adding a second directory entry.

The final 2D commit is `8bf33c6dc5f88cb284dc029e0182fd1fee3bdeae`, preserved in Git history. The promotion is a normal merge, so both 2D and 3D development history remain available. Old 2D scores are not imported into the different 3D courses.

Validation includes the full course and mobile journeys, plus a smoke test that serves the build behind `/beryl-racing/`, checks assets, and starts the Three.js canvas. After a release, verify the directory card reaches the 3D title screen at the public URL.
