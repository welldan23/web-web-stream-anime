// Helper kecil buat handler server Animeku (statistik, metadata).
import type { IncomingMessage, ServerResponse } from 'node:http'

export const SERVER_PREFIX = '/_animeku'

export type Next = (err?: unknown) => void

export function json(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  if (!headers['cache-control']) res.setHeader('cache-control', 'no-store')
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
  res.end(JSON.stringify(body))
}

/** IP pengunjung. X-Forwarded-For cuma dipercaya kalau request datang dari reverse proxy lokal (Caddy/Nginx). */
export function clientIp(req: IncomingMessage) {
  const remote = req.socket.remoteAddress ?? ''
  const local = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1'
  const forwarded = req.headers['x-forwarded-for']
  if (local && typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return remote
}

/** Batas request per kunci (mis. per IP) dalam jangka waktu tertentu. */
export function createLimiter() {
  const buckets = new Map<string, { count: number; reset: number }>()
  return function allowed(key: string, limit: number, windowMs: number) {
    const now = Date.now()
    const bucket = buckets.get(key)
    if (!bucket || bucket.reset < now) {
      if (buckets.size > 10_000) buckets.clear()
      buckets.set(key, { count: 1, reset: now + windowMs })
      return true
    }
    bucket.count += 1
    return bucket.count <= limit
  }
}

/** Cache di memori dengan umur & batas jumlah; promise disimpan biar request barengan nggak dobel. */
export function createCache<T>(ttlMs: number, max = 2000) {
  const items = new Map<string, { at: number; value: Promise<T> }>()
  return function cached(key: string, load: () => Promise<T>) {
    const hit = items.get(key)
    if (hit && Date.now() - hit.at < ttlMs) return hit.value
    if (items.size >= max) items.delete(items.keys().next().value!)
    const value = load()
    items.set(key, { at: Date.now(), value })
    // yang gagal jangan disimpan lama-lama
    value.catch(() => items.delete(key))
    return value
  }
}
