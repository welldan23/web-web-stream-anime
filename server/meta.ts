// Metadata tambahan dari luar, lewat server biar aman & bisa di-cache:
//
// - GET /_animeku/meta/ids/:anilistId
//     ID anime yang sama di situs lain (MAL, OtakOtaku, SilverYasha, TMDB, ...)
//     dari AnimeAPI (https://animeapi.my.id). animeapi nggak ngizinin dipanggil
//     langsung dari browser, makanya lewat sini.
// - GET /_animeku/meta/episodes/:anilistId
//     info tiap episode, digabung dari beberapa sumber gratis:
//       judul + tanda filler/recap  → Jikan (data MyAnimeList)
//       gambar                      → AniList (Crunchyroll dkk), lalu Kitsu
//       sinopsis                    → Kitsu
//       TMDB (kalau ada TMDB_API_KEY) dipakai duluan karena ada bahasa Indonesianya.
//     Sumber yang error/kosong dilewati aja.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { clientIp, createCache, createLimiter, json, SERVER_PREFIX, type Next } from './http.ts'

const PREFIX = `${SERVER_PREFIX}/meta`
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w300'
/** Jikan & Kitsu dibatasi segini halaman biar anime super panjang nggak bikin ratusan request. */
const JIKAN_MAX_PAGES = 15 // 100 episode per halaman
const KITSU_MAX_PAGES = 60 // 20 episode per halaman, diambil 5 halaman sekaligus

export interface MetaOptions {
  /** API key (v3) atau Read Access Token (v4) TMDB. Kosong = TMDB nggak dipakai. */
  tmdbKey?: string
  animeApiUrl?: string
  tmdbUrl?: string
  anilistUrl?: string
  jikanUrl?: string
  kitsuUrl?: string
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

export interface EpisodeInfo {
  number: number
  name: string | null
  overview: string | null
  still: string | null
  /** semua gambar yang ketemu, urut prioritas; dipakai kalau gambar pertama gagal dimuat */
  stills: string[]
  airDate: string | null
  filler: boolean
  recap: boolean
}

type EpisodePart = { [K in keyof EpisodeInfo]?: EpisodeInfo[K] | null }
type Source = 'tmdb' | 'jikan' | 'anilist' | 'kitsu'

class HttpError extends Error {
  status: number
  constructor(status: number) {
    super(`HTTP ${status}`)
    this.status = status
  }
}

/** "fetch failed" doang nggak jelas; ambil alasan aslinya (mis. ENOTFOUND, ECONNRESET, ETIMEDOUT). */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const cause = error.cause as { code?: string; message?: string } | undefined
  if (error.name === 'TimeoutError') return 'kelamaan (timeout)'
  if (cause && (cause.code || cause.message)) return `${error.message} (${[cause.code, cause.message].filter(Boolean).join(': ')})`
  return error.message
}

/** Semua sumber info episode gagal; nggak di-cache biar dicoba lagi nanti. */
class SourcesError extends Error {
  failed: string[]
  constructor(failed: string[]) {
    super('semua sumber info episode gagal')
    this.failed = failed
  }
}

/** Judul pengganti kayak "Episode 5" dianggap kosong. */
const realName = (name?: string | null) =>
  name && !/^(episode|episodio|épisode|ep\.?)\s*\d+$/i.test(name.trim()) ? name.trim() : null
