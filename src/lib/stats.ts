// Statistik anonim buat dashboard admin + client API dashboard-nya.
// Server-nya ada di server/stats.ts (jalan di VPS bareng web).
import { Capacitor } from '@capacitor/core'

const API_URL = import.meta.env.VITE_API_URL || '/api'
// Di aplikasi Android web-nya dibuka dari https://localhost, jadi alamat server
// diambil dari VITE_API_URL (mis. https://domain/api → https://domain/_animeku).
const STATS_URL = (
  import.meta.env.VITE_STATS_URL || `${/^https?:\/\//.test(API_URL) ? new URL(API_URL).origin : ''}/_animeku`
).replace(/\/+$/, '')

const isApp = Capacitor.isNativePlatform()
const sentWatches = new Set<string>()

type TrackEvent =
  | { t: 'view' }
  | { t: 'watch'; animeId: string; title: string; episodeId: string }
  | { t: 'search'; q: string; results: number }

let last = { body: '', at: 0 }

export function track(event: TrackEvent) {
  if (event.t === 'watch') {
    // satu episode dihitung sekali per sesi (StrictMode/refresh data nggak dobel)
    if (sentWatches.has(event.episodeId)) return
    sentWatches.add(event.episodeId)
  }
  const body = JSON.stringify({ ...event, app: isApp })
  // event yang sama persis dalam 2 detik (efek React jalan dua kali) dihitung sekali
  if (body === last.body && Date.now() - last.at < 2000) return
  last = { body, at: Date.now() }
  try {
    // sendBeacon tetap kekirim walau halaman ditutup, dan nggak nunggu jawaban
    if (navigator.sendBeacon?.(`${STATS_URL}/e`, body)) return
    fetch(`${STATS_URL}/e`, { method: 'POST', body, keepalive: true }).catch(() => {})
  } catch {
    // statistik gagal kekirim nggak boleh ganggu web
  }
}

// --- dashboard admin ---

export interface Totals {
  visitors: number
  views: number
  watches: number
  searches: number
  appVisitors: number
}

export interface AdminStats {
  days: number
  timeZone: string
  totals: Totals
  previous: Totals
  daily: { day: string; visitors: number; views: number; watches: number; searches: number }[]
  topAnime: { animeId: string; title: string; count: number }[]
  topSearches: { q: string; count: number; empty: number }[]
  emptySearches: { q: string; count: number }[]
  apk: { downloads: number; publishedAt: string | null; url: string | null } | null
}

export class AdminError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function admin<T>(path: string, init?: RequestInit) {
  const res = await fetch(`${STATS_URL}/admin${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  const body = (await res.json().catch(() => null)) as (T & { message?: string }) | null
  if (!res.ok || !body) throw new AdminError(res.status, body?.message || 'Server dashboard nggak bisa dihubungi.')
  return body
}

export const adminApi = {
  stats: (days: 7 | 30) => admin<AdminStats>(`/stats?days=${days}`),
  login: (password: string) => admin<{ ok: true }>('/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => admin<{ ok: true }>('/logout', { method: 'POST' }),
}
