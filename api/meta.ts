// Vercel Edge Function: suntik meta tag (judul, deskripsi, poster, JSON-LD)
// ke index.html buat halaman /anime/:id dan /nonton/:id.
//
// Kenapa perlu? Bot WhatsApp/Facebook/Twitter/Discord nggak jalanin JavaScript,
// jadi tanpa ini preview link-nya cuma judul default. Google juga dapet info
// halaman lebih cepat tanpa nunggu JS.
//
// Env yang dipakai: API_URL (atau VITE_API_URL kalau udah alamat lengkap)
// dan VITE_SITE_URL (opsional, default = domain yang lagi diakses).
import {
  animeMeta,
  DEFAULT_DESCRIPTION,
  episodeMeta,
  injectMeta,
  metaToHtml,
  pageTitle,
  type PageMeta,
} from '../src/lib/site.ts'

export const config = { runtime: 'edge' }

const SAFE_ID = /^[\w.~-]{1,200}$/

class NotFound extends Error {}

async function apiGet<T>(api: string, path: string): Promise<T> {
  const res = await fetch(`${api}/otakudesu${path}`, { signal: AbortSignal.timeout(4000) })
  if (res.status === 404) throw new NotFound()
  if (!res.ok) throw new Error(`API ${res.status}`)
  const body = (await res.json()) as { data?: { details?: T } | null }
  if (!body.data?.details) throw new NotFound()
  return body.data.details
}

type AnimeDetails = Parameters<typeof animeMeta>[2]
type EpisodeDetails = Parameters<typeof episodeMeta>[2]

async function resolveMeta(api: string, site: string, kind: string, id: string): Promise<PageMeta | null> {
  if (kind === 'anime') {
    return animeMeta(site, id, await apiGet<AnimeDetails>(api, `/anime/${encodeURIComponent(id)}`))
  }
  if (kind === 'episode') {
    const ep = await apiGet<EpisodeDetails>(api, `/episode/${encodeURIComponent(id)}`)
    const anime = await apiGet<AnimeDetails>(api, `/anime/${encodeURIComponent(ep.animeId)}`).catch(() => undefined)
    return episodeMeta(site, id, ep, anime)
  }
  return null
}

/** Ambil jenis halaman & id dari query (?kind=&id=) atau langsung dari path asli. */
function parseTarget(url: URL) {
  const kind = url.searchParams.get('kind')
  const id = url.searchParams.get('id')
  if (kind && id) return { kind, id }
  const m = url.pathname.match(/^\/(anime|nonton)\/([^/]+)\/?$/)
  return m ? { kind: m[1] === 'anime' ? 'anime' : 'episode', id: decodeURIComponent(m[2]) } : null
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const site = (process.env.VITE_SITE_URL || url.origin).replace(/\/+$/, '')
  const rawApi = process.env.API_URL || process.env.VITE_API_URL || ''
  const api = /^https?:\/\//.test(rawApi) ? rawApi.replace(/\/+$/, '') : ''

  // cookie diteruskan biar tetap jalan di preview deployment yang dikunci (Vercel Authentication)
  const shell = await fetch(new URL('/index.html', url.origin), {
    headers: { cookie: req.headers.get('cookie') ?? '' },
  })
  if (!shell.ok) return shell
  let html = await shell.text()
  let status = 200

  const target = parseTarget(url)
  if (api && target && SAFE_ID.test(target.id)) {
    try {
      const meta = await resolveMeta(api, site, target.kind, target.id)
      if (meta) html = injectMeta(html, metaToHtml(site, meta))
    } catch (error) {
      if (error instanceof NotFound) {
        // status 404 beneran biar Google nggak ngindeks halaman kosong
        status = 404
        const path = target.kind === 'anime' ? `/anime/${target.id}` : `/nonton/${target.id}`
        html = injectMeta(
          html,
          metaToHtml(site, { title: pageTitle('Halaman Tidak Ditemukan'), description: DEFAULT_DESCRIPTION, path, noindex: true }),
        )
      }
      // error lain (API lemot/mati): kirim HTML default aja, halaman tetap jalan
    }
  }

  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // cache di CDN Vercel 10 menit, sisanya diperbarui di belakang layar
      'cache-control':
        status === 200 ? 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400' : 'public, max-age=0, s-maxage=60',
    },
  })
}
