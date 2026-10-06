// Server "bebas iklan": link video langsung dari Kuramanime (lewat wajik-anime-api).
// Kuramanime ngasih file video (kuramadrive) per kualitas, jadi bisa diputar pakai
// <video> sendiri tanpa iframe orang lain → tanpa iklan & pop-up.
//
// Belum tentu selalu jalan: link-nya bisa kosong (kalau Kuramanime ngisi player pakai JS)
// atau ditolak (kalau dikunci cuma buat situs mereka). Makanya semua gagal = disembunyiin
// dan halaman nonton balik ke server otakudesu.
import { getFrom } from './api'

/**
 * Dimatiin dulu: Kuramanime (v20.kuramanime.ing) nolak wajik dengan 403 (Cloudflare).
 * Kalau nanti udah bisa diakses lagi dari server, ganti jadi `true` biar server
 * bebas iklan nyala lagi.
 */
export const KURAMANIME_ENABLED = false
import { bestTitleMatch, cleanTitle } from './anilist'

interface KuraAnimeCard {
  title: string
  animeId: string
  animeSlug: string
}

interface KuraEpisodeDetails {
  title: string
  server: { qualityList: { title: string; urlList?: { title: string; url: string }[] }[] }
}

export interface DirectSource {
  /** Label kualitas, mis. "720p". */
  quality: string
  url: string
}

export interface DirectMatch {
  animeTitle: string
  sources: DirectSource[]
}

const TIMEOUT = 8000

/** "720" -> "720p", "720p" -> "720p", "HD" -> "HD" */
function qualityLabel(raw: string) {
  const t = raw.trim()
  return /^\d+$/.test(t) ? `${t}p` : t || 'Video'
}

const qualityValue = (q: string) => Number.parseInt(q, 10) || 0

/**
 * Cari episode yang sama di Kuramanime: cari judulnya, pilih yang paling mirip,
 * lalu ambil link video episode ke-`episode`. `null` = nggak ketemu / nggak ada link.
 */
export async function findDirectSources(title: string, episode: number): Promise<DirectMatch | null> {
  const signal = AbortSignal.timeout(TIMEOUT)
  const names = [title]
  const base = cleanTitle(title)
  // judul tanpa embel-embel season sering lebih gampang ketemu di pencarian
  const queries = [...new Set([base, base.replace(/\s*(season|part|cour)\s*\d+.*$/i, '').trim()])].filter(Boolean)

  let anime: KuraAnimeCard | null = null
  for (const q of queries) {
    const res = await getFrom<{ animeList?: KuraAnimeCard[] }>('kuramanime', '/anime', { search: q }, { signal }).catch(
      () => null,
    )
    anime = bestTitleMatch(res?.data.animeList ?? [], (a) => a.title, names)
    if (anime) break
  }
  if (!anime) return null

  const path = `/episode/${encodeURIComponent(anime.animeId)}/${encodeURIComponent(anime.animeSlug)}/${episode}`
  const ep = await getFrom<{ details: KuraEpisodeDetails }>('kuramanime', path, undefined, { signal }).catch(() => null)
  const sources = (ep?.data.details.server.qualityList ?? [])
    .flatMap((q) => (q.urlList ?? []).map((u) => ({ quality: qualityLabel(q.title), url: u.url })))
    .filter((s) => /^https?:\/\//i.test(s.url))
    .sort((a, b) => qualityValue(b.quality) - qualityValue(a.quality))

  // buang kualitas dobel (ambil link pertama tiap kualitas)
  const unique = sources.filter((s, i) => sources.findIndex((x) => x.quality === s.quality) === i)
  return unique.length ? { animeTitle: anime.title, sources: unique } : null
}


// ---------- Kualitas pilihan ----------

const QUALITY_KEY = 'animeku:direct-quality'

export function preferredQuality(sources: DirectSource[]) {
  try {
    const saved = localStorage.getItem(QUALITY_KEY)
    if (saved && sources.some((s) => s.quality === saved)) return saved
  } catch {
    // abaikan
  }
  return sources[0]?.quality
}

export function rememberQuality(quality: string) {
  try {
    localStorage.setItem(QUALITY_KEY, quality)
  } catch {
    // abaikan
  }
}

// ---------- Posisi nonton (lanjut dari menit terakhir) ----------

const POS_KEY = 'animeku:positions'
const MAX_POSITIONS = 200

function readPositions(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(POS_KEY) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

export function getPosition(episodeId: string) {
  return readPositions()[episodeId] ?? 0
}

export function savePosition(episodeId: string, seconds: number) {
  try {
    const all = readPositions()
    delete all[episodeId]
    all[episodeId] = Math.floor(seconds)
    // simpan yang terbaru aja biar localStorage nggak penuh
    const entries = Object.entries(all).slice(-MAX_POSITIONS)
    localStorage.setItem(POS_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    // abaikan
  }
}
