// Statistik Animeku + API dashboard admin.
//
// - POST /_animeku/e            : dicatat dari web/aplikasi (anonim, tanpa login)
// - POST /_animeku/admin/login  : masuk pakai ADMIN_PASSWORD
// - POST /_animeku/admin/logout
// - GET  /_animeku/admin/stats?days=7|30
//
// Data disimpan per hari di satu file JSON. Pengunjung dihitung pakai hash
// (IP + browser + garam acak harian), jadi IP asli nggak pernah disimpan dan
// pengunjung yang sama nggak bisa dilacak dari hari ke hari.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { clientIp, createLimiter, json, SERVER_PREFIX as STATS_PREFIX, type Next } from './http.ts'

interface Day {
  views: number
  watches: number
  searches: number
  visitors: number
  appVisitors: number
  anime: Record<string, { title: string; n: number }>
  queries: Record<string, { n: number; empty: number }>
}

interface StoreFile {
  days: Record<string, Day>
  today: { day: string; salt: string; seen: Record<string, 0 | 1> }
}

export interface StatsOptions {
  /** Lokasi file data, default data/stats.json */
  file?: string
  /** Password dashboard. Kosong = dashboard dikunci. */
  password?: string
  /** Zona waktu buat motong hari, default Asia/Jakarta */
  timeZone?: string
  /** owner/repo GitHub buat ngitung download APK */
  githubRepo?: string
}

const KEEP_DAYS = 120
const MAX_KEYS_PER_DAY = 3000
const SESSION_DAYS = 30
const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python|headless|lighthouse/i

const emptyDay = (): Day => ({ views: 0, watches: 0, searches: 0, visitors: 0, appVisitors: 0, anime: {}, queries: {} })

function clip(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

/** Ambil/bikin entri; kalau udah kebanyakan (spam), entri baru diabaikan. */
function entryFor<T>(map: Record<string, T>, key: string, create: () => T) {
  if (map[key]) return map[key]
  if (Object.keys(map).length >= MAX_KEYS_PER_DAY) return undefined
  return (map[key] = create())
}

async function readBody(req: IncomingMessage, limit = 4096) {
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length
    if (size > limit) throw new Error('body too large')
    chunks.push(chunk)
  }
  const text = Buffer.concat(chunks).toString('utf-8')
  return text ? (JSON.parse(text) as Record<string, unknown>) : {}
}

function readCookie(req: IncomingMessage, name: string) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return undefined
}

function safeEqual(a: string, b: string) {
  const x = createHash('sha256').update(a).digest()
  const y = createHash('sha256').update(b).digest()
  return timingSafeEqual(x, y)
}

