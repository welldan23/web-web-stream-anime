// Halaman daftar: Ongoing, Tamat, Film, Semua Anime, Cari, Genre, Jadwal
import { useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronRight, ImageUp, Search, SearchX } from 'lucide-react'
import { animePath, api, episodePath, type AnimeCard as AnimeCardData, type Pagination, type SortKey } from '../lib/api'
import { normalizeDay, todayName, WEEK } from '../lib/days'
import SearchBox from '../components/SearchBox'
import Seo from '../components/Seo'
import { breadcrumb, pageTitle } from '../lib/site'
import { SITE_URL } from '../lib/siteUrl'
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

const withPage = (path: string, page: number) => (page > 1 ? `${path}?page=${page}` : path)
const pageSuffix = (page: number) => (page > 1 ? ` – Halaman ${page}` : '')

function AnimeGrid({ list }: { list: AnimeCardData[] }) {
  return (
    <CardGrid>
      {list.map((a) => (
        <AnimeCard
          key={`${a.animeId}-${a.animeSlug}`}
          to={animePath(a)}
          title={a.title}
          poster={a.poster}
          label={a.highlight || undefined}
          meta={[a.type, a.quality].filter(Boolean).join(' · ')}
        />
      ))}
    </CardGrid>
  )
}

/** Kerangka halaman daftar: judul, grid di kartu, dan pindah halaman. */
function ListLayout({
  seo,
  title,
  subtitle,
  top,
  query,
  page,
  setPage,
  render,
}: {
  seo: ReactNode
  title: string
  subtitle?: string
  top?: ReactNode
  query: { isLoading: boolean; error: unknown; refetch: () => unknown; data?: { pagination: Pagination | null } }
  page: number
  setPage: (p: number) => void
  render: () => ReactNode
}) {
  return (
    <div className="space-y-4">
      {seo}
      <PageTitle title={title} subtitle={subtitle} />
      {top}
      {query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <Card className="p-4 sm:p-5">{query.isLoading ? <CardGridSkeleton count={18} /> : render()}</Card>
      )}
      <Pager pagination={query.data?.pagination} page={page} onChange={setPage} />
    </div>
  )
}

export function OngoingPage() {
  const [page, setPage] = usePage()
  const q = useQuery({
    queryKey: ['animes', 'ongoing', page],
    queryFn: () => api.animes({ status: 'ongoing', page }),
    placeholderData: keepPreviousData,
  })
  return (
    <ListLayout
      seo={
        <Seo
          title={pageTitle(`Anime Ongoing Sub Indo Terbaru${pageSuffix(page)}`)}
          description="Episode terbaru anime ongoing subtitle Indonesia, update tiap hari. Nonton gratis tanpa iklan."
          path={withPage('/ongoing', page)}
        />
      }
      title="Sedang Tayang"
      subtitle="Episode terbaru anime yang masih rilis tiap minggu"
      query={q}
      page={page}
      setPage={setPage}
      render={() => (
        <CardGrid>
          {(q.data?.data.episodeList ?? []).map((e) => (
            <AnimeCard
              key={`${e.animeId}-${e.episodeId}`}
              to={episodePath(e, e.episodeId)}
              title={e.title}
              poster={e.poster}
              label={`Ep ${e.episodes}`}
              meta={e.totalEpisodes && e.totalEpisodes !== '?' ? `dari ${e.totalEpisodes} episode` : e.type}
            />
          ))}
        </CardGrid>
      )}
    />
  )
}

function StatusPage({
  status,
  path,
  title,
  subtitle,
  seoTitle,
  seoDescription,
}: {
  status: 'completed' | 'movie'
  path: string
  title: string
  subtitle: string
  seoTitle: string
  seoDescription: string
}) {
  const [page, setPage] = usePage()
  const q = useQuery({
    queryKey: ['animes', status, page],
    queryFn: () => api.animes({ status, page }),
    placeholderData: keepPreviousData,
  })
  return (
    <ListLayout
      seo={<Seo title={pageTitle(`${seoTitle}${pageSuffix(page)}`)} description={seoDescription} path={withPage(path, page)} />}
      title={title}
      subtitle={subtitle}
      query={q}
      page={page}
      setPage={setPage}
      render={() => <AnimeGrid list={q.data?.data.animeList ?? []} />}
    />
  )
}

