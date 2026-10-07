import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownUp, Bookmark, BookmarkCheck, Check, Play, Search } from 'lucide-react'
import { api } from '../lib/api'
import { shortEpisodeLabel, sortEpisodesAsc } from '../lib/episodes'
import { isInWatchlist, toggleWatchlist, useLibrary } from '../lib/library'
import { cn } from '../lib/cn'
import BackButton from '../components/BackButton'
import { AnimeFactCard } from '../components/AnimeFacts'
import { AniListBanner, AniListStats, Characters, ExternalLinks, NextEpisode, Trailer } from '../components/AniList'
import { findAniList, seasonLabel } from '../lib/anilist'
import { databaseLinks, getAnimeIds } from '../lib/animeMeta'
import Seo from '../components/Seo'
import { ApiError } from '../lib/api'
import { animeMeta, pageTitle, titleFromSlug, DEFAULT_DESCRIPTION } from '../lib/site'
import { SITE_URL } from '../lib/siteUrl'
import { AnimeCard, Card, CardGrid, CardSection, ErrorState, Pill, Poster, Score, Skeleton } from '../components/ui'

function InfoRow({ label, value, isLast }: { label: string; value?: string; isLast?: boolean }) {
  if (!value) return null
  return (
    <div className={cn('flex gap-3 py-3 text-sm', !isLast && 'border-b border-line')}>
      <dt className="w-24 shrink-0 text-ink-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-right font-medium text-ink">{value}</dd>
    </div>
  )
}