const text = (s?: string | null) => s?.replace(/\s+/g, ' ').trim() || null
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function createMeta(options: MetaOptions = {}) {
  const base = (url: string | undefined, fallback: string) => (url || fallback).replace(/\/+$/, '')
  const animeApiUrl = base(options.animeApiUrl, 'https://animeapi.my.id')
  const tmdbUrl = base(options.tmdbUrl, 'https://api.themoviedb.org/3')
  const anilistUrl = base(options.anilistUrl, 'https://graphql.anilist.co')
  const jikanUrl = base(options.jikanUrl, 'https://api.jikan.moe/v4')
  const kitsuUrl = base(options.kitsuUrl, 'https://kitsu.app/api/edge')
  const tmdbKey = options.tmdbKey ?? ''
  const allowed = createLimiter()
  const idsCache = createCache<AnimeIds | null>(24 * 3600_000)
  // hasil lengkap disimpan 12 jam; kalau ada sumber yang error, cuma 20 menit biar cepet dicoba lagi
  const episodesCache = createCache<{ episodes: EpisodeInfo[]; sources: Source[]; failed: string[] }>((result) =>
    result.failed.length > 0 ? 20 * 60_000 : 12 * 3600_000,
  )

  async function getJson<T>(url: string, init: RequestInit = {}, timeoutMs = 10_000) {
    const res = await fetch(url, {
      ...init,
      headers: { accept: 'application/json', 'user-agent': 'Animeku/1.0', ...init.headers },
      signal: AbortSignal.timeout(timeoutMs),
    })
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

  // --- AniList: idMal, jumlah episode, judul & gambar dari situs streaming resmi ---
  async function anilist(anilistId: number) {
    const query = `query ($id: Int) { Media(id: $id, type: ANIME) { idMal episodes streamingEpisodes { title thumbnail } } }`
    const body = await getJson<{
      data: { Media: { idMal: number | null; episodes: number | null; streamingEpisodes: { title: string; thumbnail: string | null }[] } | null }
    }>(anilistUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables: { id: anilistId } }),
    })
    const media = body.data.Media
    const episodes = new Map<number, EpisodePart>()
    for (const item of media?.streamingEpisodes ?? []) {
      // biasanya "Episode 5 - Judulnya"
      const m = item.title.match(/^Episode\s+(\d+)\s*(?:[-–:]\s*(.*))?$/i)
      if (!m) continue
      episodes.set(Number(m[1]), { name: realName(m[2]), still: item.thumbnail })
    }
    return { malId: media?.idMal ?? null, count: media?.episodes ?? null, episodes }
  }

  // --- Jikan: judul + filler/recap. Batasnya ±3 request/detik, jadi antre satu-satu.
  // Jikan ngambil langsung dari MyAnimeList, jadi kadang lambat (>10 detik) atau 5xx; dicoba ulang. ---
  let jikanQueue: Promise<unknown> = Promise.resolve()
  function jikanGet<T>(path: string) {
    const run = jikanQueue.then(async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          return await getJson<T>(`${jikanUrl}${path}`, {}, 25_000)
        } catch (error) {
          const retryable =
            (error instanceof HttpError && (error.status === 429 || error.status >= 500)) ||
            (error instanceof Error && (error.name === 'TimeoutError' || error.message === 'fetch failed'))
          if (!retryable || attempt >= 2) throw error
          await sleep(2000 * (attempt + 1))
        }
      }
    })
    jikanQueue = run.catch(() => {}).then(() => sleep(400))
    return run
  }

  async function jikan(malId: number) {
    const episodes = new Map<number, EpisodePart>()
    for (let page = 1; page <= JIKAN_MAX_PAGES; page++) {
      const body = await jikanGet<{
        data: { mal_id: number; title: string | null; aired: string | null; filler: boolean; recap: boolean }[]
        pagination: { has_next_page: boolean }
      }>(`/anime/${malId}/episodes?page=${page}`)
      for (const e of body.data) {
        episodes.set(e.mal_id, {
          name: realName(e.title),
          airDate: e.aired?.slice(0, 10) ?? null,
          filler: e.filler,
          recap: e.recap,
        })
      }
      if (!body.pagination.has_next_page) break
    }
    return episodes
  }

  // --- Kitsu: sinopsis + gambar ---
  type KitsuPage = {
    data: {
      attributes: {
        number: number | null
        canonicalTitle: string | null
        titles: { en?: string; en_us?: string; en_jp?: string } | null
        synopsis: string | null
        airdate: string | null
        thumbnail: { original?: string } | null
      }
    }[]
    meta?: { count?: number }
  }

  async function kitsu(kitsuId: number) {
    const episodes = new Map<number, EpisodePart>()
    const page = (n: number) =>
      getJson<KitsuPage>(`${kitsuUrl}/anime/${kitsuId}/episodes?page[limit]=20&page[offset]=${n * 20}&sort=number`, {
        headers: { accept: 'application/vnd.api+json' },
      })
    const add = (body: KitsuPage) => {
      for (const { attributes: a } of body.data) {
        if (!a.number) continue
        episodes.set(a.number, {
          name: realName(a.canonicalTitle) ?? realName(a.titles?.en_us ?? a.titles?.en ?? a.titles?.en_jp),
          overview: text(a.synopsis),
          still: a.thumbnail?.original ?? null,
          airDate: a.airdate,
        })
      }
    }
    const first = await page(0)
    add(first)
    // halaman pertama ngasih tahu total episodenya; sisanya diambil 5 halaman sekaligus
    const pages = Math.min(Math.ceil((first.meta?.count ?? first.data.length) / 20), KITSU_MAX_PAGES)
    for (let start = 1; start < pages; start += 5) {
      const batch = Array.from({ length: Math.min(5, pages - start) }, (_, i) => page(start + i))
      for (const body of await Promise.all(batch)) add(body)
    }
    return episodes
  }

  // --- TMDB (opsional): satu season, nomornya harus cocok sama AniList ---
  function tmdb<T>(path: string, language: string) {
    // key v4 (token panjang "eyJ...") dikirim lewat header, key v3 lewat query
    const bearer = tmdbKey.startsWith('eyJ')
    const params = new URLSearchParams({ language, ...(bearer ? {} : { api_key: tmdbKey }) })
    return getJson<T>(`${tmdbUrl}${path}?${params}`, bearer ? { headers: { authorization: `Bearer ${tmdbKey}` } } : {})
  }

  type TmdbSeason = {
    episodes: { episode_number: number; name: string; overview: string; still_path: string | null; air_date: string | null }[]
  }

  async function tmdbEpisodes(ids: AnimeIds, count: number | null) {
    const episodes = new Map<number, EpisodePart>()
    if (!tmdbKey || !ids.themoviedb || ids.themoviedb_type !== 'tv') return episodes
    const show = await tmdb<{ seasons: { id: number; season_number: number; episode_count: number }[] }>(
      `/tv/${ids.themoviedb}`,
      'id-ID',
    )
    const season =
      show.seasons.find((s) => s.id === ids.themoviedb_season_id) ??
      show.seasons.find((s) => ids.trakt_season !== null && s.season_number === ids.trakt_season)
    // season di TMDB lebih panjang dari anime-nya (mis. dua cour digabung) → nomor bisa meleset, skip
    if (!season || (count !== null && season.episode_count > count)) return episodes
    const [id, en] = await Promise.all([
      tmdb<TmdbSeason>(`/tv/${ids.themoviedb}/season/${season.season_number}`, 'id-ID'),
      tmdb<TmdbSeason>(`/tv/${ids.themoviedb}/season/${season.season_number}`, 'en-US').catch(() => null),
    ])
    for (const e of id.episodes) {
      const fallback = en?.episodes.find((x) => x.episode_number === e.episode_number)
      episodes.set(e.episode_number, {
        name: realName(e.name) ?? realName(fallback?.name),
        overview: text(e.overview) ?? text(fallback?.overview),
        still: e.still_path ? `${TMDB_IMAGE}${e.still_path}` : null,
        airDate: e.air_date || null,
      })
    }
    return episodes
  }

  function episodeInfo(anilistId: number) {
    return episodesCache(String(anilistId), async () => {
      // sumber yang error dicatat biar gampang dicek: buka /_animeku/meta/episodes/<id> di browser
      const failed: string[] = []
      const fail = (name: string) => (error: unknown) => {
        failed.push(`${name}: ${describeError(error)}`)
        console.error(`[meta] ${name} ${anilistId}:`, describeError(error))
        return null
      }
      const [al, ids] = await Promise.all([anilist(anilistId).catch(fail('anilist')), animeIds(anilistId).catch(fail('animeapi'))])
      const malId = al?.malId ?? ids?.myanimelist ?? null
      const [fromTmdb, fromJikan, fromKitsu] = await Promise.all([
        ids ? tmdbEpisodes(ids, al?.count ?? null).catch(fail('tmdb')) : null,
        malId ? jikan(malId).catch(fail('jikan')) : null,
        ids?.kitsu ? kitsu(ids.kitsu).catch(fail('kitsu')) : null,
      ])

      // urutan = prioritas per kolom
      const layers: [Source, Map<number, EpisodePart> | null | undefined][] = [
        ['tmdb', fromTmdb],
        ['jikan', fromJikan],
        ['anilist', al?.episodes],
        ['kitsu', fromKitsu],
      ]
      const numbers = new Set(layers.flatMap(([, map]) => [...(map?.keys() ?? [])]))
      const used = new Set<Source>()
      const all = (n: number, key: 'still', order: Source[]) => {
        const found: string[] = []
        for (const source of order) {
          const value = layers.find(([s]) => s === source)?.[1]?.get(n)?.[key]
          if (value && !found.includes(value)) {
            used.add(source)
            found.push(value)
          }
        }
        return found
      }
      const pick = <K extends keyof EpisodeInfo>(n: number, key: K, order: Source[]) => {
        for (const source of order) {
          const value = layers.find(([s]) => s === source)?.[1]?.get(n)?.[key]
          if (value !== undefined && value !== null && value !== '') {
            used.add(source)
            return value as EpisodeInfo[K]
          }
        }
        return null
      }
      const episodes = [...numbers]
        .sort((a, b) => a - b)
        .map((n) => {
          // gambar Kitsu duluan: link Crunchyroll lama dari AniList banyak yang udah mati
          const stills = all(n, 'still', ['tmdb', 'kitsu', 'anilist'])
          return {
          number: n,
          name: pick(n, 'name', ['tmdb', 'jikan', 'anilist', 'kitsu']),
          overview: pick(n, 'overview', ['tmdb', 'kitsu']),
          still: stills[0] ?? null,
          stills,
          airDate: pick(n, 'airDate', ['tmdb', 'jikan', 'kitsu']),
          filler: pick(n, 'filler', ['jikan']) ?? false,
          recap: pick(n, 'recap', ['jikan']) ?? false,
          }
        })
      // semua sumber gagal (mis. internet VPS putus) → jangan di-cache kosong 12 jam
      if (episodes.length === 0 && failed.length > 0) throw new SourcesError(failed)
      return { episodes, sources: (['tmdb', 'jikan', 'anilist', 'kitsu'] as Source[]).filter((s) => used.has(s)), failed }
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
      if (episodes) return json(res, 200, await episodeInfo(Number(episodes[1])), cacheable)
      return json(res, 404, { message: 'Nggak ada.' })
    } catch (error) {
      console.error('[meta]', url.pathname, error instanceof Error ? error.message : error)
      const failed = error instanceof SourcesError ? error.failed : undefined
      return json(res, 502, { message: 'Sumber data lagi nggak bisa dihubungi.', failed })
    }
  }

  return { handle }
}
