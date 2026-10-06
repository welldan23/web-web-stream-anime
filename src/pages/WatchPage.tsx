import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ChevronDown, ExternalLink, Loader2, ShieldCheck } from 'lucide-react'
import { api } from '../lib/api'
import {
  autoCandidates,
  flattenServers,
  PLAYER_SANDBOX,
  readBlockPopups,
  rememberServer,
  saveBlockPopups,
  serverLabel,
  sortForDisplay,
  type ServerOption,
} from '../lib/servers'
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
  // server yang dipilih manual, diikat ke episode-nya; 'default' = player bawaan otakudesu
  const [picked, setPicked] = useState<{ episodeId: string; serverId: string } | null>(null)
  const [blockPopups, setBlockPopups] = useState(readBlockPopups)
  const activeEpisodeRef = useRef<HTMLAnchorElement>(null)

  const episode = useQuery({ queryKey: ['episode', episodeId], queryFn: () => api.episode(episodeId) })
  const animeId = episode.data?.animeId
  const anime = useQuery({
    queryKey: ['anime', animeId],
    queryFn: () => api.anime(animeId!),
    enabled: Boolean(animeId),
  })

  const ep = episode.data
  const options = useMemo(() => flattenServers(ep?.server.qualityList ?? []), [ep])
  const candidates = useMemo(() => autoCandidates(options), [options])
  const manual = picked?.episodeId === episodeId ? picked.serverId : null

  // Otomatis: coba server andalan satu per satu sampai ada yang ngasih link
  const auto = useQuery({
    queryKey: ['server-auto', episodeId, candidates.map((c) => c.serverId)],
    queryFn: async () => {
      for (const c of candidates) {
        const url = await api.server(c.serverId).catch(() => null)
        if (url) return { serverId: c.serverId, url }
      }
      return null
    },
    enabled: Boolean(ep) && !manual && candidates.length > 0,
    staleTime: 1000 * 60 * 30,
    retry: false,
  })

  // Manual: user milih server sendiri
  const chosen = useQuery({
    queryKey: ['server', manual],
    queryFn: () => api.server(manual!),
    enabled: Boolean(manual) && manual !== 'default',
    staleTime: 1000 * 60 * 30,
    retry: false,
  })

  const pickServer = (o: ServerOption | 'default') => {
    if (o !== 'default') rememberServer(o)
    setPicked({ episodeId, serverId: o === 'default' ? 'default' : o.serverId })
  }

  const usingAuto = !manual && candidates.length > 0
  const activeServer = manual ?? (usingAuto ? (auto.data?.serverId ?? (auto.data === null ? 'default' : null)) : 'default')
  const src = manual
    ? manual === 'default'
      ? ep?.defaultStreamingUrl
      : chosen.data
    : usingAuto
      ? auto.data === null
        ? ep?.defaultStreamingUrl
        : auto.data?.url
      : ep?.defaultStreamingUrl
  const playerLoading =
    episode.isLoading || (manual ? manual !== 'default' && chosen.isLoading : usingAuto && auto.isLoading)
  const serverError = manual && manual !== 'default' && chosen.isError
  const autoFailed = !manual && usingAuto && auto.data === null

  // simpan ke riwayat setelah data episode (dan anime, kalau ada) kelar dimuat
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

  const reliable = sortForDisplay(options.filter((o) => o.reliable))
  const others = options.filter((o) => !o.reliable)
  const activeOption = options.find((o) => o.serverId === activeServer)
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
            {playerLoading ? (
              <div className="absolute inset-0 grid place-items-center">
                <Loader2 className="size-8 animate-spin text-white/70" />
              </div>
            ) : src ? (
              <iframe
                // key ikut status blokir: atribut sandbox cuma kebaca waktu iframe dibuat ulang
                key={`${src}|${blockPopups}`}
                src={src}
                title={ep?.title ?? 'Player'}
                sandbox={blockPopups ? PLAYER_SANDBOX : undefined}
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white/70">
                Video nggak tersedia di server ini. Coba server lain di bawah.
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
          {autoFailed ? (
            <Notice>Vidhide & Mega lagi nggak bisa buat episode ini, jadi diputar pakai player bawaan.</Notice>
          ) : null}

          <div className="space-y-2">
            <GroupTitle>Server</GroupTitle>
            <Card className="px-4">
              {reliable.length > 0 ? (
                <div className="py-3">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <span className="size-2 rounded-full bg-success-500" /> Lancar
                    {activeOption ? (
                      <span className="font-normal text-ink-muted">· lagi diputar: {serverLabel(activeOption)}</span>
                    ) : null}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {reliable.map((o) => (
                      <Chip size="sm" key={o.serverId} active={activeServer === o.serverId} onClick={() => pickServer(o)}>
                        {serverLabel(o)}
                      </Chip>
                    ))}
                  </div>
                </div>
              ) : null}
              <details className={cn('group py-3', reliable.length > 0 && 'border-t border-line')} open={reliable.length === 0}>
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-ink-muted">
                  Server lain
                  <span className="font-normal">· sering error</span>
                  <ChevronDown className="ml-auto size-4 transition group-open:rotate-180" />
                </summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Chip size="sm" active={activeServer === 'default'} onClick={() => pickServer('default')}>
                    Player bawaan
                  </Chip>
                  {others.map((o) => (
                    <Chip size="sm" key={o.serverId} active={activeServer === o.serverId} onClick={() => pickServer(o)}>
                      {serverLabel(o)}
                    </Chip>
                  ))}
                </div>
              </details>
            </Card>
            <p className="px-1 text-xs text-ink-muted">
              Server lancar dipilih otomatis. Pilihan kamu diingat buat episode berikutnya.
            </p>
          </div>

          <div className="space-y-2">
            <GroupTitle>Iklan</GroupTitle>
            <Card className="px-4">
              <label className="flex cursor-pointer items-center gap-3 py-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-500">
                  <ShieldCheck className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink">Blokir pop-up iklan</span>
                  <span className="block text-xs leading-relaxed text-ink-muted">
                    Cegah tab iklan kebuka & halaman pindah sendiri pas video diklik. Kalau video nggak mau
                    muter, matiin ini.
                  </span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={blockPopups}
                  onChange={(e) => {
                    setBlockPopups(e.target.checked)
                    saveBlockPopups(e.target.checked)
                  }}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className="relative h-7 w-12 shrink-0 rounded-full bg-tile transition peer-checked:bg-primary-500 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/50 after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-ink-faint after:transition peer-checked:after:translate-x-5 peer-checked:after:bg-on-primary"
                />
              </label>
            </Card>
            <p className="px-1 text-xs text-ink-muted">
              Iklan yang tampil di dalam video berasal dari server videonya, jadi nggak bisa dihapus dari sini.
            </p>
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
