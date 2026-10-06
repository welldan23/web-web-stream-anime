// Data SEO (judul, deskripsi, JSON-LD) buat tiap halaman.
// File ini sengaja nggak pakai apa pun dari browser/Vite, karena dipakai juga
// oleh fungsi server api/meta.ts buat nyuntik meta tag ke HTML.

export const SITE_NAME = 'Animeku'
export const DEFAULT_TITLE = 'Animeku – Nonton Anime Sub Indo Gratis'
export const DEFAULT_DESCRIPTION =
  'Nonton anime subtitle Indonesia gratis. Jadwal rilis anime ongoing tiap minggu, anime tamat, cari per genre, lengkap dengan pilihan server 360p, 480p, dan 720p.'
export const OG_IMAGE_PATH = '/og-image.png'

export type JsonLd = Record<string, unknown>

export interface PageMeta {
  /** Judul lengkap yang dipasang di <title>. */
  title: string
  description: string
  /** Path kanonik, mis. "/anime/one-piece" atau "/ongoing?page=2". */
  path: string
  image?: string
  type?: 'website' | 'video.tv_show' | 'video.episode'
  noindex?: boolean
  jsonLd?: JsonLd[]
}

export function pageTitle(title: string) {
  return `${title} – ${SITE_NAME}`
}

