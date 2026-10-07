// Server produksi Animeku buat VPS (gantiin `vite preview`):
// - nyajiin hasil build di dist/ (+ meta tag SEO buat halaman anime/episode)
// - nerusin /api/* ke wajik-anime-api
// - statistik & API dashboard admin (/_animeku/*)
//
// Build: `npm run build:server`, jalanin: `npm start`.
// Pengaturan dibaca dari environment atau file .env:
//   PORT (4173), HOST (0.0.0.0), API_PROXY_TARGET (http://localhost:3001),
//   VITE_SITE_URL, ADMIN_PASSWORD, STATS_FILE (data/stats.json), STATS_TZ (Asia/Jakarta)
import { createReadStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { createServer, request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http'
import { request as httpsRequest } from 'node:https'
import path from 'node:path'
import { parseTarget, renderPage } from '../seo/render.ts'
import { createStats } from './stats.ts'

try {
  process.loadEnvFile()
} catch {
  // nggak ada .env, pakai environment biasa
}

const env = process.env
const port = Number(env.PORT) || 4173
const host = env.HOST || '0.0.0.0'
const apiTarget = new URL(env.API_PROXY_TARGET || 'http://localhost:3001')
const siteUrl = env.VITE_SITE_URL?.replace(/\/+$/, '')
const distDir = path.resolve(env.DIST_DIR || 'dist')

const stats = createStats({
  file: env.STATS_FILE,
  password: env.ADMIN_PASSWORD,
  timeZone: env.STATS_TZ,
  githubRepo: env.GITHUB_REPO,
})

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2',
}

/** Teruskan /api/* ke wajik-anime-api apa adanya (header CORS dari wajik ikut kebawa). */
function proxyApi(req: IncomingMessage, res: ServerResponse) {
  const upstreamPath = (req.url ?? '/').replace(/^\/api/, '') || '/'
  const send = apiTarget.protocol === 'https:' ? httpsRequest : httpRequest
  const upstream = send(
    {
      protocol: apiTarget.protocol,
      hostname: apiTarget.hostname,
      port: apiTarget.port,
      method: req.method,
      path: `${apiTarget.pathname.replace(/\/+$/, '')}${upstreamPath}`,
      headers: { ...req.headers, host: apiTarget.host },
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers)
      upstreamRes.pipe(res)
    },
  )
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ statusCode: 502, message: 'wajik-anime-api nggak bisa dihubungi' }))
  })
  req.pipe(upstream)
}

let shell: string | undefined
async function indexHtml() {
  shell ??= await readFile(path.join(distDir, 'index.html'), 'utf-8')
  return shell
}

async function serveFile(req: IncomingMessage, res: ServerResponse, pathname: string) {
  const file = path.join(distDir, pathname)
  if (!file.startsWith(distDir + path.sep)) return false
  const info = await stat(file).catch(() => null)
  if (!info?.isFile()) return false
  res.statusCode = 200
  res.setHeader('content-type', MIME[path.extname(file)] ?? 'application/octet-stream')
  res.setHeader('content-length', info.size)
  // file di /assets namanya pakai hash, aman di-cache lama
  res.setHeader('cache-control', pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600')
  if (req.method === 'HEAD') res.end()
  else createReadStream(file).pipe(res)
  return true
}

async function servePage(req: IncomingMessage, res: ServerResponse, url: URL) {
  const html = await indexHtml()
  const origin = siteUrl ?? `${req.headers['x-forwarded-proto'] ?? 'http'}://${req.headers.host ?? 'localhost'}`
  const result = parseTarget(url)
    ? await renderPage(html, { url, api: apiTarget.origin + apiTarget.pathname.replace(/\/+$/, ''), site: origin })
    : { html, status: 200 }
  res.statusCode = result.status
  res.setHeader('content-type', 'text/html; charset=utf-8')
  res.setHeader('cache-control', 'no-cache')
  res.end(req.method === 'HEAD' ? undefined : result.html)
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return proxyApi(req, res)

  stats.handle(req, res, async () => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.statusCode = 405
        return res.end()
      }
      const pathname = decodeURIComponent(url.pathname)
      if (pathname !== '/' && (await serveFile(req, res, pathname))) return
      // file statis yang nggak ada (mis. /assets/lama.js) → 404 beneran, bukan halaman web
      if (path.extname(pathname)) {
        res.statusCode = 404
        return res.end('Not found')
      }
      await servePage(req, res, url)
    } catch (error) {
      console.error(error)
      if (!res.headersSent) res.statusCode = 500
      res.end()
    }
  })
})

server.listen(port, host, () => {
  console.log(`Animeku jalan di http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`)
  console.log(`API diteruskan ke ${apiTarget.href}`)
  if (!env.ADMIN_PASSWORD) console.log('ADMIN_PASSWORD belum diisi: dashboard /admin dikunci.')
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await stats.flush().catch(() => {})
    process.exit(0)
  })
}
