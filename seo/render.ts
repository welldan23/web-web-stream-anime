// Logika "suntik meta tag ke HTML" buat halaman /anime/:id/:slug dan /nonton/:id/:slug/:episode.
// Dipakai oleh fungsi Vercel (api/meta.ts) DAN oleh `npm run dev` / `npm run preview`
// (seo/vite-plugin-seo.ts), jadi hasil di localhost sama persis kayak di produksi.
import {
  animeLikeFromKuramanime,
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
  const res = await fetch(`${api}/kuramanime${path}`, { signal: AbortSignal.timeout(4000) })
  if (res.status === 404) throw new NotFound()
  if (!res.ok) throw new Error(`API ${res.status}`)
  const body = (await res.json()) as { data?: { details?: T } | null }
  if (!body.data?.details) throw new NotFound()
  return body.data.details
}

type KuraAnime = Parameters<typeof animeLikeFromKuramanime>[0]

interface Target {
  kind: 'anime' | 'episode'
  animeId: string
  slug: string
  ep?: string
}

async function resolveMeta(api: string, site: string, t: Target): Promise<PageMeta> {
  const animeKey = `${t.animeId}/${t.slug}`
  const animePath = `/anime/${encodeURIComponent(t.animeId)}/${encodeURIComponent(t.slug)}`
  if (t.kind === 'anime') {
    return animeMeta(site, animeKey, animeLikeFromKuramanime(await apiGet<KuraAnime>(api, animePath)))
  }
  const ep = await apiGet<{ title: string; lastUpdated?: string }>(
    api,
    `/episode/${encodeURIComponent(t.animeId)}/${encodeURIComponent(t.slug)}/${encodeURIComponent(t.ep!)}`,
  )
  const anime = await apiGet<KuraAnime>(api, animePath).catch(() => undefined)
  const title = anime?.title ?? ep.title
  return episodeMeta(
    site,
    `${animeKey}/${t.ep}`,
    { title: `${title} Episode ${t.ep}`, animeId: animeKey, releaseTime: ep.lastUpdated },
    { title, poster: anime?.poster },
  )
}

/**
 * Ambil jenis halaman dari query (?kind=&id=&slug=&ep=, dipakai rewrite Vercel)
 * atau langsung dari path: /anime/:id/:slug atau /nonton/:id/:slug/:episode.
 */
export function parseTarget(url: URL): Target | null {
  const kind = url.searchParams.get('kind')
  const animeId = url.searchParams.get('id')
  const slug = url.searchParams.get('slug')
  if ((kind === 'anime' || kind === 'episode') && animeId && slug) {
    const ep = url.searchParams.get('ep') ?? undefined
    if (kind === 'episode' && !ep) return null
    return { kind, animeId, slug, ep }
  }
  const m = url.pathname.match(/^\/(?:anime\/([^/]+)\/([^/]+)|nonton\/([^/]+)\/([^/]+)\/([^/]+))\/?$/)
  if (!m) return null
  const dec = decodeURIComponent
  return m[1] ? { kind: 'anime', animeId: dec(m[1]), slug: dec(m[2]) } : { kind: 'episode', animeId: dec(m[3]), slug: dec(m[4]), ep: dec(m[5]) }
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
  const safe = target && [target.animeId, target.slug, target.ep ?? 'x'].every((x) => SAFE_ID.test(x))
  if (!apiBase || !target || !safe) return { html, status: 200 }

  try {
    const meta = await resolveMeta(apiBase, site, target)
    return { html: injectMeta(html, metaToHtml(site, meta)), status: 200 }
  } catch (error) {
    if (!(error instanceof NotFound)) return { html, status: 200 }
    // status 404 beneran biar Google nggak ngindeks halaman kosong
    const base = `${target.animeId}/${target.slug}`
    const path = target.kind === 'anime' ? `/anime/${base}` : `/nonton/${base}/${target.ep}`
    const notFound = metaToHtml(site, {
      title: pageTitle('Halaman Tidak Ditemukan'),
      description: DEFAULT_DESCRIPTION,
      path,
      noindex: true,
    })
    return { html: injectMeta(html, notFound), status: 404 }
  }
}
