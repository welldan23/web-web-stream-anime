import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  MonitorPlay,
  Server as ServerIcon,
  Expand,
  Shrink,
} from 'lucide-react'
import { api, type Server } from '../lib/api'
import { recordWatch, useLibrary } from '../lib/library'
import { episodeNumber, shortEpisodeLabel, sortEpisodesAsc } from '../lib/episodes'
import { ErrorState, Skeleton } from '../components/ui'
import { cn } from '../lib/cn'

export default function WatchPage() {
  const { episodeId = '' } = useParams()
  const library = useLibrary()
  // server yang dipilih user, diikat ke episode-nya biar otomatis balik ke default pas ganti episode
  const [picked, setPicked] = useState<{ episodeId: string; serverId: string; url?: string } | null>(null)
  const [theater, setTheater] = useState(false)
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

  if (episode.error) return <ErrorState error={episode.error} onRetry={() => episode.refetch()} />

  const src = streamUrl ?? ep?.defaultStreamingUrl
  const qualities = ep?.server.qualityList.filter((q) => q.serverList && q.serverList.length > 0) ?? []
  const downloads = ep?.download.qualityList.filter((q) => q.urlList && q.urlList.length > 0) ?? []
  const epNumber = ep ? episodeNumber(ep.title) : null

  return (
    <div className="space-y-6">
      {ep ? (
        <Link
          to={`/anime/${ep.animeId}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-white"
        >
          <ArrowLeft className="size-4" /> {anime.data?.title ?? 'Kembali ke detail'}
        </Link>
      ) : (
        <Skeleton className="h-5 w-48" />
      )}

      <div className={cn('grid gap-6', !theater && 'xl:grid-cols-[1fr_340px]')}>
        <div className="min-w-0 space-y-4">
          {/* Player */}
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-black ring-1 ring-white/5">
            {episode.isLoading || serverPending ? (
              <div className="absolute inset-0 grid place-items-center">
                <Loader2 className="size-10 animate-spin text-accent" />
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
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted">
                Player default nggak tersedia. Pilih server di bawah ya.
              </div>
            )}
          </div>

          {/* Judul + navigasi */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              {ep ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-widest text-accent">
                    {epNumber !== null ? `Episode ${epNumber}` : 'Sedang ditonton'}
                  </p>
                  <h1 className="mt-1 text-lg font-bold leading-snug sm:text-xl">{ep.title}</h1>
                  {ep.releaseTime ? <p className="mt-1 text-xs text-muted">Rilis: {ep.releaseTime}</p> : null}
                </>
              ) : (
                <Skeleton className="h-12 w-72" />
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => setTheater((v) => !v)}
                className="hidden h-10 items-center gap-1.5 rounded-lg bg-surface px-3 text-sm font-semibold text-muted hover:text-white xl:inline-flex"
              >
                {theater ? <Shrink className="size-4" /> : <Expand className="size-4" />}
                {theater ? 'Normal' : 'Bioskop'}
              </button>
              <EpisodeNav to={ep?.prevEpisode?.episodeId} label="Sebelumnya" dir="prev" />
              <EpisodeNav to={ep?.nextEpisode?.episodeId} label="Berikutnya" dir="next" />
            </div>
          </div>

          {/* Server */}
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="mb-3">
              <p className="flex items-center gap-2 text-sm font-bold">
                <ServerIcon className="size-4 text-accent" /> Pilih Server
              </p>
              <p className="mt-0.5 text-xs text-muted">Kalau video nggak muncul, coba server lain.</p>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-14 text-xs font-bold text-muted">Default</span>
                <button
                  onClick={() => pickServer(null)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                    activeServer === null ? 'bg-accent text-white' : 'bg-surface-2 text-zinc-300 hover:bg-line',
                  )}
                >
                  <MonitorPlay className="mr-1 inline size-3.5" /> Utama
                </button>
              </div>
              {qualities.map((q) => (
                <div key={q.title} className="flex flex-wrap items-center gap-2">
                  <span className="w-14 text-xs font-bold text-muted">{q.title}</span>
                  {q.serverList!.map((s) => (
                    <button
                      key={s.serverId}
                      onClick={() => pickServer(s)}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                        activeServer === s.serverId
                          ? 'bg-accent text-white'
                          : 'bg-surface-2 text-zinc-300 hover:bg-line',
                      )}
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              ))}
              {serverError ? (
                <p className="text-xs text-accent">Server ini lagi bermasalah, coba yang lain.</p>
              ) : null}
            </div>
          </div>

          {/* Download */}
          {downloads.length > 0 ? (
            <details className="group rounded-2xl border border-line bg-surface p-4">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold">
                <Download className="size-4 text-accent" /> Download Episode
                <ChevronRight className="ml-auto size-4 transition group-open:rotate-90" />
              </summary>
              <div className="mt-4 space-y-3">
                {downloads.map((q) => (
                  <div key={q.title} className="flex flex-wrap items-center gap-2">
                    <span className="w-28 text-xs font-bold text-muted">
                      {q.title}
                      {q.size ? <span className="block font-normal">{q.size}</span> : null}
                    </span>
                    {q.urlList!.map((u, i) => (
                      <a
                        key={`${u.title}-${i}`}
                        href={u.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-line hover:text-white"
                      >
                        {u.title}
                      </a>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>

        {/* Daftar episode */}
        <aside className="h-fit overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="border-b border-line px-4 py-3 text-sm font-bold">Daftar Episode ({episodes.length})</div>
          <div
            className={cn(
              'thin-scroll relative overflow-y-auto p-2',
              theater ? 'grid max-h-72 grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-6' : 'max-h-[60vh] space-y-1',
            )}
          >
            {episodes.length === 0
              ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-10" />)
              : episodes.map((e) => {
                  const active = e.episodeId === episodeId
                  const watched = library.watched.includes(e.episodeId)
                  return (
                    <Link
                      key={e.episodeId}
                      ref={active ? activeEpisodeRef : undefined}
                      to={`/nonton/${e.episodeId}`}
                      title={e.title}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                        active
                          ? 'bg-gradient-to-r from-accent to-accent-2 text-white'
                          : watched
                            ? 'text-muted hover:bg-surface-2'
                            : 'hover:bg-surface-2',
                      )}
                    >
                      <span className="truncate">{shortEpisodeLabel(e.title)}</span>
                      {active ? (
                        <span className="text-[10px] font-bold uppercase">Diputar</span>
                      ) : watched ? (
                        <CheckCircle2 className="size-4 shrink-0 text-accent/70" />
                      ) : null}
                    </Link>
                  )
                })}
          </div>
        </aside>
      </div>
    </div>
  )
}

function EpisodeNav({ to, label, dir }: { to?: string; label: string; dir: 'prev' | 'next' }) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight
  const content = (
    <>
      {dir === 'prev' ? <Icon className="size-4" /> : null}
      <span className="hidden sm:inline">{label}</span>
      {dir === 'next' ? <Icon className="size-4" /> : null}
    </>
  )
  const base = 'inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-semibold'
  if (!to) {
    return (
      <span className={cn(base, 'cursor-not-allowed bg-surface text-muted/50')} aria-disabled>
        {content}
      </span>
    )
  }
  return (
    <Link
      to={`/nonton/${to}`}
      className={cn(base, dir === 'next' ? 'bg-accent text-white hover:brightness-110' : 'bg-surface hover:bg-surface-2')}
      aria-label={label}
    >
      {content}
    </Link>
  )
}
