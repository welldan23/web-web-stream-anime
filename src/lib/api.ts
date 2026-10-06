// Client buat wajik-anime-api (sumber: Kuramanime).
// Bentuk datanya ngikutin src/interfaces/kuramanime.interface.ts di repo API-nya.
//
// Di Kuramanime, satu anime dikenali pakai 2 bagian: animeId (angka) + animeSlug,
// jadi alamat halamannya /anime/:animeId/:animeSlug dan /nonton/:animeId/:animeSlug/:episode.

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')
const SOURCE = 'kuramanime'

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

export interface AnimeRef {
  title: string
  animeId: string
  animeSlug: string
}

export interface AnimeCard extends AnimeRef {
  poster: string
  type: string
  quality: string
  /** Teks kecil di poster, mis. "Ep 12 / 24" atau skor. */
  highlight: string
}

export interface EpisodeCard extends AnimeRef {
  episodeId: string
  poster: string
  type: string
  quality: string
  episodes: string
  totalEpisodes: string
}

export interface ScheduledCard extends AnimeRef {
  poster: string
  type: string
  quality: string
  day: string
  releaseTime: string
}

export interface Property {
  title: string
  propertyId: string
  propertyType?: string
}

export interface Home {
  ongoing: { episodeList: EpisodeCard[] }
  completed: { animeList: AnimeCard[] }
  movie: { animeList: AnimeCard[] }
}

export interface AnimeDetails extends AnimeRef {
  alternativeTitle: string
  poster: string
  synopsis: { paragraphList: string[] }
  episode: { first: number | null; last: number | null }
  episodes: string
  aired: string
  duration: string
  explicit: string
  score: string
  fans: string
  rating: string
  credit: string
  type: Property
  status: Property
  season: Property
  quality: Property
  country: Property
  source: Property
  genreList: Property[]
  themeList: Property[]
  demographicList: Property[]
  studioList: Property[]
  batchList: (AnimeRef & { batchId: string })[]
  similarAnimeList: AnimeRef[]
}

export interface VideoQuality {
  title: string
  size?: string
  urlList?: { title: string; url: string }[]
}

export interface EpisodeDetails {
  /** Judul anime. */
  title: string
  /** Judul episode, mis. "Episode 5". */
  episodeTitle: string
  animeId: string
  animeSlug: string
  lastUpdated: string
  hasPrevEpisode: boolean
  prevEpisode: { episodeId: string } | null
  hasNextEpisode: boolean
  nextEpisode: { episodeId: string } | null
  server: { qualityList: VideoQuality[] }
  download: { qualityList: VideoQuality[] }
}

export type SortKey = 'popular' | 'latest' | 'updated' | 'a-z' | 'z-a' | 'most_viewed' | 'oldest'
export type ScheduleDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | 'all'

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

function get<T>(path: string, params?: Params, init?: RequestInit) {
  return getFrom<T>(SOURCE, path, params, init)
}

const seg = encodeURIComponent

export const api = {
  home: () => get<Home>('/home').then((r) => r.data),
  /** Daftar anime: cari, filter status (ongoing/completed/movie), urutan, halaman. */
  animes: (opts: { search?: string; status?: 'ongoing' | 'completed' | 'movie'; sort?: SortKey; page?: number }) =>
    get<{ animeList?: AnimeCard[]; episodeList?: EpisodeCard[] }>('/anime', opts),
  schedule: (day: ScheduleDay, page = 1) =>
    get<{ animeList: ScheduledCard[] }>('/schedule', { day, page }),
  properties: (type: 'genre' | 'season' | 'studio' | 'type') =>
    get<{ propertyList: Property[] }>(`/properties/${type}`).then((r) => r.data.propertyList),
  byProperty: (type: string, id: string, opts: { sort?: SortKey; page?: number }) =>
    get<{ animeList: AnimeCard[] }>(`/properties/${seg(type)}/${seg(id)}`, opts),
  anime: (animeId: string, slug: string) =>
    get<{ details: AnimeDetails }>(`/anime/${seg(animeId)}/${seg(slug)}`).then((r) => r.data.details),
  episode: (animeId: string, slug: string, episode: string | number) =>
    get<{ details: EpisodeDetails }>(`/episode/${seg(animeId)}/${seg(slug)}/${seg(String(episode))}`).then(
      (r) => r.data.details,
    ),
}

// ---------- Alamat halaman ----------

/** Kunci unik satu anime: "123/one-piece" (dipakai di koleksi, riwayat, cache). */
export const animeKey = (a: Pick<AnimeRef, 'animeId' | 'animeSlug'>) => `${a.animeId}/${a.animeSlug}`
export const animePath = (a: Pick<AnimeRef, 'animeId' | 'animeSlug'>) => `/anime/${animeKey(a)}`
export const episodeKey = (a: Pick<AnimeRef, 'animeId' | 'animeSlug'>, episode: string | number) =>
  `${animeKey(a)}/${episode}`
export const episodePath = (a: Pick<AnimeRef, 'animeId' | 'animeSlug'>, episode: string | number) =>
  `/nonton/${episodeKey(a, episode)}`

/** Daftar nomor episode dari info "episode pertama & terakhir". */
export function episodeRange(details: Pick<AnimeDetails, 'episode'>) {
  const first = details.episode.first ?? 1
  const last = Math.max(first, details.episode.last ?? first)
  return Array.from({ length: last - first + 1 }, (_, i) => first + i)
}
