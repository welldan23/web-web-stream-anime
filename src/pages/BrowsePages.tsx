// Halaman daftar: Ongoing, Tamat, Film, Cari, Genre, Jadwal, A–Z
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ImageUp, Search, SearchX } from 'lucide-react'
import { api, GENRES, type CardItem, type OploOrder, type OploStatus, type OploType } from '../lib/api'
import { dayOrder, normalizeDay, todayName } from '../lib/days'
import { cn } from '../lib/cn'
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
  Pill,
  Skeleton,
} from '../components/ui'

function Grid({ list }: { list: CardItem[] }) {
  return (
    <CardGrid>
      {list.map((a, i) => (
        <AnimeCard key={`${a.to}-${i}`} to={a.to} title={a.title} poster={a.poster} label={a.label} meta={a.meta} />
      ))}
    </CardGrid>
  )
}

/** Halaman daftar hasil filter Oploverz (status / tipe / genre). */
function FilterPage({
  seo,
  title,
  subtitle,
  filter,
}: {
  seo: ReactNode
  title: string
  subtitle?: string
  filter: { status?: OploStatus; type?: OploType; genre?: string; order?: OploOrder }
}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['filter', filter],
    queryFn: () => api.filter(filter),
  })

  return (
    <div className="space-y-4">
      {seo}
      <PageTitle title={title} subtitle={subtitle} />
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Card className="p-4 sm:p-5">
          <CardGridSkeleton count={18} />
        </Card>
      ) : data && data.length > 0 ? (
        <Card className="p-4 sm:p-5">
          <Grid list={data} />
        </Card>
      ) : (
        <EmptyState icon={<SearchX className="size-5" />} title="Belum ada anime di sini" />
      )}
    </div>
  )
}

export function OngoingPage() {
  return (
    <FilterPage
      seo={
        <Seo
          title={pageTitle('Anime Ongoing Sub Indo Terbaru')}
          description="Daftar anime ongoing subtitle Indonesia yang masih rilis episode baru tiap minggu. Update episode terbaru setiap hari."
          path="/ongoing"
        />
      }
      title="Sedang Tayang"
      subtitle="Masih rilis episode baru tiap minggu"
      filter={{ status: 'ongoing', order: 'update' }}
    />
  )
}

export function CompletedPage() {
  return (
    <FilterPage
      seo={
        <Seo
          title={pageTitle('Anime Tamat Sub Indo Lengkap')}
          description="Daftar anime tamat subtitle Indonesia dengan episode lengkap, pas buat maraton."
          path="/tamat"
        />
      }
      title="Sudah Tamat"
      subtitle="Episodenya udah lengkap, pas buat maraton"
      filter={{ status: 'completed', order: 'popular' }}
    />
  )
}

