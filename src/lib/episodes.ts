import type { EpisodeRef } from './api'

// "Nama Anime Episode 12 Subtitle Indonesia" -> 12
export function episodeNumber(title: string) {
  const match = title.match(/episode\s*(\d+(?:\.\d+)?)/i)
  return match ? Number(match[1]) : null
}

export function shortEpisodeLabel(title: string) {
  const n = episodeNumber(title)
  return n !== null ? `Episode ${n}` : title
}

// otakudesu biasanya ngurutin episode dari yang terbaru, kita balik jadi episode 1 duluan
export function sortEpisodesAsc(list: EpisodeRef[]) {
  const nums = list.map((e) => episodeNumber(e.title))
  if (nums.every((n) => n !== null)) {
    return [...list].sort((a, b) => episodeNumber(a.title)! - episodeNumber(b.title)!)
  }
  return [...list].reverse()
}
