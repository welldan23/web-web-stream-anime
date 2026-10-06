// Client buat wajik-anime-api (sumber: Oploverz).
// Bentuk data mentahnya ngikutin src/interfaces/oploverz.interface.ts di repo API-nya,
// lalu dirapihin di sini jadi bentuk yang dipakai halaman-halaman Animeku.
//
// ID anime = slug di oploverz.am/anime/{slug}/
// ID episode = slug halaman episode, mis. "one-piece-episode-1100-subtitle-indonesia"

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')
const SOURCE = 'oploverz'

export interface Pagination {
  currentPage: number | null
  prevPage: number | null
  hasPrevPage: boolean
  nextPage: number | null
  hasNextPage: boolean
  totalPages: number | null
}

interface Payload<T> {
  statusCode: number
  statusMessage: string
  message: string
  data: T | null
  pagination: Pagination | null
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Params = Record<string, string | number | undefined>

/** Ambil data dari salah satu sumber wajik-anime-api. */
export async function getFrom<T>(source: string, path: string, params?: Params, init?: RequestInit) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  const qs = query.toString()
  const res = await fetch(`${API_URL}/${source}${path}${qs ? `?${qs}` : ''}`, init)

  let body: Payload<T> | null = null
  try {
    body = (await res.json()) as Payload<T>
  } catch {
    // respons bukan JSON (biasanya API belum jalan)
  }

  if (!res.ok || !body || !body.data) {
    const status = body?.statusCode ?? res.status
    throw new ApiError(status, body?.message || body?.statusMessage || res.statusText || 'Gagal memuat data')
  }

  return { data: body.data, pagination: body.pagination }
}

function get<T>(path: string, params?: Params) {
  return getFrom<T>(SOURCE, path, params)
}

/** Oploverz balas 404 kalau hasil pencarian/filter kosong; anggap aja daftar kosong. */
function emptyOn404<T>(fallback: T) {
  return (error: unknown) => {
    if (error instanceof ApiError && error.status === 404) return fallback
    throw error
  }
}

// ---------- Bentuk data mentah dari wajik ----------

interface RawSearchCard {
  title: string
  poster: string
  type: string
  status: string
  slug: string
  href: string
}
interface RawPopularCard {
  title: string
  poster: string
  type: string
  episode: string
  seriesName: string
  href: string
}
interface RawLatestCard extends RawPopularCard {
  status: string
  score: string
  genres: string[]
  releaseTime: string
}
interface RawScheduleCard {
  title: string
  poster: string
  slug: string
  href: string
  day: string
  status: string
  episode: string
}
interface RawEpisodeItem {
  episode: string
  title: string
  date: string
  href: string
}
interface RawAnimeDetails {
  title: string
  poster: string
  status: string
  studio: string
  duration: string
  season: string
  type: string
  rating: string
  releasedOn: string
  updatedOn: string
  synopsis: { paragraphList: string[] }
  genres: string[]
  episodeList: RawEpisodeItem[]
}
interface RawFormat {
  title: string
  qualityList: { title: string; size?: string; urlList?: { title: string; url: string }[] }[]
}
interface RawEpisodeDetails {
  title: string
  episodeNumber: string
  seriesName: string
  seriesSlug: string
  streamingUrl: string
  releasedOn: string
  download: RawFormat[]
}

// ---------- Bentuk data buat halaman ----------

/** Satu kartu anime/episode yang bisa diklik. */
export interface CardItem {
  /** Alamat tujuan di Animeku: /anime/{slug} atau /nonton/{slug-episode}. */
  to: string
  title: string
  poster?: string
  /** Label kecil di poster, mis. "Ep 12". */
  label?: string
  meta?: string
  /** Slug anime kalau kartunya ngarah ke halaman anime. */
  animeId?: string
}

export interface EpisodeItem {
  episodeId: string
  number: number | null
  title: string
  date: string
}

export interface AnimeDetails {
  animeId: string
  title: string
  poster: string
  status: string
  studio: string
  duration: string
  season: string
  type: string
  score: string
  releasedOn: string
  updatedOn: string
  synopsis: string[]
  genres: string[]
  /** Urut dari episode pertama. */
  episodeList: EpisodeItem[]
}

export interface DownloadGroup {
  title: string
  qualityList: { title: string; size?: string; urlList: { title: string; url: string }[] }[]
}

export interface EpisodeDetails {
  episodeId: string
  title: string
  number: number | null
  animeId: string
  animeTitle: string
  streamingUrl: string
  releasedOn: string
  downloads: DownloadGroup[]
}

export interface ScheduleDay {
  day: string
  animeList: CardItem[]
}

export interface AzSection {
  letter: string
  animeList: { title: string; animeId: string }[]
}

// ---------- Konversi ----------

/** Ambil bagian path dari link oploverz: "https://oploverz.am/abc/" -> "abc". */
function pathOf(href: string) {
  try {
    return new URL(href).pathname.replace(/^\/+|\/+$/g, '')
  } catch {
    return href.replace(/^\/+|\/+$/g, '')
  }
}

/** Link oploverz -> alamat di Animeku (halaman anime atau halaman nonton). */
export function linkTo(href: string) {
  const path = pathOf(href)
  if (path.startsWith('anime/')) return `/anime/${path.slice('anime/'.length).split('/')[0]}`
  return `/nonton/${path}`
}

