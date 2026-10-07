import { defineConfig } from 'vite'

// Bundle server produksi (server/index.ts) jadi satu file: dist-server/index.js
export default defineConfig({
  build: {
    ssr: 'server/index.ts',
    outDir: 'dist-server',
    emptyOutDir: true,
    target: 'node20',
  },
})
