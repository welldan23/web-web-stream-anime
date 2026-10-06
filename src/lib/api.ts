// Client buat wajik-anime-api (sumber: otakudesu).
// Bentuk datanya ngikutin src/interfaces/otakudesu.interface.ts di repo API-nya.

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')
const SOURCE = 'otakudesu'

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

export interface Genre {
  title: string
  genreId: string
}

export interface EpisodeRef {
  title: string
  episodeId: string
}

export interface AnimeRef {
  title: string
  animeId: string
}

export interface OngoingAnime extends AnimeRef {
  poster: string
  episodes: string
  releaseDay: string
  latestReleaseDate: string
}

export interface CompletedAnime extends AnimeRef {
  poster: string
  episodes: string
  score: string
  lastReleaseDate: string
}

export interface SearchedAnime extends AnimeRef {
  poster: string
  status: string
  score: string
  genreList: Genre[]
}

export interface GenreAnime extends AnimeRef {
  poster: string
  studios: string
  score: string
  episodes: string
  season: string
  synopsis: { paragraphList: string[] }
  genreList: Genre[]
}

export interface Home {
  ongoing: { animeList: OngoingAnime[] }
  completed: { animeList: CompletedAnime[] }
}

export interface ScheduleDay {
  title: string
  animeList: AnimeRef[]
}

export interface AnimeCollection {
  startWith: string
  animeList: AnimeRef[]
}

export interface AnimeDetails {
  title: string
  japanese: string
  score: string
  producers: string
  type: string
  status: string
  episodes: string
  duration: string
  aired: string
  studios: string
  poster: string
  synopsis: { paragraphList: string[] }
  batch: { title: string; batchId: string } | null
  genreList: Genre[]
  episodeList: EpisodeRef[]
  recommendedAnimeList: (AnimeRef & { poster: string })[]
}

export interface Server {
  title: string
  serverId: string
}

export interface Quality {
  title: string
  size?: string
  urlList?: { title: string; url: string }[]
  serverList?: Server[]
}

export interface EpisodeDetails {
  title: string
  animeId: string
  releaseTime: string
  defaultStreamingUrl: string
  hasPrevEpisode: boolean
  prevEpisode: EpisodeRef | null
  hasNextEpisode: boolean
  nextEpisode: EpisodeRef | null
  server: { qualityList: Quality[] }
  download: { qualityList: Quality[] }
  info: {
    credit: string
    encoder: string
    duration: string
    type: string
    genreList: Genre[]
    episodeList: EpisodeRef[]
  }
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Params = Record<string, string | number | undefined>

/** Ambil data dari salah satu sumber wajik-anime-api (otakudesu, oploverz, ...). */
export async function getFrom<T>(
  source: string,
  path: string,
  params?: Params,
  init?: RequestInit,
) {
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

export const api = {
  home: () => get<Home>('/home').then((r) => r.data),
  schedule: () => get<{ scheduleList: ScheduleDay[] }>('/schedule').then((r) => r.data.scheduleList),
  allAnime: () => get<{ list: AnimeCollection[] }>('/anime').then((r) => r.data.list),
  genres: () => get<{ genreList: Genre[] }>('/genre').then((r) => r.data.genreList),
  ongoing: (page: number) => get<{ animeList: OngoingAnime[] }>('/ongoing', { page }),
  completed: (page: number) => get<{ animeList: CompletedAnime[] }>('/completed', { page }),
  search: (q: string) => get<{ animeList: SearchedAnime[] }>('/search', { q }).then((r) => r.data.animeList),
  byGenre: (genreId: string, page: number) =>
    get<{ animeList: GenreAnime[] }>(`/genre/${encodeURIComponent(genreId)}`, { page }),
  anime: (animeId: string) =>
    get<{ details: AnimeDetails }>(`/anime/${encodeURIComponent(animeId)}`).then((r) => r.data.details),
  episode: (episodeId: string) =>
    get<{ details: EpisodeDetails }>(`/episode/${encodeURIComponent(episodeId)}`).then((r) => r.data.details),
  server: (serverId: string) =>
    get<{ details: { url: string } }>(`/server/${encodeURIComponent(serverId)}`).then((r) => r.data.details.url),
}
