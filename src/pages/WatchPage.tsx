import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ExternalLink, Loader2, ShieldCheck } from 'lucide-react'
import { animePath, api, ApiError, episodeKey, episodePath, episodeRange } from '../lib/api'
import { recordWatch, useLibrary } from '../lib/library'
import { preferredQuality, rememberQuality, type DirectSource } from '../lib/player'
import { cn } from '../lib/cn'
import DirectPlayer from '../components/DirectPlayer'
import Seo from '../components/Seo'
import { DEFAULT_DESCRIPTION, episodeMeta, pageTitle, titleFromSlug } from '../lib/site'
import { SITE_URL } from '../lib/siteUrl'
import { Card, Chip, ErrorState, Notice, Pill, Skeleton } from '../components/ui'

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <p className="px-1 text-xs font-semibold uppercase text-ink-faint">{children}</p>
}

/** "720" -> "720p", "720p" -> "720p", "HD" -> "HD" */
function qualityLabel(raw: string) {
  const t = raw.trim()
  return /^\d+$/.test(t) ? `${t}p` : t || 'Video'
}

export default function WatchPage() {
  const { animeId = '', slug = '', episode: epParam = '' } = useParams()
  const ref = { animeId, animeSlug: slug }
  const thisKey = episodeKey(ref, epParam)
  const library = useLibrary()
  const activeEpisodeRef = useRef<HTMLAnchorElement>(null)
  // kualitas yang dipilih manual, diikat ke episode-nya
  const [picked, setPicked] = useState<{ key: string; quality: string } | null>(null)
  // episode yang videonya gagal diputar
  const [failed, setFailed] = useState<string | null>(null)

  const episode = useQuery({
    queryKey: ['episode', animeId, slug, epParam],
    queryFn: () => api.episode(animeId, slug, epParam),
  })
  const anime = useQuery({
    queryKey: ['anime', animeId, slug],
    queryFn: () => api.anime(animeId, slug),
  })
  const ep = episode.data
  const epNumber = Number.parseFloat(epParam)
  const animeTitle = anime.data?.title ?? ep?.title ?? titleFromSlug(slug)
  const episodeTitle = `${animeTitle} Episode ${epParam}`

  const sources: DirectSource[] = useMemo(() => {
    const list = (ep?.server.qualityList ?? [])
      .flatMap((q) => (q.urlList ?? []).map((u) => ({ quality: qualityLabel(q.title), url: u.url })))
      .filter((s) => /^https?:\/\//i.test(s.url))
      .sort((a, b) => (Number.parseInt(b.quality, 10) || 0) - (Number.parseInt(a.quality, 10) || 0))
    // satu link per kualitas
    return list.filter((s, i) => list.findIndex((x) => x.quality === s.quality) === i)
  }, [ep])
  const quality = (picked?.key === thisKey ? picked.quality : null) ?? preferredQuality(sources)
  const current = sources.find((s) => s.quality === quality) ?? sources[0]
  const playFailed = failed === thisKey

  const pickQuality = (q: string) => {
    rememberQuality(q)
    setFailed(null)
    setPicked({ key: thisKey, quality: q })
  }

  // simpan ke riwayat setelah data episode (dan anime, kalau ada) kelar dimuat
  const animeSettled = anime.isSuccess || anime.isError
  useEffect(() => {
    if (!ep || !animeSettled) return
    recordWatch({
      animeId: `${animeId}/${slug}`,
      animeTitle,
      poster: anime.data?.poster ?? '',
      episodeId: thisKey,
      episodeTitle,
    })
  }, [ep, animeSettled, anime.data, animeId, slug, animeTitle, episodeTitle, thisKey])

  const episodes = useMemo(() => (anime.data ? episodeRange(anime.data) : []), [anime.data])

  // geser panel episode ke episode yang lagi diputar (cuma panelnya, halaman nggak ikut ke-scroll)
  useEffect(() => {
    const item = activeEpisodeRef.current
    const panel = item?.parentElement
    if (!item || !panel) return
    panel.scrollTop = item.offsetTop - panel.clientHeight / 2 + item.clientHeight / 2
  }, [episodes, epParam])

  const seo = ep ? (
    <Seo
      {...episodeMeta(
        SITE_URL,
        thisKey,
        { title: episodeTitle, animeId: `${animeId}/${slug}`, releaseTime: ep.lastUpdated },
        { title: animeTitle, poster: anime.data?.poster },
      )}
    />
  ) : (
    <Seo
      title={pageTitle(`Nonton ${titleFromSlug(slug)} Episode ${epParam} Sub Indo`)}
      description={DEFAULT_DESCRIPTION}
      path={`/nonton/${thisKey}`}
      noindex={episode.error instanceof ApiError && episode.error.status === 404}
    />
  )

  if (episode.error)
    return (
      <>
        {seo}
        <ErrorState error={episode.error} onRetry={() => episode.refetch()} />
      </>
    )

  const downloads = ep?.download.qualityList.filter((q) => q.urlList && q.urlList.length > 0) ?? []

  return (
    <div className="space-y-4">
      {seo}
      <Link
        to={animePath(ref)}
        className="inline-flex max-w-full items-center gap-2 py-1 text-[15px] font-semibold text-ink active:opacity-70"
      >
        <ArrowLeft className="size-6 shrink-0" />
        <span className="truncate">{anime.data?.title ?? ep?.title ?? 'Detail anime'}</span>
      </Link>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-[20px] bg-black">
            {episode.isLoading ? (
              <div className="absolute inset-0 grid place-items-center">
                <Loader2 className="size-8 animate-spin text-white/70" />
              </div>
            ) : current && !playFailed ? (
              <DirectPlayer
                key={thisKey}
                episodeId={thisKey}
                sources={sources}
                quality={current.quality}
                onFail={() => setFailed(thisKey)}
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white/70">
                {playFailed
                  ? 'Video gagal diputar. Coba kualitas lain atau download di bawah.'
                  : 'Video episode ini belum tersedia. Coba lagi nanti atau download di bawah.'}
              </div>
            )}
          </div>

          <Card className="p-4 sm:p-5">
            {ep ? (
              <>
                <p className="text-[13px] font-medium text-ink-muted">
                  {ep.episodeTitle || `Episode ${epParam}`}
                  {ep.lastUpdated ? ` · ${ep.lastUpdated}` : ''}
                </p>
                <h1 className="mt-0.5 text-lg font-bold leading-snug text-ink sm:text-xl">{episodeTitle}</h1>
              </>
            ) : (
              <Skeleton className="h-12" />
            )}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <EpisodeNav to={ep?.prevEpisode ? episodePath(ref, ep.prevEpisode.episodeId) : undefined} dir="prev" />
              <EpisodeNav to={ep?.nextEpisode ? episodePath(ref, ep.nextEpisode.episodeId) : undefined} dir="next" />
            </div>
          </Card>

          {playFailed ? <Notice tone="danger">Video gagal diputar di kualitas ini. Coba kualitas lain.</Notice> : null}

          {sources.length > 0 ? (
            <div className="space-y-2">
              <GroupTitle>Kualitas</GroupTitle>
              <Card className="px-4 py-3">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <ShieldCheck className="size-4 text-success-500" /> Bebas iklan
                  <span className="font-normal text-ink-muted">· diputar langsung di Animeku</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {sources.map((s) => (
                    <Chip size="sm" key={s.quality} active={current?.quality === s.quality && !playFailed} onClick={() => pickQuality(s.quality)}>
                      {s.quality}
                    </Chip>
                  ))}
                </div>
              </Card>
              {current ? (
                <div className="flex justify-end px-1">
                  <a
                    href={current.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary-500 hover:underline"
                  >
                    Buka video di tab baru <ExternalLink className="size-3" />
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}

          {downloads.length > 0 ? (
            <div className="space-y-2">
              <GroupTitle>Download</GroupTitle>
              <Card className="px-4">
                {downloads.map((q, i) => (
                  <div
                    key={`${q.title}-${i}`}
                    className={cn('flex flex-wrap items-center gap-2 py-3', i < downloads.length - 1 && 'border-b border-line')}
                  >
                    <div className="mr-auto min-w-28">
                      <p className="text-sm font-semibold text-ink">{q.title}</p>
                      {q.size ? <p className="text-xs text-ink-muted">{q.size}</p> : null}
                    </div>
                    {q.urlList!.map((u, j) => (
                      <a
                        key={`${u.title}-${j}`}
                        href={u.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1.5 text-[13px] font-semibold text-primary-600 active:opacity-70"
                      >
                        {u.title}
                        <ExternalLink className="size-3" />
                      </a>
                    ))}
                  </div>
                ))}
              </Card>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <GroupTitle>Daftar episode ({episodes.length})</GroupTitle>
          <Card className="overflow-hidden">
            <div className="thin-scroll relative max-h-[420px] overflow-y-auto lg:max-h-[calc(100dvh-160px)]">
              {episodes.length === 0
                ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="m-3 h-8" />)
                : episodes.map((n, i) => {
                    const active = n === epNumber
                    const watched = library.watched.includes(episodeKey(ref, n))
                    return (
                      <Link
                        key={n}
                        ref={active ? activeEpisodeRef : undefined}
                        to={episodePath(ref, n)}
                        className={cn(
                          'flex items-center justify-between gap-2 px-4 py-3 text-[15px] active:opacity-70',
                          i < episodes.length - 1 && 'border-b border-line',
                          active ? 'bg-primary-50 font-semibold text-primary-600' : 'text-ink hover:bg-subtle',
                        )}
                      >
                        <span className="truncate">Episode {n}</span>
                        {active ? (
                          <Pill>Diputar</Pill>
                        ) : watched ? (
                          <Check className="size-4 shrink-0 text-success-500" aria-label="sudah ditonton" />
                        ) : null}
                      </Link>
                    )
                  })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function EpisodeNav({ to, dir }: { to?: string; dir: 'prev' | 'next' }) {
  const prev = dir === 'prev'
  const base = 'flex items-center justify-center gap-1 rounded-full py-3 text-[15px] font-semibold'
  const content = (
    <>
      {prev ? <ChevronLeft className="size-[18px]" /> : null}
      {prev ? 'Sebelumnya' : 'Berikutnya'}
      {!prev ? <ChevronRight className="size-[18px]" /> : null}
    </>
  )
  if (!to) {
    return (
      <span className={cn(base, 'cursor-not-allowed bg-subtle text-ink-faint')} aria-disabled>
        {content}
      </span>
    )
  }
  return (
    <Link to={to} className={cn(base, 'active:opacity-80', prev ? 'bg-tile text-ink' : 'bg-primary-500 text-on-primary')}>
      {content}
    </Link>
  )
}
