// Logika "suntik meta tag ke HTML" buat halaman /anime/:id dan /nonton/:id.
// Dipakai oleh fungsi Vercel (api/meta.ts) DAN oleh `npm run dev` / `npm run preview`
// (seo/vite-plugin-seo.ts), jadi hasil di localhost sama persis kayak di produksi.
import {
  animeLikeFromOploverz,
  animeMeta,
  DEFAULT_DESCRIPTION,
  episodeMeta,
  injectMeta,
  metaToHtml,
  pageTitle,
  type PageMeta,
} from '../src/lib/site.ts'

const SAFE_ID = /^[\w.~-]{1,200}$/

class NotFound extends Error {}

async function apiGet<T>(api: string, path: string): Promise<T> {
  const res = await fetch(`${api}/oploverz${path}`, { signal: AbortSignal.timeout(4000) })
  if (res.status === 404) throw new NotFound()
  if (!res.ok) throw new Error(`API ${res.status}`)
  const body = (await res.json()) as { data?: { details?: T } | null }
  if (!body.data?.details) throw new NotFound()
  return body.data.details
}

type OploAnime = Parameters<typeof animeLikeFromOploverz>[0]
interface OploEpisode {
  title: string
  seriesSlug: string
  releasedOn?: string
}

async function resolveMeta(api: string, site: string, kind: string, id: string): Promise<PageMeta | null> {
  if (kind === 'anime') {
    return animeMeta(site, id, animeLikeFromOploverz(await apiGet<OploAnime>(api, `/anime/${encodeURIComponent(id)}`)))
  }
  if (kind === 'episode') {
    const ep = await apiGet<OploEpisode>(api, `/episode/${encodeURIComponent(id)}`)
    const anime = ep.seriesSlug
      ? await apiGet<OploAnime>(api, `/anime/${encodeURIComponent(ep.seriesSlug)}`).catch(() => undefined)
      : undefined
    return episodeMeta(
      site,
      id,
      { title: ep.title, animeId: ep.seriesSlug, releaseTime: ep.releasedOn },
      anime ? { title: anime.title, poster: anime.poster } : undefined,
    )
  }
  return null
}

/** Ambil jenis halaman & id dari query (?kind=&id=) atau langsung dari path, mis. /anime/one-piece. */
export function parseTarget(url: URL) {
  const kind = url.searchParams.get('kind')
  const id = url.searchParams.get('id')
  if (kind && id) return { kind, id }
  const m = url.pathname.match(/^\/(anime|nonton)\/([^/]+)\/?$/)
  return m ? { kind: m[1] === 'anime' ? 'anime' : 'episode', id: decodeURIComponent(m[2]) } : null
}

/**
 * Kembalikan HTML yang udah disuntik meta tag halaman tsb.
 * Kalau API mati/lemot, HTML dikembalikan apa adanya (halaman tetap jalan).
 */
export async function renderPage(
  html: string,
  { url, api, site }: { url: URL; api?: string; site: string },
): Promise<{ html: string; status: number }> {
  const target = parseTarget(url)
  const apiBase = api && /^https?:\/\//.test(api) ? api.replace(/\/+$/, '') : ''
  if (!apiBase || !target || !SAFE_ID.test(target.id)) return { html, status: 200 }

  try {
    const meta = await resolveMeta(apiBase, site, target.kind, target.id)
    return { html: meta ? injectMeta(html, metaToHtml(site, meta)) : html, status: 200 }
  } catch (error) {
    if (!(error instanceof NotFound)) return { html, status: 200 }
    // status 404 beneran biar Google nggak ngindeks halaman kosong
    const path = target.kind === 'anime' ? `/anime/${target.id}` : `/nonton/${target.id}`
    const notFound = metaToHtml(site, {
      title: pageTitle('Halaman Tidak Ditemukan'),
      description: DEFAULT_DESCRIPTION,
      path,
      noindex: true,
    })
    return { html: injectMeta(html, notFound), status: 404 }
  }
}
