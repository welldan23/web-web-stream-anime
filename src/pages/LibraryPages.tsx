import { Link, useLocation } from 'react-router-dom'
import { Bookmark, History, X } from 'lucide-react'
import { clearHistory, removeHistory, toggleWatchlist, useLibrary } from '../lib/library'
import { shortEpisodeLabel } from '../lib/episodes'
import { timeAgo } from '../lib/time'
import { cn } from '../lib/cn'
import Seo from '../components/Seo'
import { DEFAULT_DESCRIPTION, pageTitle } from '../lib/site'
import { AnimeCard, Card, CardGrid, EmptyState, PageTitle, Poster } from '../components/ui'

/** Tab Koleksi | Riwayat. */
function LibraryTabs() {
  const { pathname } = useLocation()
  const tabs = [
    { to: '/koleksi', label: 'Koleksi' },
    { to: '/riwayat', label: 'Riwayat' },
  ]
  return (
    <div className="flex rounded-full bg-tile p-1" role="tablist">
      {tabs.map((t) => {
        const active = pathname === t.to
        return (
          <Link
            key={t.to}
            to={t.to}
            role="tab"
            aria-selected={active}
            className={cn(
              'flex-1 rounded-full py-2 text-center text-sm font-semibold transition',
              active ? 'bg-surface text-ink shadow-card' : 'text-ink-muted',
            )}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}

export function WatchlistPage() {
  const { watchlist } = useLibrary()

  return (
    <div className="space-y-4">
      <Seo title={pageTitle('Koleksi')} description={DEFAULT_DESCRIPTION} path="/koleksi" noindex />
      <PageTitle title="Koleksi" />
      <LibraryTabs />
      {watchlist.length === 0 ? (
        <EmptyState icon={<Bookmark className="size-5" />} title="Koleksi masih kosong">
          Tekan tombol <b className="text-ink">Simpan</b> di halaman anime biar muncul di sini.
        </EmptyState>
      ) : (
        <Card className="p-4 sm:p-5">
          <CardGrid>
            {watchlist.map((a) => (
              <div key={a.animeId} className="relative">
                <AnimeCard to={`/anime/${a.animeId}`} title={a.title} poster={a.poster} />
                <button
                  onClick={() => toggleWatchlist(a)}
                  className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-surface text-ink shadow-card active:opacity-70"
                  aria-label={`Hapus ${a.title} dari koleksi`}
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </CardGrid>
        </Card>
      )}
      <p className="px-1 text-xs text-ink-faint">Koleksi & riwayat disimpan di browser ini aja, nggak perlu login.</p>
    </div>
  )
}

export function HistoryPage() {
  const { history } = useLibrary()

  return (
    <div className="space-y-4">
      <Seo title={pageTitle('Riwayat Nonton')} description={DEFAULT_DESCRIPTION} path="/riwayat" noindex />
      <PageTitle
        title="Koleksi"
        action={
          history.length > 0 ? (
            <button
              onClick={() => {
                if (confirm('Hapus semua riwayat nonton?')) clearHistory()
              }}
              className="text-sm font-semibold text-danger-500 active:opacity-70"
            >
              Hapus semua
            </button>
          ) : null
        }
      />
      <LibraryTabs />
      {history.length === 0 ? (
        <EmptyState icon={<History className="size-5" />} title="Belum ada riwayat">
          Episode yang kamu tonton bakal kecatat otomatis di sini.
        </EmptyState>
      ) : (
        <Card className="px-4">
          {history.map((h, i) => (
            <div
              key={h.animeId}
              className={cn('flex items-center gap-3 py-3', i < history.length - 1 && 'border-b border-line')}
            >
              <Link to={`/nonton/${h.episodeId}`} className="flex min-w-0 flex-1 items-center gap-3 active:opacity-70">
                <Poster src={h.poster} alt={h.animeTitle} className="h-14 w-11 rounded-lg" />
                <div className="min-w-0">
                  <p className="line-clamp-1 text-[15px] font-semibold text-ink">{h.animeTitle}</p>
                  <p className="mt-0.5 text-[13px] text-ink-muted">
                    <span className="font-semibold text-primary-500">{shortEpisodeLabel(h.episodeTitle)}</span> ·{' '}
                    {timeAgo(h.watchedAt)}
                  </p>
                </div>
              </Link>
              <button
                onClick={() => removeHistory(h.animeId)}
                className="grid size-8 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-subtle active:opacity-70"
                aria-label={`Hapus ${h.animeTitle} dari riwayat`}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

export function NotFoundPage() {
  return (
    <EmptyState icon={<span className="text-sm font-bold">404</span>} title="Halaman nggak ada">
      <Seo title={pageTitle('Halaman Tidak Ditemukan')} description={DEFAULT_DESCRIPTION} path="/404" noindex />
      <Link to="/" className="mt-2 inline-block rounded-full bg-primary-500 px-5 py-2.5 text-sm font-semibold text-on-primary">
        Ke Beranda
      </Link>
    </EmptyState>
  )
}
