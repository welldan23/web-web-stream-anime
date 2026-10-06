// Plugin Vite: bikin robots.txt + sitemap.xml waktu `npm run build`,
// dan pasang preconnect ke API biar request pertama lebih cepat.
import type { Plugin } from 'vite'

interface Options {
  /** Alamat web, mis. https://animeku.vercel.app (tanpa "/" di akhir). */
  siteUrl?: string
  /** Alamat wajik-anime-api yang bisa diakses waktu build, buat ngisi sitemap. */
  apiUrl?: string
}

const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/jadwal', changefreq: 'daily', priority: '0.9' },
  { path: '/ongoing', changefreq: 'daily', priority: '0.9' },
  { path: '/tamat', changefreq: 'weekly', priority: '0.7' },
  { path: '/genre', changefreq: 'monthly', priority: '0.6' },
  { path: '/daftar', changefreq: 'weekly', priority: '0.6' },
]

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) })
    if (!res.ok) return null
    return ((await res.json()) as { data: T }).data
  } catch {
    return null
  }
}

async function collectUrls(apiUrl: string | undefined, log: (msg: string) => void) {
  const urls = STATIC_ROUTES.map((r) => ({ ...r }))
  if (!apiUrl) {
    log('API_URL kosong, sitemap cuma berisi halaman utama.')
    return urls
  }
  const base = `${apiUrl.replace(/\/+$/, '')}/otakudesu`
  const [genres, all] = await Promise.all([
    getJson<{ genreList: { genreId: string }[] }>(`${base}/genre`),
    getJson<{ list: { animeList: { animeId: string }[] }[] }>(`${base}/anime`),
  ])
  for (const g of genres?.genreList ?? []) {
    urls.push({ path: `/genre/${g.genreId}`, changefreq: 'weekly', priority: '0.5' })
  }
  const animeIds = new Set((all?.list ?? []).flatMap((group) => group.animeList.map((a) => a.animeId)))
  for (const id of animeIds) {
    urls.push({ path: `/anime/${id}`, changefreq: 'weekly', priority: '0.8' })
  }
  if (!genres && !all) log(`Gagal ambil data dari ${apiUrl}, sitemap cuma berisi halaman utama.`)
  else log(`sitemap: ${animeIds.size} anime, ${genres?.genreList.length ?? 0} genre.`)
  return urls
}

export default function seoPlugin({ siteUrl, apiUrl }: Options): Plugin {
  const site = siteUrl?.replace(/\/+$/, '')
  const apiOrigin = apiUrl && /^https?:\/\//.test(apiUrl) ? new URL(apiUrl).origin : undefined

  return {
    name: 'animeku-seo',

    transformIndexHtml(html) {
      // og:image wajib alamat lengkap (Facebook/WhatsApp nggak mau path relatif)
      const out = site ? html.replace('content="/og-image.png"', `content="${site}/og-image.png"`) : html
      const tags = apiOrigin
        ? [
            { tag: 'link', attrs: { rel: 'preconnect', href: apiOrigin, crossorigin: '' }, injectTo: 'head' as const },
            { tag: 'link', attrs: { rel: 'dns-prefetch', href: apiOrigin }, injectTo: 'head' as const },
          ]
        : []
      return { html: out, tags }
    },

    async generateBundle() {
      const log = (msg: string) => this.info(msg)
      const robots = [
        'User-agent: *',
        'Allow: /',
        // halaman pribadi/pencarian udah noindex; nggak perlu di-crawl
        'Disallow: /koleksi',
        'Disallow: /riwayat',
        ...(site ? ['', `Sitemap: ${site}/sitemap.xml`] : []),
        '',
      ].join('\n')
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })

      if (!site) {
        this.warn('VITE_SITE_URL belum diisi: sitemap.xml nggak dibuat (butuh alamat lengkap web).')
        return
      }
      const urls = await collectUrls(apiUrl, log)
      const today = new Date().toISOString().slice(0, 10)
      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls.map(
          (u) =>
            `  <url><loc>${xmlEscape(site + u.path)}</loc><lastmod>${today}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`,
        ),
        '</urlset>',
        '',
      ].join('\n')
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: xml })
    },
  }
}