export function createStats(options: StatsOptions = {}) {
  const file = path.resolve(options.file || 'data/stats.json')
  const password = options.password ?? ''
  const timeZone = options.timeZone || 'Asia/Jakarta'
  const githubRepo = options.githubRepo || 'welldan23/web-web-stream-anime'
  // kunci tanda tangan cookie login; ganti password = semua sesi lama otomatis keluar
  const signKey = createHash('sha256').update(`animeku-admin:${password}`).digest()
  const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
  const dayOf = (date: Date) => dayFormat.format(date)

  let store: StoreFile = { days: {}, today: { day: '', salt: '', seen: {} } }
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  const ready = readFile(file, 'utf-8')
    .then((text) => {
      const parsed = JSON.parse(text) as StoreFile
      if (parsed && typeof parsed.days === 'object') store = parsed
    })
    .catch(() => {})

  async function save() {
    saveTimer = undefined
    await mkdir(path.dirname(file), { recursive: true })
    const tmp = `${file}.tmp`
    await writeFile(tmp, JSON.stringify(store))
    await rename(tmp, file)
  }

  function scheduleSave() {
    saveTimer ??= setTimeout(() => save().catch((err) => console.error('[stats] gagal simpan:', err)), 5000)
  }

  /** Data hari ini; ganti hari = garam & daftar pengunjung direset, data lama dibuang. */
  function today() {
    const day = dayOf(new Date())
    if (store.today.day !== day) {
      store.today = { day, salt: randomBytes(16).toString('hex'), seen: {} }
      const cutoff = dayOf(new Date(Date.now() - KEEP_DAYS * 86_400_000))
      for (const key of Object.keys(store.days)) if (key < cutoff) delete store.days[key]
    }
    return (store.days[day] ??= emptyDay())
  }

  // batas kiriman per IP biar file nggak dibanjiri
  const allowed = createLimiter()

  function record(req: IncomingMessage, body: Record<string, unknown>) {
    const ua = req.headers['user-agent'] ?? ''
    if (!ua || BOT_UA.test(ua)) return
    const ip = clientIp(req)
    if (!allowed(`e:${ip}`, 120, 60_000)) return

    const day = today()
    const visitor = createHash('sha256').update(`${store.today.salt}|${ip}|${ua}`).digest('base64url').slice(0, 16)
    const seen = store.today.seen
    if (!seen[visitor]) {
      seen[visitor] = 1
      day.visitors += 1
    }
    if (body.app === true && !seen[`${visitor}:app`]) {
      seen[`${visitor}:app`] = 1
      day.appVisitors += 1
    }

    switch (body.t) {
      case 'view':
        day.views += 1
        break
      case 'watch': {
        const animeId = clip(body.animeId, 200)
        if (!animeId) return
        day.watches += 1
        const entry = entryFor(day.anime, animeId, () => ({ title: clip(body.title, 200) || animeId, n: 0 }))
        if (entry) entry.n += 1
        break
      }
      case 'search': {
        const q = clip(body.q, 80).toLowerCase().replace(/\s+/g, ' ')
        if (!q) return
        day.searches += 1
        const entry = entryFor(day.queries, q, () => ({ n: 0, empty: 0 }))
        if (entry) {
          entry.n += 1
          if (body.results === 0) entry.empty += 1
        }
        break
      }
      default:
        return
    }
    scheduleSave()
  }

  // --- login ---
  function sign(expires: number) {
    const payload = String(expires)
    return `${payload}.${createHmac('sha256', signKey).update(payload).digest('base64url')}`
  }

  function isAdmin(req: IncomingMessage) {
    if (!password) return false
    const token = readCookie(req, 'animeku_admin')
    if (!token) return false
    const [payload] = token.split('.')
    const expires = Number(payload)
    return Number.isFinite(expires) && expires > Date.now() && safeEqual(token, sign(expires))
  }

  function sessionCookie(req: IncomingMessage, value: string, maxAge: number) {
    const secure = req.headers['x-forwarded-proto'] === 'https' || 'encrypted' in req.socket
    return `animeku_admin=${value}; Path=${STATS_PREFIX}/admin; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`
  }

  // --- download APK dari GitHub Releases (di-cache 10 menit) ---
  let apkCache: { at: number; value: { downloads: number; publishedAt: string | null; url: string | null } | null } = {
    at: 0,
    value: null,
  }
  async function apkStats() {
    if (Date.now() - apkCache.at < 600_000) return apkCache.value
    let value = apkCache.value
    try {
      const res = await fetch(`https://api.github.com/repos/${githubRepo}/releases/tags/apk-latest`, {
        headers: { accept: 'application/vnd.github+json', 'user-agent': 'animeku-admin' },
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) {
        const release = (await res.json()) as {
          published_at: string | null
          assets: { name: string; download_count: number; browser_download_url: string }[]
        }
        const apk = release.assets.find((a) => a.name.endsWith('.apk'))
        value = {
          downloads: apk?.download_count ?? 0,
          publishedAt: release.published_at,
          url: apk?.browser_download_url ?? null,
        }
      }
    } catch {
      // GitHub lagi nggak bisa diakses; pakai angka terakhir
    }
    apkCache = { at: Date.now(), value }
    return value
  }

  function summarize(days: number) {
    today()
    const now = Date.now()
    const keys = Array.from({ length: days * 2 }, (_, i) => dayOf(new Date(now - (days * 2 - 1 - i) * 86_400_000)))
    const previous = keys.slice(0, days)
    const current = keys.slice(days)
    const total = (list: string[], field: 'views' | 'watches' | 'searches' | 'visitors' | 'appVisitors') =>
      list.reduce((sum, key) => sum + (store.days[key]?.[field] ?? 0), 0)
    const totals = (list: string[]) => ({
      visitors: total(list, 'visitors'),
      views: total(list, 'views'),
      watches: total(list, 'watches'),
      searches: total(list, 'searches'),
      appVisitors: total(list, 'appVisitors'),
    })

    const anime = new Map<string, { animeId: string; title: string; count: number }>()
    const queries = new Map<string, { q: string; count: number; empty: number }>()
    for (const key of current) {
      const day = store.days[key]
      if (!day) continue
      for (const [animeId, { title, n }] of Object.entries(day.anime)) {
        const item = anime.get(animeId) ?? { animeId, title, count: 0 }
        item.count += n
        item.title = title
        anime.set(animeId, item)
      }
      for (const [q, { n, empty }] of Object.entries(day.queries)) {
        const item = queries.get(q) ?? { q, count: 0, empty: 0 }
        item.count += n
        item.empty += empty
        queries.set(q, item)
      }
    }
    const byCount = <T extends { count: number }>(a: T, b: T) => b.count - a.count
    const allQueries = [...queries.values()]

    return {
      days,
      timeZone,
      totals: totals(current),
      previous: totals(previous),
      daily: current.map((key) => {
        const day = store.days[key]
        return {
          day: key,
          visitors: day?.visitors ?? 0,
          views: day?.views ?? 0,
          watches: day?.watches ?? 0,
          searches: day?.searches ?? 0,
        }
      }),
      topAnime: [...anime.values()].sort(byCount).slice(0, 10),
      topSearches: allQueries.sort(byCount).slice(0, 10),
      emptySearches: allQueries
        .filter((item) => item.empty > 0)
        .map((item) => ({ q: item.q, count: item.empty }))
        .sort(byCount)
        .slice(0, 10),
    }
  }

  /** Middleware ala connect: dipasang di server produksi & di `vite dev/preview`. */
  async function handle(req: IncomingMessage, res: ServerResponse, next: Next) {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const route = url.pathname.startsWith(`${STATS_PREFIX}/`) ? url.pathname.slice(STATS_PREFIX.length) : ''
    if (route !== '/e' && !route.startsWith('/admin/')) return next()
    await ready

    try {
      if (route === '/e' && req.method === 'POST') {
        record(req, await readBody(req))
        res.statusCode = 204
        return res.end()
      }

      if (route === '/admin/login' && req.method === 'POST') {
        if (!password) return json(res, 503, { message: 'ADMIN_PASSWORD belum diisi di server.' })
        if (!allowed(`login:${clientIp(req)}`, 5, 15 * 60_000))
          return json(res, 429, { message: 'Kebanyakan percobaan. Coba lagi 15 menit lagi.' })
        const body = await readBody(req)
        if (typeof body.password !== 'string' || !safeEqual(body.password, password))
          return json(res, 401, { message: 'Password salah.' })
        const maxAge = SESSION_DAYS * 86_400
        const cookie = sessionCookie(req, sign(Date.now() + maxAge * 1000), maxAge)
        return json(res, 200, { ok: true }, { 'set-cookie': cookie })
      }

      if (route === '/admin/logout' && req.method === 'POST') {
        return json(res, 200, { ok: true }, { 'set-cookie': sessionCookie(req, '', 0) })
      }

      if (route === '/admin/stats' && req.method === 'GET') {
        if (!password) return json(res, 503, { message: 'ADMIN_PASSWORD belum diisi di server.' })
        if (!isAdmin(req)) return json(res, 401, { message: 'Belum login.' })
        const days = url.searchParams.get('days') === '30' ? 30 : 7
        return json(res, 200, { ...summarize(days), apk: await apkStats() })
      }

      return json(res, 404, { message: 'Nggak ada.' })
    } catch {
      return json(res, 400, { message: 'Request nggak valid.' })
    }
  }

  /** Simpan data yang belum ketulis (dipanggil pas server mau mati). */
  async function flush() {
    if (saveTimer) {
      clearTimeout(saveTimer)
      await save()
    }
  }

  return { handle, flush }
}
