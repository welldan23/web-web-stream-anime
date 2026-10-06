// Koleksi (watchlist) dan riwayat nonton, disimpan di localStorage browser.
import { useSyncExternalStore } from 'react'

export interface SavedAnime {
  animeId: string
  title: string
  poster: string
  addedAt: number
}

export interface HistoryEntry {
  animeId: string
  animeTitle: string
  poster: string
  episodeId: string
  episodeTitle: string
  watchedAt: number
}

interface LibraryState {
  watchlist: SavedAnime[]
  history: HistoryEntry[]
  // episodeId yang pernah ditonton, buat tanda centang di daftar episode
  watched: string[]
}

// Sumber Oploverz. ID anime/episode Otakudesu yang lama beda, jadi koleksi & riwayat lama nggak dibawa.
const KEY = 'animeku:library:oploverz'
const MAX_HISTORY = 50
const MAX_WATCHED = 2000

function load(): LibraryState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LibraryState>
      return {
        watchlist: parsed.watchlist ?? [],
        history: parsed.history ?? [],
        watched: parsed.watched ?? [],
      }
    }
  } catch {
    // localStorage bisa diblokir (mode private dsb), lanjut pakai state kosong
  }
  return { watchlist: [], history: [], watched: [] }
}

let state = load()
const listeners = new Set<() => void>()

function setState(next: LibraryState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // abaikan, data tetap ada selama tab terbuka
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = load()
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useLibrary() {
  return useSyncExternalStore(subscribe, () => state)
}

export function isInWatchlist(animeId: string) {
  return state.watchlist.some((a) => a.animeId === animeId)
}

export function toggleWatchlist(anime: Omit<SavedAnime, 'addedAt'>) {
  const exists = isInWatchlist(anime.animeId)
  setState({
    ...state,
    watchlist: exists
      ? state.watchlist.filter((a) => a.animeId !== anime.animeId)
      : [{ ...anime, addedAt: Date.now() }, ...state.watchlist],
  })
}

export function recordWatch(entry: Omit<HistoryEntry, 'watchedAt'>) {
  // satu anime cuma muncul sekali di riwayat (episode terakhir yang ditonton)
  const history = [
    { ...entry, watchedAt: Date.now() },
    ...state.history.filter((h) => h.animeId !== entry.animeId),
  ].slice(0, MAX_HISTORY)
  const watched = state.watched.includes(entry.episodeId)
    ? state.watched
    : [entry.episodeId, ...state.watched].slice(0, MAX_WATCHED)
  setState({ ...state, history, watched })
}

export function removeHistory(animeId: string) {
  setState({ ...state, history: state.history.filter((h) => h.animeId !== animeId) })
}

export function clearHistory() {
  setState({ ...state, history: [] })
}