/** Potong teks di batas kata biar pas buat meta description (±155 karakter). */
export function truncate(text: string, max = 155) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, '')}…`
}

export function breadcrumb(siteUrl: string, items: { name: string; path: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  }
}

export function websiteJsonLd(siteUrl: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: `${siteUrl}/`,
    inLanguage: 'id-ID',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/cari?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }
}

// Bentuk data minimal yang dibutuhin (sebagian dari respons wajik-anime-api)
interface AnimeLike {
  title: string
  japanese?: string
  poster?: string
  status?: string
  type?: string
  episodes?: string
  studios?: string
  aired?: string
  synopsis?: { paragraphList: string[] }
  genreList?: { title: string }[]
}

interface EpisodeLike {
  title: string
  animeId: string
  releaseTime?: string
}

const genreText = (a: AnimeLike) => (a.genreList ?? []).map((g) => g.title).join(', ')

export function animeMeta(siteUrl: string, animeId: string, a: AnimeLike): PageMeta {
  const path = `/anime/${animeId}`
  const synopsis = (a.synopsis?.paragraphList ?? []).filter(Boolean).join(' ')
  const facts = [a.type, a.status, a.episodes && `${a.episodes} episode`, genreText(a)].filter(Boolean).join(' · ')
  const description = truncate(
    synopsis
      ? `Nonton ${a.title} sub Indo. ${synopsis}`
      : `Nonton ${a.title} subtitle Indonesia gratis. ${facts}.`,
  )
  const episodeCount = Number.parseInt(a.episodes ?? '', 10)

  return {
    title: pageTitle(`Nonton ${a.title} Sub Indo`),
    description,
    path,
    image: a.poster,
    type: 'video.tv_show',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'TVSeries',
        name: a.title,
        ...(a.japanese ? { alternateName: a.japanese } : {}),
        url: `${siteUrl}${path}`,
        ...(a.poster ? { image: a.poster } : {}),
        ...(synopsis ? { description: truncate(synopsis, 300) } : {}),
        ...(a.genreList?.length ? { genre: a.genreList.map((g) => g.title) } : {}),
        ...(Number.isFinite(episodeCount) ? { numberOfEpisodes: episodeCount } : {}),
        ...(a.studios ? { productionCompany: { '@type': 'Organization', name: a.studios } } : {}),
        inLanguage: 'ja',
        subtitleLanguage: 'id',
      },
      breadcrumb(siteUrl, [
        { name: 'Beranda', path: '/' },
        { name: a.title, path },
      ]),
    ],
  }
}

export function episodeMeta(
  siteUrl: string,
  episodeId: string,
  ep: EpisodeLike,
  anime?: { title: string; poster?: string },
): PageMeta {
  const path = `/nonton/${episodeId}`
  const match = ep.title.match(/episode\s*(\d+(?:\.\d+)?)/i)
  const number = match ? Number(match[1]) : undefined
  const seriesTitle = anime?.title ?? ep.title.replace(/\s*episode.*$/i, '')
  const shortTitle = number !== undefined ? `${seriesTitle} Episode ${number}` : ep.title

  return {
    title: pageTitle(`Nonton ${shortTitle} Sub Indo`),
    description: truncate(
      `Nonton ${shortTitle} subtitle Indonesia gratis${ep.releaseTime ? `, rilis ${ep.releaseTime}` : ''}. Pilih server 360p, 480p, atau 720p, plus link download.`,
    ),
    path,
    image: anime?.poster,
    type: 'video.episode',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'TVEpisode',
        name: shortTitle,
        url: `${siteUrl}${path}`,
        ...(number !== undefined ? { episodeNumber: number } : {}),
        partOfSeries: { '@type': 'TVSeries', name: seriesTitle, url: `${siteUrl}/anime/${ep.animeId}` },
        ...(anime?.poster ? { image: anime.poster } : {}),
        subtitleLanguage: 'id',
      },
      breadcrumb(siteUrl, [
        { name: 'Beranda', path: '/' },
        { name: seriesTitle, path: `/anime/${ep.animeId}` },
        { name: shortTitle, path },
      ]),
    ],
  }
}

const escapeAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** JSON aman buat ditaruh di dalam <script> (nggak bisa "kabur" lewat </script>). */
export const safeJson = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')

/** Meta tag sebagai teks HTML, buat disuntik server ke index.html. */
export function metaToHtml(siteUrl: string, m: PageMeta) {
  const url = `${siteUrl}${m.path}`
  const image = absolute(siteUrl, m.image ?? OG_IMAGE_PATH)
  const tags = [
    `<title data-seo>${escapeAttr(m.title)}</title>`,
    `<meta data-seo name="description" content="${escapeAttr(m.description)}" />`,
    `<link data-seo rel="canonical" href="${escapeAttr(url)}" />`,
    m.noindex ? `<meta data-seo name="robots" content="noindex, follow" />` : '',
    `<meta data-seo property="og:site_name" content="${SITE_NAME}" />`,
    `<meta data-seo property="og:locale" content="id_ID" />`,
    `<meta data-seo property="og:type" content="${m.type ?? 'website'}" />`,
    `<meta data-seo property="og:title" content="${escapeAttr(m.title)}" />`,
    `<meta data-seo property="og:description" content="${escapeAttr(m.description)}" />`,
    `<meta data-seo property="og:url" content="${escapeAttr(url)}" />`,
    `<meta data-seo property="og:image" content="${escapeAttr(image)}" />`,
    `<meta data-seo name="twitter:card" content="summary_large_image" />`,
    `<meta data-seo name="twitter:title" content="${escapeAttr(m.title)}" />`,
    `<meta data-seo name="twitter:description" content="${escapeAttr(m.description)}" />`,
    `<meta data-seo name="twitter:image" content="${escapeAttr(image)}" />`,
    ...(m.jsonLd ?? []).map((d) => `<script data-seo type="application/ld+json">${safeJson(d)}</script>`),
  ]
  return tags.filter(Boolean).join('\n    ')
}

export function absolute(siteUrl: string, pathOrUrl: string) {
  return /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : `${siteUrl}${pathOrUrl}`
}

/** Ganti blok <!--seo--> ... <!--/seo--> di index.html. */
export function injectMeta(html: string, metaHtml: string) {
  return html.replace(/<!--seo-->[\s\S]*?<!--\/seo-->/, `<!--seo-->\n    ${metaHtml}\n    <!--/seo-->`)
}

/** "one-piece-sub-indo" -> "One Piece" (judul sementara selagi data dimuat). */
export function titleFromSlug(slug: string) {
  return slug
    .replace(/-?(sub-indo|subtitle-indonesia)$/i, '')
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
