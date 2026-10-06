// Halaman daftar: Sedang Tayang, Sudah Tamat, Cari, Genre, Jadwal, A–Z
import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { SearchX } from 'lucide-react'
import { api } from '../lib/api'
import { DAYS, normalizeDay, todayName } from '../lib/days'
import SearchBox from '../components/SearchBox'
import {
  AnimeCard,
  Badge,
  CardGrid,
  CardGridSkeleton,
  EmptyState,
  ErrorState,
  PageHeader,
  Pager,
  ScoreBadge,
  Skeleton,
} from '../components/ui'
import { cn } from '../lib/cn'

function usePage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const setPage = (p: number) => {
    const next = new URLSearchParams(params)
    next.set('page', String(p))
    setParams(next)
  }
  return [page, setPage] as const
}

export function OngoingPage() {
  const [page, setPage] = usePage()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ongoing', page],
    queryFn: () => api.ongoing(page),
    placeholderData: keepPreviousData,
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Sedang Tayang" subtitle="Anime yang masih rilis episode baru tiap minggu." />
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <CardGridSkeleton count={18} />
      ) : (
        <CardGrid>
          {data?.data.animeList.map((a) => (
            <AnimeCard
              key={a.animeId}
              animeId={a.animeId}
              title={a.title}
              poster={a.poster}
              topLeft={<Badge tone="accent">Ep {a.episodes}</Badge>}
              subtitle={`${a.releaseDay} • ${a.latestReleaseDate}`}
            />
          ))}
        </CardGrid>
      )}
      <Pager pagination={data?.pagination} page={page} onChange={setPage} />
    </div>
  )
}

export function CompletedPage() {
  const [page, setPage] = usePage()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['completed', page],
    queryFn: () => api.completed(page),
    placeholderData: keepPreviousData,
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Sudah Tamat" subtitle="Anime yang episodenya udah lengkap. Pas buat maraton." />
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <CardGridSkeleton count={18} />
      ) : (
        <CardGrid>
          {data?.data.animeList.map((a) => (
            <AnimeCard
              key={a.animeId}
              animeId={a.animeId}
              title={a.title}
              poster={a.poster}
              topLeft={<Badge>{a.episodes} Eps</Badge>}
              topRight={<ScoreBadge score={a.score} />}
              subtitle={a.lastReleaseDate}
            />
          ))}
        </CardGrid>
      )}
      <Pager pagination={data?.pagination} page={page} onChange={setPage} />
    </div>
  )
}

export function SearchPage() {
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['search', q],
    queryFn: () => api.search(q),
    enabled: q.length > 0,
  })

  return (
    <div className="space-y-6">
      <SearchBox key={q} className="sm:hidden" />
      <PageHeader title={q ? `Hasil pencarian “${q}”` : 'Cari Anime'} />
      {!q ? (
        <EmptyState icon={<SearchX className="size-8" />} title="Ketik judul anime yang mau dicari" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <CardGridSkeleton />
      ) : data && data.length > 0 ? (
        <CardGrid>
          {data.map((a) => (
            <AnimeCard
              key={a.animeId}
              animeId={a.animeId}
              title={a.title}
              poster={a.poster}
              topLeft={a.status ? <Badge>{a.status}</Badge> : null}
              topRight={<ScoreBadge score={a.score} />}
              subtitle={a.genreList.map((g) => g.title).join(', ')}
            />
          ))}
        </CardGrid>
      ) : (
        <EmptyState icon={<SearchX className="size-8" />} title="Nggak ada hasil">
          Coba pakai kata kunci lain, misalnya judul bahasa Jepang-nya.
        </EmptyState>
      )}
    </div>
  )
}

const GENRE_COLORS = [
  'from-rose-500/30',
  'from-violet-500/30',
  'from-sky-500/30',
  'from-emerald-500/30',
  'from-amber-500/30',
  'from-fuchsia-500/30',
]

export function GenresPage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['genres'], queryFn: api.genres })

  return (
    <div className="space-y-6">
      <PageHeader title="Genre" subtitle="Pilih genre favorit kamu." />
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {isLoading
            ? Array.from({ length: 20 }, (_, i) => <Skeleton key={i} className="h-16" />)
            : data?.map((g, i) => (
                <Link
                  key={g.genreId}
                  to={`/genre/${g.genreId}`}
                  className={cn(
                    'rounded-xl border border-line bg-gradient-to-br to-surface px-4 py-5 text-sm font-bold transition hover:-translate-y-0.5 hover:border-accent/50',
                    GENRE_COLORS[i % GENRE_COLORS.length],
                  )}
                >
                  {g.title}
                </Link>
              ))}
        </div>
      )}
    </div>
  )
}

