import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bookmark, BookmarkCheck, CalendarDays, ChevronRight, Info, Play, X } from 'lucide-react'
import { api, type OngoingAnime } from '../lib/api'
import { normalizeDay, todayName } from '../lib/days'
import { shortEpisodeLabel } from '../lib/episodes'
import { isInWatchlist, removeHistory, toggleWatchlist, useLibrary } from '../lib/library'
import {
  AnimeCard,
  Badge,
  CardGrid,
  CardGridSkeleton,
  ErrorState,
  Poster,
  ScoreBadge,
  Section,
  Skeleton,
} from '../components/ui'
import { cn } from '../lib/cn'

function Hero({ items }: { items: OngoingAnime[] }) {
  const [index, setIndex] = useState(0)
  useLibrary() // re-render saat koleksi berubah
  const current = items[index]

  useEffect(() => {
    if (items.length < 2) return
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), 7000)
    return () => clearInterval(id)
  }, [items.length, index])

  if (!current) return null
  const saved = isInWatchlist(current.animeId)

  return (
    <section className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-3xl">
      {/* background blur dari poster */}
      <div className="absolute inset-0">
        <img
          key={current.poster}
          src={current.poster}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full scale-110 object-cover opacity-50 blur-2xl"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/80 to-bg/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
      </div>

      <div className="relative flex min-h-[340px] items-center gap-8 px-5 py-10 sm:min-h-[400px] sm:px-10">
        <div key={current.animeId} className="max-w-xl flex-1 space-y-4 animate-fade-in">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">#{index + 1} Sorotan Minggu Ini</p>
          <h1 className="line-clamp-2 text-3xl font-extrabold leading-tight sm:text-5xl">{current.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-300">
            <Badge tone="accent">Episode {current.episodes}</Badge>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4 text-muted" /> Tayang tiap {current.releaseDay}
            </span>
            <span className="text-muted">• Update {current.latestReleaseDate}</span>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to={`/anime/${current.animeId}`}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-5 py-3 text-sm font-bold shadow-lg shadow-accent/30 transition hover:brightness-110"
            >
              <Play className="size-4 fill-white" /> Tonton Sekarang
            </Link>
            <button
              onClick={() =>
                toggleWatchlist({ animeId: current.animeId, title: current.title, poster: current.poster })
              }
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-bold backdrop-blur transition hover:bg-white/20"
            >
              {saved ? <BookmarkCheck className="size-4 text-accent" /> : <Bookmark className="size-4" />}
              {saved ? 'Di Koleksi' : 'Koleksi'}
            </button>
            <Link
              to={`/anime/${current.animeId}`}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-300 hover:text-white"
            >
              <Info className="size-4" /> Detail
            </Link>
          </div>
        </div>
        <Poster
          src={current.poster}
          alt={current.title}
          className="hidden aspect-[2/3] w-52 shrink-0 rotate-2 rounded-2xl shadow-2xl ring-1 ring-white/10 md:block lg:w-60"
        />
      </div>

      <div className="relative flex justify-center gap-1.5 pb-5 sm:justify-start sm:px-10">
        {items.map((item, i) => (
          <button
            key={item.animeId}
            onClick={() => setIndex(i)}
            aria-label={`Sorotan ${i + 1}`}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === index ? 'w-8 bg-accent' : 'w-3 bg-white/25 hover:bg-white/40',
            )}
          />
        ))}
      </div>
    </section>
  )
}

function ContinueWatching() {
  const { history } = useLibrary()
  if (history.length === 0) return null

  return (
    <Section
      title="Lanjut Nonton"
      action={
        <Link to="/riwayat" className="flex items-center text-sm font-semibold text-muted hover:text-white">
          Semua <ChevronRight className="size-4" />
        </Link>
      }
    >
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {history.slice(0, 10).map((h) => (
          <div key={h.animeId} className="group relative w-64 shrink-0">
            <Link to={`/nonton/${h.episodeId}`} className="flex gap-3 rounded-xl border border-line bg-surface p-2 transition hover:border-accent/50">
              <Poster src={h.poster} alt={h.animeTitle} className="aspect-[2/3] w-14 shrink-0 rounded-lg" />
              <div className="min-w-0 py-1">
                <p className="line-clamp-2 text-sm font-semibold leading-snug">{h.animeTitle}</p>
                <p className="mt-1 line-clamp-1 text-xs text-accent">{shortEpisodeLabel(h.episodeTitle)}</p>
              </div>
            </Link>
            <button
              onClick={() => removeHistory(h.animeId)}
              className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-md bg-bg/80 text-muted transition hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="Hapus dari riwayat"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </Section>
  )
}

function TodaySchedule({ list }: { list: OngoingAnime[] }) {
  const today = todayName()
  const items = list.filter((a) => normalizeDay(a.releaseDay) === normalizeDay(today))
  if (items.length === 0) return null

  return (
    <Section
      title={`Rilis Hari Ini — ${today}`}
      action={
        <Link to="/jadwal" className="flex items-center text-sm font-semibold text-muted hover:text-white">
          Jadwal lengkap <ChevronRight className="size-4" />
        </Link>
      }
    >
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {items.map((a) => (
          <div key={a.animeId} className="w-36 shrink-0 sm:w-40">
            <AnimeCard
              animeId={a.animeId}
              title={a.title}
              poster={a.poster}
              topLeft={<Badge tone="accent">Ep {a.episodes}</Badge>}
              subtitle={a.latestReleaseDate}
            />
          </div>
        ))}
      </div>
    </Section>
  )
}

export default function HomePage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['home'], queryFn: api.home })

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />

  const ongoing = data?.ongoing.animeList ?? []
  const completed = data?.completed.animeList ?? []

  return (
    <div className="space-y-10">
      {isLoading ? <Skeleton className="h-[400px] rounded-3xl" /> : <Hero items={ongoing.slice(0, 6)} />}

      <ContinueWatching />

      {!isLoading ? <TodaySchedule list={ongoing} /> : null}

      <Section
        title="Sedang Tayang"
        action={
          <Link to="/ongoing" className="flex items-center text-sm font-semibold text-muted hover:text-white">
            Lihat semua <ChevronRight className="size-4" />
          </Link>
        }
      >
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
                topLeft={<Badge tone="accent">Ep {a.episodes}</Badge>}
                subtitle={`${a.releaseDay} • ${a.latestReleaseDate}`}
              />
            ))}
          </CardGrid>
        )}
      </Section>

      <Section
        title="Baru Tamat"
        action={
          <Link to="/tamat" className="flex items-center text-sm font-semibold text-muted hover:text-white">
            Lihat semua <ChevronRight className="size-4" />
          </Link>
        }
      >
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
                topLeft={<Badge>{a.episodes} Eps</Badge>}
                topRight={<ScoreBadge score={a.score} />}
                subtitle={a.lastReleaseDate}
              />
            ))}
          </CardGrid>
        )}
      </Section>
    </div>
  )
}
