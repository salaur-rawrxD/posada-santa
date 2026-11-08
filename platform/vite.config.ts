import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Library-only build. This does not replace the existing static website.
export default defineConfig({
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'PosadaPlatformCore',
      formats: ['es'],
      fileName: 'platform-core',
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
