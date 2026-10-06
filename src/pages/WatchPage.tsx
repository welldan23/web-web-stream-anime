import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ExternalLink, Loader2 } from 'lucide-react'
import { api, type Server } from '../lib/api'
import { recordWatch, useLibrary } from '../lib/library'
import { episodeNumber, shortEpisodeLabel, sortEpisodesAsc } from '../lib/episodes'
import { cn } from '../lib/cn'
import Seo from '../components/Seo'
import { ApiError } from '../lib/api'
import { DEFAULT_DESCRIPTION, episodeMeta, pageTitle, titleFromSlug } from '../lib/site'
import { SITE_URL } from '../lib/siteUrl'
import { Card, Chip, ErrorState, Notice, Pill, Skeleton } from '../components/ui'

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <p className="px-1 text-xs font-semibold uppercase text-ink-faint">{children}</p>
}

export default function WatchPage() {
  const { episodeId = '' } = useParams()
  const library = useLibrary()
  // server yang dipilih user, diikat ke episode-nya biar otomatis balik ke default pas ganti episode
  const [picked, setPicked] = useState<{ episodeId: string; serverId: string; url?: string } | null>(null)
  const activeEpisodeRef = useRef<HTMLAnchorElement>(null)

  const episode = useQuery({ queryKey: ['episode', episodeId], queryFn: () => api.episode(episodeId) })
  const animeId = episode.data?.animeId
  const anime = useQuery({
    queryKey: ['anime', animeId],
    queryFn: () => api.anime(animeId!),
    enabled: Boolean(animeId),
  })

  const server = useMutation({
    mutationFn: async (v: { episodeId: string; server: Server }) => api.server(v.server.serverId),
    onSuccess: (url, v) =>
      setPicked((p) => (p && p.episodeId === v.episodeId && p.serverId === v.server.serverId ? { ...p, url } : p)),
  })
  const choice = picked?.episodeId === episodeId ? picked : null
  const activeServer = choice?.serverId ?? null
  const streamUrl = choice?.url ?? null
  const serverPending = server.isPending && server.variables?.episodeId === episodeId
  const serverError = server.isError && server.variables?.episodeId === episodeId && Boolean(choice) && !choice?.url
  const pickServer = (s: Server | null) => {
    if (!s) return setPicked(null)
    setPicked({ episodeId, serverId: s.serverId })
    server.mutate({ episodeId, server: s })
  }

  // simpan ke riwayat setelah data episode (dan anime, kalau ada) kelar dimuat
  const ep = episode.data
  const animeSettled = !animeId || anime.isSuccess || anime.isError
  useEffect(() => {
    if (!ep || !animeSettled) return
    recordWatch({
      animeId: ep.animeId,
      animeTitle: anime.data?.title ?? ep.title.replace(/\s*episode.*$/i, ''),
      poster: anime.data?.poster ?? '',
      episodeId,
      episodeTitle: ep.title,
    })
  }, [ep, animeSettled, anime.data, episodeId])

  const episodes = useMemo(() => {
    const list = anime.data?.episodeList?.length ? anime.data.episodeList : (ep?.info.episodeList ?? [])
    return sortEpisodesAsc(list)
  }, [anime.data, ep])

  // geser panel episode ke episode yang lagi diputar (cuma panelnya, halaman nggak ikut ke-scroll)
  useEffect(() => {
    const item = activeEpisodeRef.current
    const panel = item?.parentElement
    if (!item || !panel) return
    panel.scrollTop = item.offsetTop - panel.clientHeight / 2 + item.clientHeight / 2
  }, [episodes, episodeId])

  const seo = ep ? (
    <Seo {...episodeMeta(SITE_URL, episodeId, ep, anime.data)} />
  ) : (
    <Seo
      title={pageTitle(`Nonton ${titleFromSlug(episodeId)} Sub Indo`)}
      description={DEFAULT_DESCRIPTION}
      path={`/nonton/${episodeId}`}
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

  const src = streamUrl ?? ep?.defaultStreamingUrl
  const qualities = ep?.server.qualityList.filter((q) => q.serverList && q.serverList.length > 0) ?? []
  const downloads = ep?.download.qualityList.filter((q) => q.urlList && q.urlList.length > 0) ?? []
  const epNumber = ep ? episodeNumber(ep.title) : null

  return (
    <div className="space-y-4">
      {seo}
      {ep ? (
        <Link
          to={`/anime/${ep.animeId}`}
          className="inline-flex max-w-full items-center gap-2 py-1 text-[15px] font-semibold text-ink active:opacity-70"
        >
          <ArrowLeft className="size-6 shrink-0" />
          <span className="truncate">{anime.data?.title ?? 'Detail anime'}</span>
        </Link>
      ) : (
        <Skeleton className="h-8 w-48" />
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-[20px] bg-black">
            {episode.isLoading || serverPending ? (
              <div className="absolute inset-0 grid place-items-center">
                <Loader2 className="size-8 animate-spin text-white/70" />
              </div>
            ) : src ? (
              <iframe
                key={src}
                src={src}
                title={ep?.title ?? 'Player'}
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white/70">
                Player utama nggak tersedia. Pilih server di bawah.
              </div>
            )}
          </div>

          <Card className="p-4 sm:p-5">
            {ep ? (
              <>
                <p className="text-[13px] font-medium text-ink-muted">
                  {epNumber !== null ? `Episode ${epNumber}` : 'Sedang diputar'}
                  {ep.releaseTime ? ` · ${ep.releaseTime}` : ''}
                </p>
                <h1 className="mt-0.5 text-lg font-bold leading-snug text-ink sm:text-xl">{ep.title}</h1>
              </>
            ) : (
              <Skeleton className="h-12" />
            )}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <EpisodeNav to={ep?.prevEpisode?.episodeId} dir="prev" />
              <EpisodeNav to={ep?.nextEpisode?.episodeId} dir="next" />
            </div>
          </Card>

          {serverError ? <Notice tone="danger">Server ini lagi bermasalah. Coba pilih server lain.</Notice> : null}

          <div className="space-y-2">
            <GroupTitle>Server</GroupTitle>
            <Card className="px-4">
              <div className="flex flex-wrap items-center gap-2 border-b border-line py-3">
                <span className="w-12 text-sm font-semibold text-ink-muted">Utama</span>
                <Chip size="sm" active={activeServer === null} onClick={() => pickServer(null)}>
                  Default
                </Chip>
              </div>
              {qualities.map((q, i) => (
                <div
                  key={q.title}
                  className={cn('flex flex-wrap items-center gap-2 py-3', i < qualities.length - 1 && 'border-b border-line')}
                >
                  <span className="w-12 text-sm font-semibold text-ink-muted">{q.title}</span>
                  {q.serverList!.map((s) => (
                    <Chip size="sm" key={s.serverId} active={activeServer === s.serverId} onClick={() => pickServer(s)}>
                      {s.title}
                    </Chip>
                  ))}
                </div>
              ))}
            </Card>
            <p className="px-1 text-xs text-ink-muted">Video nggak muncul atau lemot? Coba ganti server.</p>
          </div>

          {downloads.length > 0 ? (
            <div className="space-y-2">
              <GroupTitle>Download</GroupTitle>
              <Card className="px-4">
                {downloads.map((q, i) => (
                  <div
                    key={q.title}
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
                : episodes.map((e, i) => {
                    const active = e.episodeId === episodeId
                    const watched = library.watched.includes(e.episodeId)
                    return (
                      <Link
                        key={e.episodeId}
                        ref={active ? activeEpisodeRef : undefined}
                        to={`/nonton/${e.episodeId}`}
                        title={e.title}
                        className={cn(
                          'flex items-center justify-between gap-2 px-4 py-3 text-[15px] active:opacity-70',
                          i < episodes.length - 1 && 'border-b border-line',
                          active ? 'bg-primary-50 font-semibold text-primary-600' : 'text-ink hover:bg-subtle',
                        )}
                      >
                        <span className="truncate">{shortEpisodeLabel(e.title)}</span>
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
    <Link
      to={`/nonton/${to}`}
      className={cn(base, 'active:opacity-80', prev ? 'bg-tile text-ink' : 'bg-primary-500 text-on-primary')}
    >
      {content}
    </Link>
  )
}