export function CompletedPage() {
  return (
    <StatusPage
      status="completed"
      path="/tamat"
      title="Sudah Tamat"
      subtitle="Episodenya udah lengkap, pas buat maraton"
      seoTitle="Anime Tamat Sub Indo Lengkap"
      seoDescription="Daftar anime tamat subtitle Indonesia dengan episode lengkap, pas buat maraton. Nonton gratis tanpa iklan."
    />
  )
}

export function MoviePage() {
  return (
    <StatusPage
      status="movie"
      path="/film"
      title="Film"
      subtitle="Film anime layar lebar"
      seoTitle="Film Anime Sub Indo"
      seoDescription="Kumpulan film anime layar lebar subtitle Indonesia. Nonton gratis tanpa iklan."
    />
  )
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'popular', label: 'Populer' },
  { key: 'most_viewed', label: 'Paling ditonton' },
  { key: 'latest', label: 'Terbaru' },
  { key: 'a-z', label: 'A–Z' },
]

export function AllAnimePage() {
  const [params, setParams] = useSearchParams()
  const [page, setPage] = usePage()
  const sort = (SORTS.find((s) => s.key === params.get('urut'))?.key ?? 'popular') as SortKey
  const q = useQuery({
    queryKey: ['animes', 'all', sort, page],
    queryFn: () => api.animes({ sort, page }),
    placeholderData: keepPreviousData,
  })
  return (
    <ListLayout
      seo={
        <Seo
          title={pageTitle(`Daftar Semua Anime Sub Indo${pageSuffix(page)}`)}
          description="Daftar lengkap anime subtitle Indonesia, urut populer, paling banyak ditonton, terbaru, atau A–Z."
          path={withPage('/daftar', page)}
        />
      }
      title="Semua Anime"
      top={
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {SORTS.map((s) => (
            <Chip key={s.key} active={sort === s.key} onClick={() => setParams({ urut: s.key })}>
              {s.label}
            </Chip>
          ))}
        </div>
      }
      query={q}
      page={page}
      setPage={setPage}
      render={() => <AnimeGrid list={q.data?.data.animeList ?? []} />}
    />
  )
}

export function SearchPage() {
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  const [page, setPage] = usePage()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['search', q, page],
    queryFn: () => api.animes({ search: q, page }),
    enabled: q.length > 0,
    placeholderData: keepPreviousData,
  })
  const list = data?.data.animeList ?? []

  return (
    <div className="space-y-4">
      <Seo
        title={pageTitle(q ? `Hasil pencarian “${q}”` : 'Cari Anime')}
        description="Cari anime subtitle Indonesia berdasarkan judul."
        path={q ? `/cari?q=${encodeURIComponent(q)}` : '/cari'}
        noindex
      />
      <PageTitle title="Cari" subtitle={q ? `Hasil buat “${q}”` : undefined} />
      <SearchBox key={q} className="lg:hidden" />
      <Link
        to="/cari-gambar"
        className="flex items-center gap-3 rounded-[20px] bg-surface px-4 py-3.5 shadow-card active:opacity-70"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-500">
          <ImageUp className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink">Cari pakai screenshot</span>
          <span className="block text-[13px] text-ink-muted">Lupa judulnya? Upload gambar adegannya aja</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-ink-faint" />
      </Link>
      {!q ? (
        <EmptyState icon={<Search className="size-5" />} title="Mau nonton apa?">
          Ketik judul anime, misalnya “One Piece” atau “Frieren”.
        </EmptyState>
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Card className="p-4 sm:p-5">
          <CardGridSkeleton />
        </Card>
      ) : list.length > 0 ? (
        <>
          <Card className="px-4">
            {list.map((a, i) => (
              <ListRow
                key={`${a.animeId}-${a.animeSlug}`}
                to={animePath(a)}
                poster={a.poster}
                title={a.title}
                subtitle={[a.type, a.highlight].filter(Boolean).join(' · ')}
                trailing={a.quality ? <Pill tone="neutral">{a.quality}</Pill> : null}
                isLast={i === list.length - 1}
              />
            ))}
          </Card>
          <Pager pagination={data?.pagination} page={page} onChange={setPage} />
        </>
      ) : (
        <EmptyState icon={<SearchX className="size-5" />} title="Nggak ketemu">
          Coba kata kunci lain, atau pakai judul Jepang-nya.
        </EmptyState>
      )}
    </div>
  )
}