const num = (text: string) => {
  const m = text.match(/\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : null
}

/** "Ep 12" / "12" / "Episode 12" -> "Ep 12" */
function epLabel(text: string) {
  const n = num(text)
  return n !== null ? `Ep ${n}` : text || undefined
}

const searchCard = (a: RawSearchCard): CardItem => ({
  to: `/anime/${a.slug}`,
  animeId: a.slug,
  title: a.title,
  poster: a.poster,
  label: a.status || undefined,
  meta: a.type,
})

function toEpisodes(list: RawEpisodeItem[]): EpisodeItem[] {
  const items = list.map((e) => ({ episodeId: pathOf(e.href), number: num(e.episode), title: e.title, date: e.date }))
  // oploverz ngurutin dari yang terbaru; balik jadi episode pertama duluan
  const allNumbered = items.every((e) => e.number !== null)
  return allNumbered ? [...items].sort((a, b) => a.number! - b.number!) : [...items].reverse()
}

// ---------- API ----------

export type OploStatus = 'ongoing' | 'completed'
export type OploType = 'tv' | 'movie' | 'ova' | 'ona' | 'special'
export type OploOrder = 'update' | 'latest' | 'popular' | 'title' | 'titlereverse'

export const api = {
  home: () =>
    get<{ popularToday: { animeList: RawPopularCard[] }; latestRelease: { animeList: RawLatestCard[] } }>('/home').then(
      ({ data }) => ({
        popular: data.popularToday.animeList.map(
          (a): CardItem => ({
            to: linkTo(a.href),
            title: a.seriesName || a.title,
            poster: a.poster,
            label: epLabel(a.episode),
            meta: a.type,
          }),
        ),
        latest: data.latestRelease.animeList.map(
          (a): CardItem => ({
            to: linkTo(a.href),
            title: a.seriesName || a.title,
            poster: a.poster,
            label: epLabel(a.episode),
            meta: [a.releaseTime, a.status].filter(Boolean).join(' · '),
          }),
        ),
      }),
    ),

  /** Daftar anime pakai filter (cuma halaman pertama dari Oploverz). */
  filter: (opts: { status?: OploStatus; type?: OploType; genre?: string; order?: OploOrder }) =>
    get<{ animeList: RawSearchCard[] }>('/anime', opts)
      .then(({ data }) => data.animeList.map(searchCard))
      .catch(emptyOn404([] as CardItem[])),

  /** Daftar semua anime A–Z. */
  directory: () =>
    get<{ sectionList: { letter: string; animeList: { title: string; slug: string }[] }[] }>('/anime').then(
      ({ data }): AzSection[] =>
        data.sectionList.map((s) => ({
          letter: s.letter.trim(),
          animeList: s.animeList.filter((a) => a.slug).map((a) => ({ title: a.title, animeId: a.slug })),
        })),
    ),

  search: (q: string) =>
    get<{ animeList: RawSearchCard[] }>('/search', { q: q.slice(0, 50) })
      .then(({ data }) => data.animeList.map(searchCard))
      .catch(emptyOn404([] as CardItem[])),

  schedule: () =>
    get<{ scheduleList: { day: string; animeList: RawScheduleCard[] }[] }>('/schedule').then(({ data }) =>
      data.scheduleList.map(
        (d): ScheduleDay => ({
          day: d.day,
          animeList: d.animeList.map((a) => ({
            to: a.slug ? `/anime/${a.slug}` : linkTo(a.href),
            animeId: a.slug || undefined,
            title: a.title,
            poster: a.poster,
            label: epLabel(a.episode),
            meta: a.status,
          })),
        }),
      ),
    ),

  anime: (animeId: string) =>
    get<{ details: RawAnimeDetails }>(`/anime/${encodeURIComponent(animeId)}`).then(
      ({ data: { details: d } }): AnimeDetails => ({
        animeId,
        title: d.title,
        poster: d.poster,
        status: d.status,
        studio: d.studio,
        duration: d.duration,
        season: d.season,
        type: d.type,
        score: d.rating,
        releasedOn: d.releasedOn,
        updatedOn: d.updatedOn,
        synopsis: d.synopsis.paragraphList.map((p) => p.trim()).filter(Boolean),
        genres: d.genres,
        episodeList: toEpisodes(d.episodeList),
      }),
    ),

  episode: (episodeId: string) =>
    get<{ details: RawEpisodeDetails }>(`/episode/${encodeURIComponent(episodeId)}`).then(
      ({ data: { details: d } }): EpisodeDetails => ({
        episodeId,
        title: d.title,
        number: num(d.episodeNumber) ?? num(d.title.match(/episode\s*\d+(?:\.\d+)?/i)?.[0] ?? ''),
        animeId: d.seriesSlug,
        animeTitle: d.seriesName,
        streamingUrl: d.streamingUrl,
        releasedOn: d.releasedOn,
        downloads: d.download.map((f) => ({
          title: f.title,
          qualityList: f.qualityList
            .map((q) => ({ title: q.title, size: q.size, urlList: q.urlList ?? [] }))
            .filter((q) => q.urlList.length > 0),
        })),
      }),
    ),
}

export { GENRES } from './genres'
