// Data tambahan lewat server Animeku (server/meta.ts):
// ID anime di situs lain (AnimeAPI) dan info tiap episode (TMDB, MyAnimeList, AniList, Kitsu).
// Kalau server-nya nggak ada (mis. deploy Vercel) atau sumbernya error,
// semua fungsi di sini balikin null dan halaman tetap jalan tanpa data ini.
import { SERVER_URL } from './server'

export interface AnimeIds {
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
  trakt: number | null
  trakt_type: 'shows' | 'movies' | null
}

export interface EpisodeInfo {
  number: number
  name: string | null
  overview: string | null
  still: string | null
  /** semua gambar yang ketemu (urut prioritas), buat cadangan kalau yang pertama gagal dimuat */
  stills?: string[]
  airDate: string | null
  /** episode filler (cerita di luar manga) / recap (rangkuman), dari MyAnimeList */
  filler: boolean
  recap: boolean
}

export type EpisodeSource = 'tmdb' | 'jikan' | 'anilist' | 'kitsu'

export const SOURCE_LABEL: Record<EpisodeSource, string> = {
  tmdb: 'TMDB',
  jikan: 'MyAnimeList (Jikan)',
  anilist: 'AniList',
  kitsu: 'Kitsu',
}

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${SERVER_URL}/meta${path}`)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export const getAnimeIds = (anilistId: number) =>
  get<{ ids: AnimeIds | null }>(`/ids/${anilistId}`).then((r) => r?.ids ?? null)

export interface EpisodeInfoResult {
  episodes: EpisodeInfo[]
  sources: EpisodeSource[]
  /** sumber yang gagal di server, mis. "jikan: fetch failed (ETIMEDOUT)" */
  failed?: string[]
  malId?: number | null
}

/** Info tiap episode, digabung dari TMDB, MyAnimeList, AniList & Kitsu di server. */
export const getEpisodeInfo = (anilistId: number) => get<EpisodeInfoResult>(`/episodes/${anilistId}`)

const JIKAN_URL = 'https://api.jikan.moe/v4'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export type JikanEpisode = { number: number; name: string | null; airDate: string | null; filler: boolean; recap: boolean }

/**
 * Cadangan: ambil judul + filler/recap langsung dari Jikan lewat browser,
 * dipakai kalau server nggak bisa nyambung ke Jikan (mis. IP VPS diblokir).
 */
export async function getJikanEpisodes(malId: number): Promise<JikanEpisode[] | null> {
  const out: JikanEpisode[] = []
  for (let page = 1; page <= 15; page++) {
    let body: {
      data: { mal_id: number; title: string | null; aired: string | null; filler: boolean; recap: boolean }[]
      pagination: { has_next_page: boolean }
    } | null = null
    for (let attempt = 0; attempt < 3 && !body; attempt++) {
      try {
        const res = await fetch(`${JIKAN_URL}/anime/${malId}/episodes?page=${page}`)
        if (res.ok) body = await res.json()
        else if (res.status !== 429 && res.status < 500) return out.length ? out : null
      } catch {
        // jaringan putus sebentar, coba lagi
      }
      if (!body) await sleep(1500 * (attempt + 1))
    }
    if (!body) return out.length ? out : null
    for (const e of body.data) {
      out.push({
        number: e.mal_id,
        name: e.title && !/^episode\s*\d+$/i.test(e.title.trim()) ? e.title.trim() : null,
        airDate: e.aired?.slice(0, 10) ?? null,
        filler: e.filler,
        recap: e.recap,
      })
    }
    if (!body.pagination.has_next_page) break
    await sleep(400) // batas Jikan ±3 request/detik
  }
  return out
}

/** Gabungin data Jikan dari browser ke hasil server (judul cuma ngisi yang kosong). */
export function mergeJikan(info: EpisodeInfoResult, jikan: JikanEpisode[]): EpisodeInfoResult {
  const byNumber = new Map(info.episodes.map((e) => [e.number, e]))
  for (const j of jikan) {
    const e = byNumber.get(j.number)
    if (e) {
      byNumber.set(j.number, { ...e, name: e.name ?? j.name, airDate: e.airDate ?? j.airDate, filler: j.filler, recap: j.recap })
    } else {
      byNumber.set(j.number, { number: j.number, name: j.name, overview: null, still: null, stills: [], airDate: j.airDate, filler: j.filler, recap: j.recap })
    }
  }
  const sources: EpisodeSource[] = info.sources.includes('jikan') ? info.sources : ['jikan', ...info.sources]
  return { ...info, episodes: [...byNumber.values()].sort((a, b) => a.number - b.number), sources }
}

export interface SiteLink {
  label: string
  href: string
  /** database anime Indonesia */
  local?: boolean
}

/** Link ke situs database lain (MAL & AniList udah ditampilin terpisah). */
export function databaseLinks(ids: AnimeIds): SiteLink[] {
  const links: (SiteLink | false | 0 | '' | null)[] = [
    ids.otakotaku && { label: 'OtakOtaku', href: `https://otakotaku.com/anime/view/${ids.otakotaku}`, local: true },
    ids.silveryasha && { label: 'SilverYasha', href: `https://db.silveryasha.id/anime/${ids.silveryasha}`, local: true },
    ids.kitsu && { label: 'Kitsu', href: `https://kitsu.app/anime/${ids.kitsu}` },
    ids.anidb && { label: 'AniDB', href: `https://anidb.net/anime/${ids.anidb}` },
    ids.animeplanet && { label: 'Anime-Planet', href: `https://www.anime-planet.com/anime/${ids.animeplanet}` },
    ids.livechart && { label: 'LiveChart', href: `https://www.livechart.me/anime/${ids.livechart}` },
    ids.shikimori && { label: 'Shikimori', href: `https://shikimori.io/animes/${ids.shikimori}` },
    ids.simkl && { label: 'Simkl', href: `https://simkl.com/anime/${ids.simkl}` },
    ids.annict && { label: 'Annict', href: `https://annict.com/works/${ids.annict}` },
    ids.themoviedb &&
      ids.themoviedb_type && { label: 'TMDB', href: `https://www.themoviedb.org/${ids.themoviedb_type}/${ids.themoviedb}` },
    ids.imdb && { label: 'IMDb', href: `https://www.imdb.com/title/${ids.imdb}` },
    ids.trakt && ids.trakt_type && { label: 'Trakt', href: `https://trakt.tv/${ids.trakt_type}/${ids.trakt}` },
  ]
  return links.filter((l): l is SiteLink => Boolean(l))
}