export function GenrePage() {
  const { genreId = '' } = useParams()
  const [page, setPage] = usePage()
  const genres = useQuery({ queryKey: ['genres'], queryFn: api.genres })
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['genre', genreId, page],
    queryFn: () => api.byGenre(genreId, page),
    placeholderData: keepPreviousData,
  })
  const genreTitle = genres.data?.find((g) => g.genreId === genreId)?.title ?? genreId

  return (
    <div className="space-y-6">
      <PageHeader title={`Genre: ${genreTitle}`} />
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <CardGridSkeleton count={18} />
      ) : (
        <CardGrid>
          {data?.data.animeList.map((a) => (
            <AnimeCard
              key={a.animeId}
              animeId={a.animeId}
              title={a.title}
              poster={a.poster}
              topLeft={a.episodes ? <Badge>{a.episodes} Eps</Badge> : null}
              topRight={<ScoreBadge score={a.score} />}
              subtitle={[a.studios, a.season].filter(Boolean).join(' • ')}
            />
          ))}
        </CardGrid>
      )}
      <Pager pagination={data?.pagination} page={page} onChange={setPage} />
    </div>
  )
}

export function SchedulePage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['schedule'], queryFn: api.schedule })
  const [selected, setSelected] = useState<string | null>(null)

  // urutkan Senin -> Minggu, default tab = hari ini
  const days = useMemo(() => {
    const order = [...DAYS.slice(1), DAYS[0]].map(normalizeDay)
    return [...(data ?? [])].sort((a, b) => {
      const ia = order.indexOf(normalizeDay(a.title))
      const ib = order.indexOf(normalizeDay(b.title))
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
  }, [data])
  const active =
    selected ??
    days.find((d) => normalizeDay(d.title) === normalizeDay(todayName()))?.title ??
    days[0]?.title
  const current = days.find((d) => d.title === active)

  return (
    <div className="space-y-6">
      <PageHeader title="Jadwal Rilis" subtitle="Jadwal tayang anime ongoing tiap minggunya." />
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {days.map((d) => {
              const isToday = normalizeDay(d.title) === normalizeDay(todayName())
              return (
                <button
                  key={d.title}
                  onClick={() => setSelected(d.title)}
                  className={cn(
                    'shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
                    d.title === active
                      ? 'bg-gradient-to-r from-accent to-accent-2 text-white shadow-lg shadow-accent/20'
                      : 'bg-surface text-muted hover:text-white',
                  )}
                >
                  {d.title}
                  {isToday ? <span className="ml-1.5 text-[10px] uppercase opacity-80">• Hari ini</span> : null}
                </button>
              )
            })}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {current?.animeList.map((a, i) => (
              <Link
                key={a.animeId}
                to={`/anime/${a.animeId}`}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition hover:border-accent/50"
              >
                <span className="w-6 text-sm font-bold text-muted">{String(i + 1).padStart(2, '0')}</span>
                <span className="line-clamp-1 text-sm font-semibold">{a.title}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function AzPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['all-anime'],
    queryFn: api.allAnime,
    staleTime: 1000 * 60 * 30,
  })
  const [letter, setLetter] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const groups = useMemo(() => {
    const f = filter.trim().toLowerCase()
    return (data ?? [])
      .filter((g) => !letter || g.startWith === letter)
      .map((g) => ({ ...g, animeList: f ? g.animeList.filter((a) => a.title.toLowerCase().includes(f)) : g.animeList }))
      .filter((g) => g.animeList.length > 0)
  }, [data, letter, filter])

  return (
    <div className="space-y-6">
      <PageHeader title="Daftar Anime A–Z" subtitle="Semua anime yang ada, urut abjad." />
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setLetter(null)}
              className={cn(
                'h-9 rounded-lg px-3 text-sm font-bold',
                !letter ? 'bg-accent text-white' : 'bg-surface text-muted hover:text-white',
              )}
            >
              Semua
            </button>
            {data?.map((g) => (
              <button
                key={g.startWith}
                onClick={() => setLetter(g.startWith)}
                className={cn(
                  'size-9 rounded-lg text-sm font-bold',
                  letter === g.startWith ? 'bg-accent text-white' : 'bg-surface text-muted hover:text-white',
                )}
              >
                {g.startWith}
              </button>
            ))}
          </div>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Saring judul…"
            className="h-11 w-full max-w-sm rounded-xl border border-line bg-surface px-4 text-sm outline-none focus:border-accent/60"
          />
          <div className="space-y-8">
            {groups.map((g) => (
              <section key={g.startWith}>
                <h2 className="mb-3 text-2xl font-extrabold text-gradient">{g.startWith}</h2>
                <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                  {g.animeList.map((a) => (
                    <Link
                      key={a.animeId}
                      to={`/anime/${a.animeId}`}
                      className="truncate rounded-md px-2 py-1.5 text-sm text-zinc-300 hover:bg-surface hover:text-accent"
                    >
                      {a.title}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
            {groups.length === 0 ? <EmptyState icon={<SearchX className="size-8" />} title="Nggak ada yang cocok" /> : null}
          </div>
        </>
      )}
    </div>
  )
}
