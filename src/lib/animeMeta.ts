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

/** Info tiap episode, digabung dari TMDB, MyAnimeList, AniList & Kitsu di server. */
export const getEpisodeInfo = (anilistId: number) =>
  get<{ episodes: EpisodeInfo[]; sources: EpisodeSource[] }>(`/episodes/${anilistId}`)

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
