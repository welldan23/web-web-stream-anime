import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ChevronRight, LayoutGrid, ListOrdered, Tv } from 'lucide-react'
import { api, type OngoingAnime } from '../lib/api'
import { normalizeDay, todayName } from '../lib/days'
import { shortEpisodeLabel } from '../lib/episodes'
import { timeAgo } from '../lib/time'
import { useLibrary } from '../lib/library'
import {
  AnimeCard,
  CardGrid,
  CardGridSkeleton,
  CardSection,
  ErrorState,
  ListRow,
  Pill,
  Poster,
  Score,
  Skeleton,
} from '../components/ui'
import { cn } from '../lib/cn'
import Seo from '../components/Seo'
import { DailyFactCard } from '../components/AnimeFacts'
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, websiteJsonLd } from '../lib/site'
import { SITE_URL } from '../lib/siteUrl'

const homeSeo = (
  <Seo
    title={DEFAULT_TITLE}
    description={DEFAULT_DESCRIPTION}
    path="/"
    jsonLd={[websiteJsonLd(SITE_URL)]}
  />
)

/** Kartu abu muda paling atas: lanjut nonton, atau ringkasan rilis hari ini. */
function TopCard({ today }: { today: OngoingAnime[] }) {
  const { history } = useLibrary()
  const last = history[0]

  if (last) {
    return (
      <Link
        to={`/nonton/${last.episodeId}`}
        className="flex items-center gap-4 rounded-[20px] bg-subtle px-4 py-4 active:opacity-80"
      >
        <Poster src={last.poster} alt={last.animeTitle} className="h-20 w-15 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink-muted">Lanjut nonton</p>
          <p className="mt-0.5 line-clamp-1 text-xl font-bold text-ink sm:text-2xl">{last.animeTitle}</p>
          <p className="mt-0.5 text-sm font-semibold text-ink-muted">
            {shortEpisodeLabel(last.episodeTitle)} · {timeAgo(last.watchedAt)}
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-card">
          <ChevronRight className="size-[18px]" />
        </span>
      </Link>
    )
  }

  return (
    <Link to="/jadwal" className="flex items-center gap-4 rounded-[20px] bg-subtle px-4 py-4 active:opacity-80">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-ink-muted">Rilis hari ini · {todayName()}</p>
        <p className="mt-0.5 text-[32px] font-bold leading-tight tracking-tight text-ink">
          {today.length} <span className="text-xl">anime</span>
        </p>
        <p className="mt-1 text-[11px] font-medium text-ink-faint">Episode baru tiap minggu, sub Indo</p>
      </div>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-card">
        <ChevronRight className="size-[18px]" />
      </span>
    </Link>
  )
}

const SHORTCUTS = [
  { to: '/ongoing', label: 'Ongoing', icon: Tv, tile: 'bg-tile', color: 'text-primary-500' },
  { to: '/tamat', label: 'Tamat', icon: CheckCircle2, tile: 'bg-success-50', color: 'text-success-500' },
  { to: '/genre', label: 'Genre', icon: LayoutGrid, tile: 'bg-tile', color: 'text-primary-500' },
  { to: '/daftar', label: 'A–Z', icon: ListOrdered, tile: 'bg-tile', color: 'text-primary-500' },
]

function Shortcuts() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {SHORTCUTS.map(({ to, label, icon: Icon, tile, color }) => (
        <Link
          key={to}
          to={to}
          className={cn('flex flex-col items-center justify-center gap-1.5 rounded-[18px] py-4 active:opacity-70', tile)}
        >
          <Icon className={cn('size-6', color)} />
          <span className="text-[13px] font-medium text-ink">{label}</span>
        </Link>
      ))}
    </div>
  )
}

export default function HomePage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['home'], queryFn: api.home })

  if (error)
    return (
      <>
        {homeSeo}
        <ErrorState error={error} onRetry={() => refetch()} />
      </>
    )

  const ongoing = data?.ongoing.animeList ?? []
  const completed = data?.completed.animeList ?? []
  const today = ongoing.filter((a) => normalizeDay(a.releaseDay) === normalizeDay(todayName()))

  return (
    <div className="space-y-4">
      {homeSeo}
      <h1 className="sr-only">Animeku – Nonton Anime Sub Indo Gratis</h1>
      {isLoading ? <Skeleton className="h-28 rounded-[20px]" /> : <TopCard today={today} />}

      <Shortcuts />

      <DailyFactCard />

      {today.length > 0 ? (
        <CardSection title="Rilis Hari Ini" more={{ to: '/jadwal', label: 'Jadwal' }}>
          <div>
            {today.slice(0, 5).map((a, i, arr) => (
              <ListRow
                key={a.animeId}
                to={`/anime/${a.animeId}`}
                poster={a.poster}
                title={a.title}
                subtitle={`Update ${a.latestReleaseDate}`}
                trailing={<Pill>Ep {a.episodes}</Pill>}
                isLast={i === arr.length - 1}
              />
            ))}
          </div>
        </CardSection>
      ) : null}

      <CardSection title="Sedang Tayang" more={{ to: '/ongoing' }}>
        {isLoading ? (
          <CardGridSkeleton />
        ) : (
          <CardGrid>
            {ongoing.map((a) => (
              <AnimeCard
                key={a.animeId}
                animeId={a.animeId}
                title={a.title}
                poster={a.poster}
                label={`Ep ${a.episodes}`}
                meta={a.releaseDay}
              />
            ))}
          </CardGrid>
        )}
      </CardSection>

      <CardSection title="Baru Tamat" more={{ to: '/tamat' }}>
        {isLoading ? (
          <CardGridSkeleton />
        ) : (
          <CardGrid>
            {completed.map((a) => (
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
      </CardSection>
    </div>
  )
}
