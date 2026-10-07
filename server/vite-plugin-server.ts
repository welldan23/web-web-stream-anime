// Pasang API server Animeku (statistik, dashboard admin, panel ops, metadata) di
// `npm run dev` dan `npm run preview`, biar bisa dites di laptop tanpa build server.
import type { Connect, Plugin } from 'vite'
import { createMeta, type MetaOptions } from './meta.ts'
import { createOps, type OpsOptions } from './ops.ts'
import { createStats, type StatsOptions } from './stats.ts'

export default function serverPlugin(options: { stats: StatsOptions; meta: MetaOptions; ops?: OpsOptions }): Plugin {
  let handlers: Connect.NextHandleFunction[] | undefined
  const mount = (middlewares: Connect.Server) => {
    handlers ??= [createStats(options.stats), createOps(options.ops), createMeta(options.meta)].map(
      (h): Connect.NextHandleFunction =>
        (req, res, next) =>
          void h.handle(req, res, next),
    )
    for (const handler of handlers) middlewares.use(handler)
  }

  return {
    name: 'animeku-server',
    configureServer: (server) => mount(server.middlewares),
    configurePreviewServer: (server) => mount(server.middlewares),
  }
}
