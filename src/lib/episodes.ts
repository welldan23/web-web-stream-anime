import type { EpisodeRef } from './api'

// "Nama Anime Episode 12 Subtitle Indonesia" -> 12
// Buat anime panjang (mis. One Piece) otakudesu kadang cuma nulis angkanya: "1180" -> 1180
export function episodeNumber(title: string) {
  const match = title.match(/episode\s*(\d+(?:\.\d+)?)/i) ?? title.match(/^\s*(\d+(?:\.\d+)?)\s*$/)
  return match ? Number(match[1]) : null
}

export function shortEpisodeLabel(title: string) {
  const n = episodeNumber(title)
  return n !== null ? `Episode ${n}` : title
}

/** Entri pemisah di daftar episode otakudesu (mis. "pembatas-episode-episode-1-900-dalam-proses"), bukan episode. */
const isSeparator = (e: EpisodeRef) => /pembatas/i.test(e.episodeId) || /pembatas/i.test(e.title)

// otakudesu biasanya ngurutin episode dari yang terbaru, kita balik jadi episode 1 duluan
export function sortEpisodesAsc(all: EpisodeRef[]) {
  const list = all.filter((e) => !isSeparator(e))
  const nums = list.map((e) => episodeNumber(e.title))
  if (nums.every((n) => n !== null)) {
    return [...list].sort((a, b) => episodeNumber(a.title)! - episodeNumber(b.title)!)
  }
  return [...list].reverse()
}
