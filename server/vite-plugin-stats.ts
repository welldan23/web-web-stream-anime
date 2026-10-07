// Pasang statistik & API dashboard admin di `npm run dev` dan `npm run preview`,
// biar /admin bisa dites di laptop tanpa build server.
import type { Plugin } from 'vite'
import { createStats, type StatsOptions } from './stats.ts'

export default function statsPlugin(options: StatsOptions): Plugin {
  let stats: ReturnType<typeof createStats> | undefined
  const get = () => (stats ??= createStats(options))

  return {
    name: 'animeku-stats',
    configureServer(server) {
      server.middlewares.use((req, res, next) => void get().handle(req, res, next))
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => void get().handle(req, res, next))
    },
  }
}
