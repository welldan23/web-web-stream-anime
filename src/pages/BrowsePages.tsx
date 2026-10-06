// Halaman daftar: Sedang Tayang, Sudah Tamat, Cari, Genre, Jadwal, A–Z
import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronRight, Search, SearchX } from 'lucide-react'
import { api } from '../lib/api'
import { DAYS, normalizeDay, todayName } from '../lib/days'
import { cn } from '../lib/cn'
import SearchBox from '../components/SearchBox'
import {
  AnimeCard,
  Card,
  CardGrid,
  CardGridSkeleton,
  Chip,
  EmptyState,
  ErrorState,
  ListRow,
  PageTitle,
  Pager,
  Pill,
  Score,
  Skeleton,
} from '../components/ui'

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

function GridCard({ children }: { children: React.ReactNode }) {
  return <Card className="p-4 sm:p-5">{children}</Card>
}

export function OngoingPage() {
  const [page, setPage] = usePage()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ongoing', page],
    queryFn: () => api.ongoing(page),
    placeholderData: keepPreviousData,
  })

  return (
    <div className="space-y-4">
      <PageTitle title="Sedang Tayang" subtitle="Masih rilis episode baru tiap minggu" />
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <GridCard>
          {isLoading ? (
            <CardGridSkeleton count={18} />
          ) : (
            <CardGrid>
              {data?.data.animeList.map((a) => (
                <AnimeCard
                  key={a.animeId}
                  animeId={a.animeId}
                  title={a.title}
                  poster={a.poster}
                  label={`Ep ${a.episodes}`}
                  meta={`${a.releaseDay} · ${a.latestReleaseDate}`}
                />
              ))}
            </CardGrid>
          )}
        </GridCard>
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
    <div className="space-y-4">
      <PageTitle title="Sudah Tamat" subtitle="Episodenya udah lengkap, pas buat maraton" />
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <GridCard>
          {isLoading ? (
            <CardGridSkeleton count={18} />
          ) : (
            <CardGrid>
              {data?.data.animeList.map((a) => (
                <AnimeCard
                  key={a.animeId}
                  animeId={a.animeId}
                  title={a.title}
                  poster={a.poster}
                  label={`${a.episodes} eps`}
                  meta={<Score score={a.score} />}
                />
              ))}
            </CardGrid>
          )}
        </GridCard>
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
    <div className="space-y-4">
      <PageTitle title="Cari" subtitle={q ? `Hasil buat “${q}”` : undefined} />
      <SearchBox key={q} className="lg:hidden" />
      {!q ? (
        <EmptyState icon={<Search className="size-5" />} title="Mau nonton apa?">
          Ketik judul anime, misalnya “One Piece” atau “Frieren”.
        </EmptyState>
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <GridCard>
          <CardGridSkeleton />
        </GridCard>
      ) : data && data.length > 0 ? (
        <Card className="px-4">
          {data.map((a, i) => (
            <ListRow
              key={a.animeId}
              to={`/anime/${a.animeId}`}
              poster={a.poster}
              title={a.title}
              subtitle={a.genreList.map((g) => g.title).join(', ')}
              trailing={
                <div className="flex flex-col items-end gap-1">
                  {a.status ? <Pill tone={/complete|tamat/i.test(a.status) ? 'success' : 'primary'}>{a.status}</Pill> : null}
                  <Score score={a.score} />
                </div>
              }
              isLast={i === data.length - 1}
            />
          ))}
        </Card>
      ) : (
        <EmptyState icon={<SearchX className="size-5" />} title="Nggak ketemu">
          Coba kata kunci lain, atau pakai judul Jepang-nya.
        </EmptyState>
      )}
    </div>
  )
}

