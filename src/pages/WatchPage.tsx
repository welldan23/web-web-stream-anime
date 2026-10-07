import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ChevronDown, ExternalLink, Loader2, ShieldCheck } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import {
  autoCandidates,
  canSandbox,
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
import { track } from '../lib/stats'
import { episodeNumber, shortEpisodeLabel, sortEpisodesAsc } from '../lib/episodes'
import { findOploverz } from '../lib/oploverz'
import { cn } from '../lib/cn'
import Seo from '../components/Seo'
import { DEFAULT_DESCRIPTION, episodeMeta, pageTitle, titleFromSlug } from '../lib/site'
import { SITE_URL } from '../lib/siteUrl'
import { Card, Chip, ErrorState, Notice, Pill, Skeleton } from '../components/ui'

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <p className="px-1 text-xs font-semibold uppercase text-ink-faint">{children}</p>
}

/**
 * Halaman nonton. Data episode dari Otakudesu, tapi videonya:
 * 1. Oploverz (server utama) — episode yang sama dicariin otomatis
 * 2. kalau nggak ada di Oploverz: server Otakudesu yang lancar (Vidhide)
 * 3. kalau itu juga gagal: player bawaan Otakudesu
 */
export default function WatchPage() {
  const { episodeId = '' } = useParams()
  const library = useLibrary()
  // server yang dipilih manual, diikat ke episode-nya
  // 'oploverz' = server utama, 'default' = player bawaan otakudesu, selain itu = serverId otakudesu
  const [picked, setPicked] = useState<{ episodeId: string; serverId: string } | null>(null)
  const [blockPopups, setBlockPopups] = useState(readBlockPopups)
  const activeEpisodeRef = useRef<HTMLAnchorElement>(null)

  const episode = useQuery({ queryKey: ['episode', episodeId], queryFn: () => api.episode(episodeId) })
  const ep = episode.data
  const animeId = ep?.animeId
  const anime = useQuery({
    queryKey: ['anime', animeId],
    queryFn: () => api.anime(animeId!),
    enabled: Boolean(animeId),
  })
  const epNumber = ep ? episodeNumber(ep.title) : null
  const animeTitle = anime.data?.title
  const manual = picked?.episodeId === episodeId ? picked.serverId : null

  // 1. Server utama: episode yang sama di Oploverz
  const main = useQuery({
    queryKey: ['oploverz', animeId, epNumber],
    queryFn: () => findOploverz(animeTitle!, epNumber!),
    enabled: Boolean(animeTitle) && epNumber !== null,
    staleTime: 1000 * 60 * 30,
    retry: false,
  })
  const mainUrl = main.data?.url
  // tunggu hasil Oploverz dulu sebelum pakai server Otakudesu, biar player nggak gonta-ganti
  const deciding = !manual && (anime.isLoading || main.isLoading)

  // 2. Cadangan: server Otakudesu yang lancar, dicoba satu per satu
  const options = useMemo(() => flattenServers(ep?.server.qualityList ?? []), [ep])
  const candidates = useMemo(() => autoCandidates(options, blockPopups), [options, blockPopups])
  const auto = useQuery({
    queryKey: ['server-auto', episodeId, candidates.map((c) => c.serverId)],
    queryFn: async () => {
      for (const c of candidates) {
        const url = await api.server(c.serverId).catch(() => null)
        if (url) return { serverId: c.serverId, url }
      }
      return null
    },
    enabled: Boolean(ep) && !manual && candidates.length > 0 && !deciding && !mainUrl,
    staleTime: 1000 * 60 * 30,
    retry: false,
  })

  // Manual: user milih server Otakudesu sendiri
  const chosen = useQuery({
    queryKey: ['server', manual],
    queryFn: () => api.server(manual!),
    enabled: Boolean(manual) && manual !== 'default' && manual !== 'oploverz',
    staleTime: 1000 * 60 * 30,
    retry: false,
  })

  const pickServer = (o: ServerOption | 'default' | 'oploverz') => {
    if (o !== 'default' && o !== 'oploverz') rememberServer(o)
    setPicked({ episodeId, serverId: typeof o === 'string' ? o : o.serverId })
  }

  const usingAuto = candidates.length > 0
  const otakudesuServer = usingAuto ? (auto.data?.serverId ?? (auto.data === null ? 'default' : null)) : 'default'
  const otakudesuSrc = usingAuto ? (auto.data === null ? ep?.defaultStreamingUrl : auto.data?.url) : ep?.defaultStreamingUrl

  const activeServer = manual ?? (mainUrl ? 'oploverz' : otakudesuServer)
  const src =
    manual === 'oploverz'
      ? mainUrl
      : manual === 'default'
        ? ep?.defaultStreamingUrl
        : manual
          ? chosen.data
          : (mainUrl ?? otakudesuSrc)
  const playerLoading =
    episode.isLoading ||
    (manual === 'oploverz'
      ? main.isLoading
      : manual
        ? manual !== 'default' && chosen.isLoading
        : deciding || (!mainUrl && usingAuto && auto.isLoading))
  const serverError =
    manual === 'oploverz' ? !main.isLoading && !mainUrl : Boolean(manual) && manual !== 'default' && chosen.isError
  // Oploverz nggak punya episode ini → otomatis pakai server Otakudesu
  const notOnMain = !manual && !deciding && !mainUrl
  const otakudesuFailed = notOnMain && usingAuto && auto.data === null

  // simpan ke riwayat setelah data episode (dan anime, kalau ada) kelar dimuat
  const animeSettled = !animeId || anime.isSuccess || anime.isError
  useEffect(() => {
    if (!ep || !animeSettled) return
    const title = anime.data?.title ?? ep.title.replace(/\s*episode.*$/i, '')
    recordWatch({
      animeId: ep.animeId,
      animeTitle: title,
      poster: anime.data?.poster ?? '',
      episodeId,
      episodeTitle: ep.title,
    })
    track({ t: 'watch', animeId: ep.animeId, title, episodeId })
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
  // sebagian server (Vidhide) nolak muter kalau di-sandbox, jadi blokir pop-up dilewati buat server itu
  const sandboxed = blockPopups && canSandbox(activeOption)
  const sandboxSkipped = blockPopups && !sandboxed && activeOption
  const activeLabel = activeServer === 'oploverz' ? 'Oploverz' : activeOption ? serverLabel(activeOption) : null

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
                key={`${src}|${sandboxed}`}
                src={src}
                title={ep?.title ?? 'Player'}
                sandbox={sandboxed ? PLAYER_SANDBOX : undefined}
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
          {notOnMain && !playerLoading ? (
            <Notice>
              Episode ini belum ada di Oploverz, jadi diputar pakai{' '}
              {otakudesuFailed || !usingAuto ? 'player bawaan Otakudesu' : 'server cadangan Otakudesu'}.
            </Notice>
          ) : null}

          <div className="space-y-2">
            <GroupTitle>Server</GroupTitle>
            <Card className="px-4">
              <div className="py-3">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <span className="size-2 rounded-full bg-success-500" /> Utama
                  <span className="font-normal text-ink-muted">
                    · Oploverz{activeLabel ? ` · lagi diputar: ${activeLabel}` : ''}
                  </span>
                </p>
                {mainUrl ? (
                  <Chip size="sm" active={activeServer === 'oploverz'} onClick={() => pickServer('oploverz')}>
                    Oploverz
                  </Chip>
                ) : main.isLoading || anime.isLoading ? (
                  <p className="flex items-center gap-2 text-xs text-ink-muted">
                    <Loader2 className="size-3.5 animate-spin" /> Lagi nyari di Oploverz…
                  </p>
                ) : (
                  <p className="text-xs text-ink-muted">Episode ini belum ada di Oploverz.</p>
                )}
              </div>
              {reliable.length > 0 ? (
                <div className="border-t border-line py-3">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <span className="size-2 rounded-full bg-primary-500" /> Cadangan
                    <span className="font-normal text-ink-muted">· Otakudesu</span>
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
              <details className="group border-t border-line py-3">
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
            <div className="flex items-start justify-between gap-3 px-1">
              <p className="text-xs text-ink-muted">
                Oploverz diputar duluan. Kalau episodenya belum ada, otomatis pakai server Otakudesu.
              </p>
              {src ? (
                // cadangan kalau player nggak mau jalan di dalam web: buka langsung di tab baru
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-500 hover:underline"
                >
                  Buka di tab baru <ExternalLink className="size-3" />
                </a>
              ) : null}
            </div>
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
                    Cegah tab iklan kebuka & halaman pindah sendiri pas video diklik. Kalau video nggak mau muter,
                    matiin ini.
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
            {sandboxSkipped ? (
              <p className="px-1 text-xs text-warning-600">
                {serverLabel(sandboxSkipped)} nolak muter kalau pop-up diblokir, jadi buat server ini blokirnya dilewatin.
              </p>
            ) : null}
            <p className="px-1 text-xs text-ink-muted">
              Iklan yang tampil di dalam video berasal dari server videonya, jadi nggak bisa dihapus dari sini.
            </p>
          </div>
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
