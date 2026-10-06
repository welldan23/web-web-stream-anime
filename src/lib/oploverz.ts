// Server cadangan dari Oploverz (lewat wajik-anime-api).
// Episode yang lagi dibuka dicariin di Oploverz: cari judulnya, pilih yang paling mirip,
// ambil episode dengan nomor yang sama, lalu ambil link player-nya (iframe).
import { getFrom } from './api'
import { bestTitleMatch, cleanTitle } from './anilist'

const TIMEOUT = 8000

interface OploSearchCard {
  title: string
  slug: string
}

interface OploAnimeDetails {
  title: string
  episodeList: { episode: string; title: string; href: string }[]
}

interface OploEpisodeDetails {
  streamingUrl: string
}

const num = (text: string) => {
  const m = text.match(/\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : null
}

/** "https://oploverz.am/one-piece-episode-12-subtitle-indonesia/" -> "one-piece-episode-12-subtitle-indonesia" */
function episodeSlug(href: string) {
  try {
    return new URL(href).pathname.replace(/^\/+|\/+$/g, '')
  } catch {
    return href.replace(/^\/+|\/+$/g, '')
  }
}

export interface BackupMatch {
  animeTitle: string
  url: string
}

/** `null` = nggak ketemu di Oploverz atau episode-nya nggak ada. */
export async function findOploverz(title: string, episode: number): Promise<BackupMatch | null> {
  const signal = AbortSignal.timeout(TIMEOUT)
  const base = cleanTitle(title)
  // judul tanpa embel-embel season sering lebih gampang ketemu di pencarian
  const queries = [...new Set([base, base.replace(/\s*(season|part|cour)\s*\d+.*$/i, '').trim()])].filter(Boolean)

  let anime: OploSearchCard | null = null
  for (const q of queries) {
    const res = await getFrom<{ animeList?: OploSearchCard[] }>('oploverz', '/search', { q }, { signal }).catch(() => null)
    anime = bestTitleMatch(res?.data.animeList ?? [], (a) => a.title, [title])
    if (anime) break
  }
  if (!anime?.slug) return null

  const details = await getFrom<{ details: OploAnimeDetails }>('oploverz', `/anime/${encodeURIComponent(anime.slug)}`, undefined, {
    signal,
  }).catch(() => null)
  const item = details?.data.details.episodeList.find((e) => num(e.episode) === episode)
  if (!item?.href) return null

  const ep = await getFrom<{ details: OploEpisodeDetails }>(
    'oploverz',
    `/episode/${encodeURIComponent(episodeSlug(item.href))}`,
    undefined,
    { signal },
  ).catch(() => null)
  const url = ep?.data.details.streamingUrl
  return url && /^https?:\/\//i.test(url) ? { animeTitle: details!.data.details.title || anime.title, url } : null
}
