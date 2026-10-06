// Cari anime dari screenshot pakai trace.moe (https://trace.moe).
// Gratis tanpa API key, tapi ada kuota per IP (±1000 pencarian/bulan) dan
// batas ukuran gambar 25 MB. Hasilnya dicocokin ke anime di Animeku biar bisa langsung nonton.
import { animePath, api, episodePath, episodeRange, type AnimeCard, type AnimeRef } from './api'
import { bestTitleMatch, cleanTitle } from './anilist'

const TRACE_URL = 'https://api.trace.moe/search'

export interface TraceResult {
  anilist: {
    id: number
    idMal: number | null
    title: { native: string | null; romaji: string | null; english: string | null }
    synonyms: string[]
    isAdult: boolean
  }
  filename: string
  episode: number | string | number[] | null
  from: number
  to: number
  similarity: number
  video: string
  image: string
}

export class TraceError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function traceMessage(status: number, fallback: string) {
  if (status === 402 || status === 429) return 'Kuota pencarian trace.moe lagi habis atau lagi rame. Coba lagi beberapa saat lagi ya.'
  if (status === 413) return 'Gambarnya kegedean (maksimal 25 MB).'
  if (status === 400) return 'Gambarnya nggak kebaca. Coba pakai screenshot lain (JPG/PNG).'
  return fallback || 'trace.moe lagi bermasalah, coba lagi nanti.'
}

async function parse(res: Response): Promise<TraceResult[]> {
  const body = (await res.json().catch(() => null)) as { error?: string; result?: TraceResult[] } | null
  if (!res.ok || !body || body.error) {
    throw new TraceError(res.status, traceMessage(res.status, body?.error ?? ''))
  }
  return body.result ?? []
}

/** Kecilin gambar gede biar upload cepat & hemat kuota (trace.moe cukup pakai ±1280px). */
export async function prepareImage(file: Blob, maxSize = 1280): Promise<Blob> {
  if (file.size < 1_000_000 || typeof createImageBitmap !== 'function') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    return blob ?? file
  } catch {
    return file
  }
}

/** `cutBorders` = buang garis hitam di pinggir screenshot biar lebih akurat. */
export async function searchByImage(image: Blob) {
  const res = await fetch(`${TRACE_URL}?anilistInfo&cutBorders`, {
    method: 'POST',
    headers: { 'Content-Type': image.type || 'image/jpeg' },
    body: image,
  })
  return parse(res)
}

export async function searchByUrl(url: string) {
  return parse(await fetch(`${TRACE_URL}?anilistInfo&cutBorders&url=${encodeURIComponent(url)}`))
}

// ---------- Tampilan ----------

/** 754.3 -> "12:34" */
export function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** Episode dari trace.moe bisa angka, teks, array (mis. [1,2]), atau null (film/OVA). */
export function episodeOf(r: TraceResult): number | null {
  const e = Array.isArray(r.episode) ? r.episode[0] : r.episode
  const n = typeof e === 'string' ? Number.parseFloat(e) : e
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

export function displayTitle(r: TraceResult) {
  const t = r.anilist.title
  return t.romaji || t.english || t.native || r.filename
}

export function confidence(r: TraceResult): { label: string; tone: 'success' | 'warning' | 'neutral' } {
  if (r.similarity >= 0.92) return { label: 'Cocok banget', tone: 'success' }
  if (r.similarity >= 0.85) return { label: 'Kemungkinan', tone: 'warning' }
  return { label: 'Kurang yakin', tone: 'neutral' }
}

/** Gabungin hasil yang anime & episodenya sama (trace.moe sering ngasih beberapa potongan adegan). */
export function dedupe(results: TraceResult[]) {
  const seen = new Set<string>()
  return results.filter((r) => {
    const key = `${r.anilist.id}:${episodeOf(r) ?? '-'}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ---------- Cocokin ke Animeku (Kuramanime) ----------

export interface SiteMatch {
  anime: AnimeRef
  animePath: string
  /** null kalau episode-nya nggak ketemu (tetap bisa buka halaman animenya). */
  episodePath: string | null
}

/** Cari anime yang sama di Animeku (pakai judul romaji/inggris), lalu cek episodenya ada atau nggak. */
export async function findOnSite(r: TraceResult): Promise<SiteMatch | null> {
  const t = r.anilist.title
  const names = [t.romaji, t.english, ...r.anilist.synonyms].filter((x): x is string => Boolean(x))
  const queries = [...new Set([t.romaji, t.english].filter((x): x is string => Boolean(x)).map(cleanTitle))]

  let anime: AnimeCard | null = null
  for (const q of queries) {
    const res = await api.animes({ search: q }).catch(() => null)
    anime = bestTitleMatch(res?.data.animeList ?? [], (a) => a.title, names)
    if (anime) break
  }
  if (!anime) return null

  const ep = episodeOf(r)
  const base = { anime, animePath: animePath(anime) }
  if (ep === null) return { ...base, episodePath: null }
  const details = await api.anime(anime.animeId, anime.animeSlug).catch(() => null)
  const exists = details ? episodeRange(details).includes(ep) : false
  return { ...base, episodePath: exists ? episodePath(anime, ep) : null }
}