export function MoviePage() {
  return (
    <FilterPage
      seo={
        <Seo
          title={pageTitle('Film Anime Sub Indo')}
          description="Kumpulan film anime layar lebar subtitle Indonesia. Nonton gratis."
          path="/film"
        />
      }
      title="Film"
      subtitle="Film anime layar lebar"
      filter={{ type: 'movie', order: 'popular' }}
    />
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
      ) : data && data.length > 0 ? (
        <Card className="px-4">
          {data.map((a, i) => (
            <ListRow
              key={`${a.to}-${i}`}
              to={a.to}
              poster={a.poster}
              title={a.title}
              subtitle={a.meta}
              trailing={a.label ? <Pill tone={/complete|tamat|selesai/i.test(a.label) ? 'success' : 'primary'}>{a.label}</Pill> : null}
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {GENRES.map((g) => (
          <Link
            key={g.id}
            to={`/genre/${g.id}`}
            className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3.5 text-[15px] font-semibold text-ink shadow-card active:opacity-70"
          >
            {g.title}
            <ChevronRight className="size-4 text-ink-faint" />
          </Link>
        ))}
      </div>
    </div>
  )
}

export function GenrePage() {
  const { genreId = '' } = useParams()
  const genreTitle = GENRES.find((g) => g.id === genreId)?.title ?? genreId
  return (
    <FilterPage
      key={genreId}
      seo={
        <Seo
          title={pageTitle(`Anime ${genreTitle} Sub Indo`)}
          description={`Kumpulan anime genre ${genreTitle} subtitle Indonesia, urut paling populer.`}
          path={`/genre/${genreId}`}
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
      filter={{ genre: genreId, order: 'popular' }}
    />
  )
}

export function SchedulePage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['schedule'],
    queryFn: api.schedule,
    staleTime: 1000 * 60 * 30,
  })
  const [selected, setSelected] = useState<string | null>(null)
  const days = useMemo(() => [...(data ?? [])].sort((a, b) => dayOrder(a.day) - dayOrder(b.day)), [data])
  const isToday = (day: string) => normalizeDay(day) === normalizeDay(todayName())
  const active = selected ?? days.find((d) => isToday(d.day))?.day ?? days[0]?.day
  const current = days.find((d) => d.day === active)

  return (
    <div className="space-y-4">
      <Seo
        title={pageTitle('Jadwal Rilis Anime Sub Indo Minggu Ini')}
        description="Jadwal tayang anime ongoing subtitle Indonesia dari Senin sampai Minggu."
        path="/jadwal"
      />
      <PageTitle title="Jadwal Rilis" subtitle="Anime ongoing yang tayang tiap minggu" />
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-96 rounded-[20px]" />
      ) : (
        <>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {days.map((d) => (
              <Chip key={d.day} active={d.day === active} onClick={() => setSelected(d.day)}>
                {d.day}
                {isToday(d.day) ? <span className="size-1.5 rounded-full bg-success-500" aria-label="hari ini" /> : null}
              </Chip>
            ))}
          </div>
          <Card className="px-4">
            <div className="flex items-center justify-between border-b border-line py-3">
              <p className="font-bold text-ink">{active}</p>
              <span className="text-sm text-ink-muted">{current?.animeList.length ?? 0} anime</span>
            </div>
            {current?.animeList.map((a, i, arr) => (
              <ListRow
                key={`${a.to}-${i}`}
                to={a.to}
                poster={a.poster}
                title={a.title}
                subtitle={a.meta}
                trailing={a.label ? <Pill>{a.label}</Pill> : null}
                isLast={i === arr.length - 1}
              />
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
    queryKey: ['directory'],
    queryFn: api.directory,
    staleTime: 1000 * 60 * 30,
  })
  const [letter, setLetter] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const groups = useMemo(() => {
    const f = filter.trim().toLowerCase()
    return (data ?? [])
      .filter((g) => !letter || g.letter === letter)
      .map((g) => ({ ...g, animeList: f ? g.animeList.filter((a) => a.title.toLowerCase().includes(f)) : g.animeList }))
      .filter((g) => g.animeList.length > 0)
  }, [data, letter, filter])

  const letterBtn = (active: boolean) =>
    cn(
      'h-9 min-w-9 rounded-full px-2.5 text-sm font-semibold active:opacity-70',
      active ? 'bg-primary-500 text-on-primary' : 'bg-surface text-ink-soft shadow-card',
    )

  return (
    <div className="space-y-4">
      <Seo
        title={pageTitle('Daftar Anime Sub Indo A–Z')}
        description="Daftar lengkap semua anime subtitle Indonesia, urut abjad dari A sampai Z."
        path="/daftar"
      />
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
              <button key={g.letter} onClick={() => setLetter(g.letter)} className={letterBtn(letter === g.letter)}>
                {g.letter}
              </button>
            ))}
          </div>
          {groups.map((g) => (
            <div key={g.letter} className="space-y-2">
              <p className="px-1 text-xs font-semibold uppercase text-ink-faint">{g.letter}</p>
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
