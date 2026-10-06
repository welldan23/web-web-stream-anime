// Pengaturan player sendiri: kualitas pilihan & posisi terakhir tiap episode.
// Semua disimpan di localStorage browser.

export interface DirectSource {
  /** Label kualitas, mis. "720p". */
  quality: string
  url: string
}

// ---------- Kualitas pilihan ----------

const QUALITY_KEY = 'animeku:quality'

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
