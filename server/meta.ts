// Metadata tambahan dari luar, lewat server biar aman & bisa di-cache:
//
// - GET /_animeku/meta/ids/:anilistId
//     ID anime yang sama di situs lain (MAL, OtakOtaku, SilverYasha, TMDB, ...)
//     dari AnimeAPI (https://animeapi.my.id). animeapi nggak ngizinin dipanggil
//     langsung dari browser, makanya lewat sini.
// - GET /_animeku/meta/episodes/:anilistId?count=12
//     judul, sinopsis & gambar tiap episode dari TMDB. Butuh TMDB_API_KEY.
//     `count` = jumlah episode menurut AniList; kalau season di TMDB isinya
//     lebih banyak (mis. dua cour digabung), datanya nggak dipakai biar nomor
//     episodenya nggak meleset.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { clientIp, createCache, createLimiter, json, SERVER_PREFIX, type Next } from './http.ts'

const PREFIX = `${SERVER_PREFIX}/meta`
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w300'

export interface MetaOptions {
  /** API key (v3) atau Read Access Token (v4) TMDB. Kosong = data episode dimatiin. */
  tmdbKey?: string
  animeApiUrl?: string
  tmdbUrl?: string
}

/** Field AnimeAPI yang dipakai Animeku. */
export interface AnimeIds {
  title: string | null
  anilist: number | null
  myanimelist: number | null
  anidb: number | null
  animeplanet: string | null
  annict: number | null
  imdb: string | null
  kitsu: number | null
  livechart: number | null
  otakotaku: number | null
  shikimori: number | null
  silveryasha: number | null
  simkl: number | null
  themoviedb: number | null
  themoviedb_type: 'tv' | 'movie' | null
  themoviedb_season_id: number | null
  trakt: number | null
  trakt_type: 'shows' | 'movies' | null
  trakt_season: number | null
}

const ID_FIELDS: (keyof AnimeIds)[] = [
  'title', 'anilist', 'myanimelist', 'anidb', 'animeplanet', 'annict', 'imdb', 'kitsu', 'livechart', 'otakotaku',
  'shikimori', 'silveryasha', 'simkl', 'themoviedb', 'themoviedb_type', 'themoviedb_season_id', 'trakt',
  'trakt_type', 'trakt_season',
]

export interface TmdbEpisode {
  number: number
  name: string | null
  overview: string | null
  still: string | null
  airDate: string | null
}

interface TmdbSeason {
  episodes: { episode_number: number; name: string; overview: string; still_path: string | null; air_date: string | null }[]
}

class HttpError extends Error {
  status: number
  constructor(status: number) {
    super(`HTTP ${status}`)
    this.status = status
  }
}

/** TMDB ngisi judul yang belum diterjemahin pakai "Episode 5"; itu dianggap kosong. */
const realName = (name?: string | null) => (name && !/^(episode|episodio|épisode)\s*\d+$/i.test(name.trim()) ? name.trim() : null)

export function createMeta(options: MetaOptions = {}) {
  const animeApiUrl = (options.animeApiUrl || 'https://animeapi.my.id').replace(/\/+$/, '')
  const tmdbUrl = (options.tmdbUrl || 'https://api.themoviedb.org/3').replace(/\/+$/, '')
  const tmdbKey = options.tmdbKey ?? ''
  const allowed = createLimiter()
  const idsCache = createCache<AnimeIds | null>(24 * 3600_000)
  const episodesCache = createCache<TmdbEpisode[] | null>(12 * 3600_000)

  async function getJson<T>(url: string, headers: Record<string, string> = {}) {
    const res = await fetch(url, { headers: { accept: 'application/json', ...headers }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new HttpError(res.status)
    return (await res.json()) as T
  }

  function animeIds(anilistId: number) {
    return idsCache(String(anilistId), async () => {
      try {
        const raw = await getJson<Record<string, unknown>>(`${animeApiUrl}/anilist/${anilistId}`)
        return Object.fromEntries(ID_FIELDS.map((k) => [k, raw[k] ?? null])) as unknown as AnimeIds
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) return null
        throw error
      }
    })
  }

  function tmdb<T>(path: string, language: string) {
    // key v4 (token panjang "eyJ...") dikirim lewat header, key v3 lewat query
    const bearer = tmdbKey.startsWith('eyJ')
    const params = new URLSearchParams({ language, ...(bearer ? {} : { api_key: tmdbKey }) })
    return getJson<T>(`${tmdbUrl}${path}?${params}`, bearer ? { authorization: `Bearer ${tmdbKey}` } : {})
  }

  function tmdbEpisodes(anilistId: number, count: number | null) {
    return episodesCache(`${anilistId}:${count ?? ''}`, async () => {
      const ids = await animeIds(anilistId)
      if (!ids?.themoviedb || ids.themoviedb_type !== 'tv') return null
      const show = await tmdb<{ seasons: { id: number; season_number: number; episode_count: number }[] }>(
        `/tv/${ids.themoviedb}`,
        'id-ID',
      )
      const season =
        show.seasons.find((s) => s.id === ids.themoviedb_season_id) ??
        show.seasons.find((s) => ids.trakt_season !== null && s.season_number === ids.trakt_season)
      if (!season) return null
      if (count !== null && season.episode_count > count) return null

      const [id, en] = await Promise.all([
        tmdb<TmdbSeason>(`/tv/${ids.themoviedb}/season/${season.season_number}`, 'id-ID'),
        tmdb<TmdbSeason>(`/tv/${ids.themoviedb}/season/${season.season_number}`, 'en-US').catch(() => null),
      ])
      return id.episodes.map((e) => {
        const fallback = en?.episodes.find((x) => x.episode_number === e.episode_number)
        return {
          number: e.episode_number,
          name: realName(e.name) ?? realName(fallback?.name),
          overview: e.overview?.trim() || fallback?.overview?.trim() || null,
          still: e.still_path ? `${TMDB_IMAGE}${e.still_path}` : null,
          airDate: e.air_date || null,
        }
      })
    })
  }

  async function handle(req: IncomingMessage, res: ServerResponse, next: Next) {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (!url.pathname.startsWith(`${PREFIX}/`) || req.method !== 'GET') return next()
    if (!allowed(clientIp(req), 120, 60_000)) return json(res, 429, { message: 'Kebanyakan request.' })
    const cacheable = { 'cache-control': 'public, max-age=3600', 'access-control-allow-origin': '*' }

    const route = url.pathname.slice(PREFIX.length)
    const ids = route.match(/^\/ids\/(\d{1,9})$/)
    const episodes = route.match(/^\/episodes\/(\d{1,9})$/)
    try {
      if (ids) return json(res, 200, { ids: await animeIds(Number(ids[1])) }, cacheable)
      if (episodes) {
        if (!tmdbKey) return json(res, 200, { enabled: false, episodes: null }, cacheable)
        const count = Number(url.searchParams.get('count')) || null
        return json(res, 200, { enabled: true, episodes: await tmdbEpisodes(Number(episodes[1]), count) }, cacheable)
      }
      return json(res, 404, { message: 'Nggak ada.' })
    } catch (error) {
      console.error('[meta]', url.pathname, error instanceof Error ? error.message : error)
      return json(res, 502, { message: 'Sumber data lagi nggak bisa dihubungi.' })
    }
  }

  return { handle }
}
