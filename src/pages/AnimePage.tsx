import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownUp, Bookmark, BookmarkCheck, CheckCircle2, Clock, Play, Search, Star, Tv } from 'lucide-react'
import { api } from '../lib/api'
import { shortEpisodeLabel, sortEpisodesAsc } from '../lib/episodes'
import { isInWatchlist, toggleWatchlist, useLibrary } from '../lib/library'
import { AnimeCard, CardGrid, ErrorState, Poster, Section, Skeleton } from '../components/ui'
import { cn } from '../lib/cn'

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <dt className="w-24 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 font-medium">{value}</dd>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 sm:flex-row">
        <Skeleton className="aspect-[2/3] w-44 sm:w-56" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-24" />
        </div>
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}

export default function AnimePage() {
  const { animeId = '' } = useParams()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['anime', animeId],
    queryFn: () => api.anime(animeId),
  })
  const library = useLibrary()
  const [newestFirst, setNewestFirst] = useState(false)
  const [filter, setFilter] = useState('')
  const [expanded, setExpanded] = useState(false)

  const episodes = useMemo(() => {
    const asc = sortEpisodesAsc(data?.episodeList ?? [])
    const ordered = newestFirst ? [...asc].reverse() : asc
    const f = filter.trim()
    return f ? ordered.filter((e) => shortEpisodeLabel(e.title).toLowerCase().includes(f.toLowerCase())) : ordered
  }, [data, newestFirst, filter])

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (isLoading || !data) return <DetailSkeleton />

  const firstEpisode = sortEpisodesAsc(data.episodeList)[0]
  const lastWatched = library.history.find((h) => h.animeId === animeId)
  const saved = isInWatchlist(animeId)
  const synopsis = data.synopsis.paragraphList.filter(Boolean)

  return (
    <div className="space-y-10">
      {/* Header */}
      <section className="relative -mx-4 -mt-6 overflow-hidden sm:-mx-6">
        <div className="absolute inset-0">
          <img
            src={data.poster}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full scale-110 object-cover opacity-30 blur-3xl"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/30" />
        </div>
        <div className="relative flex flex-col gap-6 px-4 pb-6 pt-8 sm:flex-row sm:px-6 sm:pt-12">
          <Poster
            src={data.poster}
            alt={data.title}
            className="aspect-[2/3] w-40 shrink-0 self-center rounded-2xl shadow-2xl ring-1 ring-white/10 sm:w-56 sm:self-start"
          />
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <h1 className="text-2xl font-extrabold leading-tight sm:text-4xl">{data.title}</h1>
              {data.japanese ? <p className="mt-1 text-sm text-muted">{data.japanese}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {data.score ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400/15 px-2.5 py-1.5 text-amber-300">
                  <Star className="size-3.5 fill-current" /> {data.score}
                </span>
              ) : null}
              {data.type ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1.5">
                  <Tv className="size-3.5" /> {data.type}
                </span>
              ) : null}
              {data.status ? (
                <span
                  className={cn(
                    'rounded-lg px-2.5 py-1.5',
                    /complete|tamat/i.test(data.status)
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-accent/15 text-accent',
                  )}
                >
                  {data.status}
                </span>
              ) : null}
              {data.duration ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1.5">
                  <Clock className="size-3.5" /> {data.duration}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {data.genreList.map((g) => (
                <Link
                  key={g.genreId}
                  to={`/genre/${g.genreId}`}
                  className="rounded-full border border-line px-3 py-1 text-xs font-medium text-zinc-300 transition hover:border-accent hover:text-accent"
                >
                  {g.title}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {lastWatched ? (
                <Link
                  to={`/nonton/${lastWatched.episodeId}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-5 py-3 text-sm font-bold shadow-lg shadow-accent/30 hover:brightness-110"
                >
                  <Play className="size-4 fill-white" /> Lanjut {shortEpisodeLabel(lastWatched.episodeTitle)}
                </Link>
              ) : firstEpisode ? (
                <Link
                  to={`/nonton/${firstEpisode.episodeId}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-5 py-3 text-sm font-bold shadow-lg shadow-accent/30 hover:brightness-110"
                >
                  <Play className="size-4 fill-white" /> Mulai Nonton
                </Link>
              ) : null}
              <button
                onClick={() => toggleWatchlist({ animeId, title: data.title, poster: data.poster })}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-bold hover:bg-white/20"
              >
                {saved ? <BookmarkCheck className="size-4 text-accent" /> : <Bookmark className="size-4" />}
                {saved ? 'Di Koleksi' : 'Tambah ke Koleksi'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-10">
          {synopsis.length > 0 ? (
            <Section title="Sinopsis">
              <div className={cn('space-y-3 text-sm leading-relaxed text-zinc-300', !expanded && 'line-clamp-5')}>
                {synopsis.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <button onClick={() => setExpanded((v) => !v)} className="text-sm font-semibold text-accent">
                {expanded ? 'Tutup' : 'Baca selengkapnya'}
              </button>
            </Section>
          ) : null}

          <Section
            title={`Episode (${data.episodeList.length})`}
            action={
              <button
                onClick={() => setNewestFirst((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:text-white"
              >
                <ArrowDownUp className="size-3.5" /> {newestFirst ? 'Terbaru' : 'Terlama'}
              </button>
            }
          >
            {data.episodeList.length > 12 ? (
              <div className="relative max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Cari nomor episode…"
                  inputMode="numeric"
                  className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm outline-none focus:border-accent/60"
                />
              </div>
            ) : null}
            {episodes.length === 0 ? (
              <p className="text-sm text-muted">Belum ada episode.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {episodes.map((e) => {
                  const watched = library.watched.includes(e.episodeId)
                  return (
                    <Link
                      key={e.episodeId}
                      to={`/nonton/${e.episodeId}`}
                      title={e.title}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition',
                        watched
                          ? 'border-accent/30 bg-accent/10 text-zinc-300'
                          : 'border-line bg-surface hover:border-accent/50 hover:text-accent',
                      )}
                    >
                      <span className="truncate">{shortEpisodeLabel(e.title)}</span>
                      {watched ? <CheckCircle2 className="size-4 shrink-0 text-accent" /> : null}
                    </Link>
                  )
                })}
              </div>
            )}
            {data.batch ? (
              <p className="text-xs text-muted">Tersedia juga versi batch (download semua episode) di sumber aslinya.</p>
            ) : null}
          </Section>
        </div>

        <aside className="h-fit rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-2 font-bold">Informasi</h2>
          <dl className="divide-y divide-line">
            <InfoRow label="Judul Jepang" value={data.japanese} />
            <InfoRow label="Tipe" value={data.type} />
            <InfoRow label="Status" value={data.status} />
            <InfoRow label="Episode" value={data.episodes} />
            <InfoRow label="Durasi" value={data.duration} />
            <InfoRow label="Tayang" value={data.aired} />
            <InfoRow label="Studio" value={data.studios} />
            <InfoRow label="Produser" value={data.producers} />
            <InfoRow label="Skor" value={data.score} />
          </dl>
        </aside>
      </div>

      {data.recommendedAnimeList.length > 0 ? (
        <Section title="Rekomendasi Buat Kamu">
          <CardGrid>
            {data.recommendedAnimeList.slice(0, 12).map((a) => (
              <AnimeCard key={a.animeId} animeId={a.animeId} title={a.title} poster={a.poster} />
            ))}
          </CardGrid>
        </Section>
      ) : null}
    </div>
  )
}