export function GenresPage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['genres'], queryFn: api.genres })

  return (
    <div className="space-y-4">
      <PageTitle title="Genre" />
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 16 }, (_, i) => <Skeleton key={i} className="h-[52px] rounded-2xl" />)
            : data?.map((g) => (
                <Link
                  key={g.genreId}
                  to={`/genre/${g.genreId}`}
                  className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3.5 text-[15px] font-semibold text-ink shadow-card active:opacity-70"
                >
                  {g.title}
                  <ChevronRight className="size-4 text-ink-faint" />
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
    <div className="space-y-4">
      <PageTitle title={genreTitle} subtitle="Genre" />
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <GridCard>
          {isLoading ? (
            <CardGridSkeleton count={18} />
          ) : (
            <CardGrid>
              {data?.data.animeList.map((a) => (
                <AnimeCard
                  key={a.animeId}
                  animeId={a.animeId}
                  title={a.title}
                  poster={a.poster}
                  label={a.episodes ? `${a.episodes} eps` : undefined}
                  meta={<Score score={a.score} />}
                />
              ))}
            </CardGrid>
          )}
        </GridCard>
      )}
      <Pager pagination={data?.pagination} page={page} onChange={setPage} />
    </div>
  )
}

export function SchedulePage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['schedule'], queryFn: api.schedule })
  const [selected, setSelected] = useState<string | null>(null)

  // urutkan Senin -> Minggu, default = hari ini
  const days = useMemo(() => {
    const order = [...DAYS.slice(1), DAYS[0]].map(normalizeDay)
    return [...(data ?? [])].sort((a, b) => {
      const ia = order.indexOf(normalizeDay(a.title))
      const ib = order.indexOf(normalizeDay(b.title))
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
  }, [data])
  const isToday = (day: string) => normalizeDay(day) === normalizeDay(todayName())
  const active = selected ?? days.find((d) => isToday(d.title))?.title ?? days[0]?.title
  const current = days.find((d) => d.title === active)

  return (
    <div className="space-y-4">
      <PageTitle title="Jadwal Rilis" subtitle="Anime ongoing yang tayang tiap minggu" />
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-96 rounded-[20px]" />
      ) : (
        <>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {days.map((d) => (
              <Chip key={d.title} active={d.title === active} onClick={() => setSelected(d.title)}>
                {d.title}
                {isToday(d.title) ? <span className="size-1.5 rounded-full bg-success-500" aria-label="hari ini" /> : null}
              </Chip>
            ))}
          </div>
          <Card className="px-4">
            <div className="flex items-center justify-between border-b border-line py-3">
              <p className="font-bold text-ink">{active}</p>
              <span className="text-sm text-ink-muted">{current?.animeList.length ?? 0} anime</span>
            </div>
            {current?.animeList.map((a, i, arr) => (
              <ListRow key={a.animeId} to={`/anime/${a.animeId}`} title={a.title} isLast={i === arr.length - 1} />
            ))}
            {current?.animeList.length === 0 ? <p className="py-6 text-center text-sm text-ink-muted">Kosong.</p> : null}
          </Card>
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

  const letterBtn = (active: boolean) =>
    cn(
      'h-9 min-w-9 rounded-full px-2.5 text-sm font-semibold active:opacity-70',
      active ? 'bg-primary-500 text-white' : 'bg-surface text-ink-soft shadow-card',
    )

  return (
    <div className="space-y-4">
      <PageTitle title="Daftar A–Z" subtitle="Semua anime, urut abjad" />
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-96 rounded-[20px]" />
      ) : (
        <>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Saring judul"
            className="h-11 w-full rounded-full border border-line bg-surface px-5 text-[15px] shadow-card outline-none placeholder:text-ink-faint focus:border-primary-500"
          />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setLetter(null)} className={letterBtn(!letter)}>
              Semua
            </button>
            {data?.map((g) => (
              <button key={g.startWith} onClick={() => setLetter(g.startWith)} className={letterBtn(letter === g.startWith)}>
                {g.startWith}
              </button>
            ))}
          </div>
          {groups.map((g) => (
            <div key={g.startWith} className="space-y-2">
              <p className="px-1 text-xs font-semibold uppercase text-ink-faint">{g.startWith}</p>
              <Card className="px-4">
                {g.animeList.map((a, i) => (
                  <ListRow key={a.animeId} to={`/anime/${a.animeId}`} title={a.title} isLast={i === g.animeList.length - 1} />
                ))}
              </Card>
            </div>
          ))}
          {groups.length === 0 ? <EmptyState icon={<SearchX className="size-5" />} title="Nggak ada yang cocok" /> : null}
        </>
      )}
    </div>
  )
}