export default function AnimePage() {
  const { animeId = '' } = useParams()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['anime', animeId],
    queryFn: () => api.anime(animeId),
  })
  // data tambahan dari AniList; kalau gagal/nggak ketemu, halaman tetap jalan tanpa bagian ini
  const { data: al } = useQuery({
    queryKey: ['anilist', animeId],
    queryFn: () => findAniList(animeId, data!.title, data!.japanese),
    enabled: Boolean(data),
    staleTime: 1000 * 60 * 60 * 6,
    retry: 1,
  })
  // ID anime yang sama di situs database lain (OtakOtaku, Kitsu, TMDB, ...)
  const { data: ids } = useQuery({
    queryKey: ['anime-ids', al?.id],
    queryFn: () => getAnimeIds(al!.id),
    enabled: Boolean(al),
    staleTime: 1000 * 60 * 60 * 24,
    retry: false,
  })
  const library = useLibrary()
  const [newestFirst, setNewestFirst] = useState(false)
  const [filter, setFilter] = useState('')
  const [expanded, setExpanded] = useState(false)

  const episodes = useMemo(() => {
    const asc = sortEpisodesAsc(data?.episodeList ?? [])
    const ordered = newestFirst ? [...asc].reverse() : asc
    const f = filter.trim().toLowerCase()
    return f ? ordered.filter((e) => shortEpisodeLabel(e.title).toLowerCase().includes(f)) : ordered
  }, [data, newestFirst, filter])

  const fallbackSeo = (
    <Seo
      title={pageTitle(`Nonton ${titleFromSlug(animeId)} Sub Indo`)}
      description={DEFAULT_DESCRIPTION}
      path={`/anime/${animeId}`}
      noindex={error instanceof ApiError && error.status === 404}
    />
  )

  if (error)
    return (
      <div className="space-y-4">
        {fallbackSeo}
        <BackButton />
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    )

  if (isLoading || !data)
    return (
      <div className="space-y-4">
        {fallbackSeo}
        <BackButton />
        <Skeleton className="h-52 rounded-[20px]" />
        <Skeleton className="h-64 rounded-[20px]" />
      </div>
    )

  const firstEpisode = sortEpisodesAsc(data.episodeList)[0]
  const lastWatched = library.history.find((h) => h.animeId === animeId)
  const target = lastWatched?.episodeId ?? firstEpisode?.episodeId
  const saved = isInWatchlist(animeId)
  const synopsis = data.synopsis.paragraphList.filter(Boolean)
  const finished = /complete|tamat/i.test(data.status)
  const infoRows: [string, string | undefined][] = [
    ['Judul Jepang', data.japanese],
    ['Tipe', data.type],
    ['Status', data.status],
    ['Episode', data.episodes],
    ['Durasi', data.duration],
    ['Tayang', data.aired],
    ['Musim', al ? (seasonLabel(al) ?? undefined) : undefined],
    ['Studio', data.studios || al?.studios.nodes.map((s) => s.name).join(', ')],
    ['Produser', data.producers],
  ]
  const info = infoRows.filter((row): row is [string, string] => Boolean(row[1]))

  return (
    <div className="space-y-4">
      <Seo {...animeMeta(SITE_URL, animeId, data)} />
      <BackButton />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <Card className="p-4 sm:p-5">
            {al ? <AniListBanner media={al} title={data.title} /> : null}
            <div className="flex gap-4">
              <Poster src={data.poster} alt={data.title} className="aspect-[3/4] w-28 rounded-[14px] sm:w-36" />
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold leading-snug text-ink sm:text-2xl">{data.title}</h1>
                {data.japanese ? <p className="mt-0.5 line-clamp-1 text-sm text-ink-muted">{data.japanese}</p> : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {data.status ? <Pill tone={finished ? 'success' : 'primary'}>{data.status}</Pill> : null}
                  {data.type ? <Pill tone="neutral">{data.type}</Pill> : null}
                  <Score score={data.score} className="text-sm" />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {data.genreList.map((g) => (
                    <Link
                      key={g.genreId}
                      to={`/genre/${g.genreId}`}
                      className="text-[13px] font-medium text-primary-500 hover:underline"
                    >
                      #{g.title.replace(/\s+/g, '')}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              {target ? (
                <Link
                  to={`/nonton/${target}`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary-500 px-5 py-3 text-[15px] font-semibold text-on-primary active:opacity-80"
                >
                  <Play className="size-4 fill-on-primary" />
                  {lastWatched ? `Lanjut ${shortEpisodeLabel(lastWatched.episodeTitle)}` : 'Mulai Nonton'}
                </Link>
              ) : null}
              <button
                onClick={() => toggleWatchlist({ animeId, title: data.title, poster: data.poster })}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-semibold active:opacity-80',
                  saved ? 'bg-success-50 text-success-600' : 'bg-primary-50 text-primary-600',
                )}
              >
                {saved ? <BookmarkCheck className="size-[18px]" /> : <Bookmark className="size-[18px]" />}
                {saved ? 'Tersimpan' : 'Simpan'}
              </button>
            </div>
          </Card>

          {al ? <NextEpisode media={al} /> : null}
          {al ? <AniListStats media={al} /> : null}

          {synopsis.length > 0 ? (
            <CardSection title="Sinopsis">
              <div className={cn('space-y-3 text-[15px] leading-relaxed text-ink-soft', !expanded && 'line-clamp-4')}>
                {synopsis.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <button onClick={() => setExpanded((v) => !v)} className="mt-2 text-sm font-semibold text-primary-500">
                {expanded ? 'Tutup' : 'Selengkapnya'}
              </button>
            </CardSection>
          ) : null}

          <AnimeFactCard titles={[data.title, al?.title.romaji, al?.title.english]} />

          {al ? <Trailer media={al} title={data.title} /> : null}

          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-ink sm:text-xl">
                Episode <span className="font-medium text-ink-muted">({data.episodeList.length})</span>
              </h2>
              <button
                onClick={() => setNewestFirst((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full bg-tile px-3 py-1.5 text-[13px] font-semibold text-ink-soft active:opacity-70"
              >
                <ArrowDownUp className="size-3.5" /> {newestFirst ? 'Terbaru' : 'Terlama'}
              </button>
            </div>
            {data.episodeList.length > 12 ? (
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Cari nomor episode"
                  inputMode="numeric"
                  className="h-10 w-full rounded-full bg-subtle pl-10 pr-4 text-sm outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-primary-500/30"
                />
              </div>
            ) : null}
            {episodes.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-muted">Belum ada episode.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {episodes.map((e) => {
                  const watched = library.watched.includes(e.episodeId)
                  return (
                    <Link
                      key={e.episodeId}
                      to={`/nonton/${e.episodeId}`}
                      title={e.title}
                      className={cn(
                        'flex items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-sm font-semibold active:opacity-70',
                        watched ? 'bg-success-50 text-success-600' : 'bg-subtle text-ink hover:bg-tile',
                      )}
                    >
                      {watched ? <Check className="size-3.5" /> : null}
                      <span className="truncate">{shortEpisodeLabel(e.title).replace('Episode ', 'Ep ')}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </Card>

          {al ? <Characters media={al} /> : null}
        </div>

        <div className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase text-ink-faint">Informasi</p>
          <Card className="px-4">
            <dl>
              {info.map(([label, value], i) => (
                <InfoRow key={label} label={label} value={value} isLast={i === info.length - 1} />
              ))}
            </dl>
          </Card>
          {al ? (
            <div className="pt-2">
              <ExternalLinks media={al} more={ids ? databaseLinks(ids) : undefined} />
            </div>
          ) : null}
        </div>
      </div>

      {data.recommendedAnimeList.length > 0 ? (
        <CardSection title="Mirip Sama Ini">
          <CardGrid>
            {data.recommendedAnimeList.slice(0, 12).map((a) => (
              <AnimeCard key={a.animeId} animeId={a.animeId} title={a.title} poster={a.poster} />
            ))}
          </CardGrid>
        </CardSection>
      ) : null}
    </div>
  )
}
