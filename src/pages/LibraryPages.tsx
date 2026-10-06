import { Link } from 'react-router-dom'
import { Bookmark, History, Play, Trash2, X } from 'lucide-react'
import { clearHistory, removeHistory, toggleWatchlist, useLibrary } from '../lib/library'
import { shortEpisodeLabel } from '../lib/episodes'
import { AnimeCard, CardGrid, EmptyState, PageHeader, Poster } from '../components/ui'

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'baru saja'
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} hari lalu`
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function WatchlistPage() {
  const { watchlist } = useLibrary()

  return (
    <div className="space-y-6">
      <PageHeader title="Koleksi" subtitle="Anime yang kamu simpan buat ditonton nanti. Disimpan di browser ini aja." />
      {watchlist.length === 0 ? (
        <EmptyState icon={<Bookmark className="size-8" />} title="Koleksi masih kosong">
          Klik tombol <b>Koleksi</b> di halaman anime buat nyimpen.
        </EmptyState>
      ) : (
        <CardGrid>
          {watchlist.map((a) => (
            <div key={a.animeId} className="group relative">
              <AnimeCard animeId={a.animeId} title={a.title} poster={a.poster} />
              <button
                onClick={() => toggleWatchlist(a)}
                className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg bg-black/70 text-white opacity-100 backdrop-blur transition hover:bg-accent sm:opacity-0 sm:group-hover:opacity-100"
                aria-label="Hapus dari koleksi"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </CardGrid>
      )}
    </div>
  )
}

export function HistoryPage() {
  const { history } = useLibrary()

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <PageHeader title="Riwayat Nonton" subtitle="Episode terakhir yang kamu tonton tiap anime." />
        {history.length > 0 ? (
          <button
            onClick={() => {
              if (confirm('Hapus semua riwayat nonton?')) clearHistory()
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-surface px-3 py-2 text-sm font-semibold text-muted hover:text-accent"
          >
            <Trash2 className="size-4" /> Hapus semua
          </button>
        ) : null}
      </div>
      {history.length === 0 ? (
        <EmptyState icon={<History className="size-8" />} title="Belum ada riwayat">
          Mulai nonton, nanti otomatis kecatat di sini.
        </EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {history.map((h) => (
            <div key={h.animeId} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-3">
              <Link to={`/anime/${h.animeId}`} className="shrink-0">
                <Poster src={h.poster} alt={h.animeTitle} className="aspect-[2/3] w-16 rounded-lg" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/anime/${h.animeId}`} className="line-clamp-1 font-semibold hover:text-accent">
                  {h.animeTitle}
                </Link>
                <p className="mt-0.5 text-sm text-accent">{shortEpisodeLabel(h.episodeTitle)}</p>
                <p className="mt-0.5 text-xs text-muted">{timeAgo(h.watchedAt)}</p>
              </div>
              <Link
                to={`/nonton/${h.episodeId}`}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-white hover:brightness-110"
                aria-label="Lanjut nonton"
              >
                <Play className="size-4 fill-white" />
              </Link>
              <button
                onClick={() => removeHistory(h.animeId)}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:text-white"
                aria-label="Hapus dari riwayat"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-7xl font-extrabold text-gradient">404</p>
      <p className="text-muted">Halaman yang kamu cari nggak ada.</p>
      <Link to="/" className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold">
        Balik ke Beranda
      </Link>
    </div>
  )
}
