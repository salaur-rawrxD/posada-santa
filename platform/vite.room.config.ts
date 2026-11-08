import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Preview build of the standalone lobby. Not yet wired into root Vercel deployment.
export default defineConfig({
  build: {
    rollupOptions: {
      input: fileURLToPath(new URL('./room.html', import.meta.url)),
    },
    outDir: 'dist-room',
    emptyOutDir: true,
  },
});
