// "Nama Anime Episode 12" -> 12
export function episodeNumber(title: string) {
  const match = title.match(/episode\s*(\d+(?:\.\d+)?)/i)
  return match ? Number(match[1]) : null
}

export function shortEpisodeLabel(title: string) {
  const n = episodeNumber(title)
  return n !== null ? `Episode ${n}` : title
}