export function GenresPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['properties', 'genre'],
    queryFn: () => api.properties('genre'),
    staleTime: 1000 * 60 * 60,
  })

  return (
    <div className="space-y-4">
      <Seo
        title={pageTitle('Daftar Genre Anime Sub Indo')}
        description="Cari anime subtitle Indonesia berdasarkan genre: action, adventure, comedy, romance, isekai, slice of life, dan lainnya."
        path="/genre"
      />
      <PageTitle
        title="Genre"
        action={
          <Link to="/daftar" className="text-sm font-semibold text-primary-500 hover:underline">
            Semua anime ›
          </Link>
        }
      />
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 16 }, (_, i) => <Skeleton key={i} className="h-[52px] rounded-2xl" />)
            : data?.map((g) => (
                <Link
                  key={g.propertyId}
                  to={`/genre/${g.propertyId}`}
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
  const genres = useQuery({
    queryKey: ['properties', 'genre'],
    queryFn: () => api.properties('genre'),
    staleTime: 1000 * 60 * 60,
  })
  const q = useQuery({
    queryKey: ['genre', genreId, page],
    queryFn: () => api.byProperty('genre', genreId, { page, sort: 'popular' }),
    placeholderData: keepPreviousData,
  })
  const genreTitle = genres.data?.find((g) => g.propertyId === genreId)?.title ?? genreId

  return (
    <ListLayout
      seo={
        <Seo
          title={pageTitle(`Anime ${genreTitle} Sub Indo${pageSuffix(page)}`)}
          description={`Kumpulan anime genre ${genreTitle} subtitle Indonesia, urut paling populer. Nonton gratis tanpa iklan.`}
          path={withPage(`/genre/${genreId}`, page)}
          jsonLd={[
            breadcrumb(SITE_URL, [
              { name: 'Beranda', path: '/' },
              { name: 'Genre', path: '/genre' },
              { name: genreTitle, path: `/genre/${genreId}` },
            ]),
          ]}
        />
      }
      title={genreTitle}
      subtitle="Genre · paling populer"
      query={q}
      page={page}
      setPage={setPage}
      render={() => <AnimeGrid list={q.data?.data.animeList ?? []} />}
    />
  )
}

export function SchedulePage() {
  const todayDay = WEEK.find((d) => normalizeDay(d.name) === normalizeDay(todayName()))!
  const [selected, setSelected] = useState(todayDay.param)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['schedule', selected, 1],
    queryFn: () => api.schedule(selected),
    staleTime: 1000 * 60 * 30,
  })
  const list = data?.data.animeList ?? []
  const active = WEEK.find((d) => d.param === selected)!

  return (
    <div className="space-y-4">
      <Seo
        title={pageTitle('Jadwal Rilis Anime Sub Indo Minggu Ini')}
        description="Jadwal tayang anime ongoing subtitle Indonesia dari Senin sampai Minggu, lengkap dengan jam rilisnya."
        path="/jadwal"
      />
      <PageTitle title="Jadwal Rilis" subtitle="Anime ongoing yang tayang tiap minggu" />
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {WEEK.map((d) => (
          <Chip key={d.param} active={d.param === selected} onClick={() => setSelected(d.param)}>
            {d.name}
            {d.param === todayDay.param ? <span className="size-1.5 rounded-full bg-success-500" aria-label="hari ini" /> : null}
          </Chip>
        ))}
      </div>
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-96 rounded-[20px]" />
      ) : (
        <Card className="px-4">
          <div className="flex items-center justify-between border-b border-line py-3">
            <p className="font-bold text-ink">{active.name}</p>
            <span className="text-sm text-ink-muted">{list.length} anime</span>
          </div>
          {list.map((a, i) => (
            <ListRow
              key={`${a.animeId}-${i}`}
              to={animePath(a)}
              poster={a.poster}
              title={a.title}
              subtitle={[a.releaseTime && `Tayang ${a.releaseTime}`, a.type].filter(Boolean).join(' · ')}
              isLast={i === list.length - 1}
            />
          ))}
          {list.length === 0 ? <p className="py-6 text-center text-sm text-ink-muted">Kosong.</p> : null}
        </Card>
      )}
    </div>
  )
}
