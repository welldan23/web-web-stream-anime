import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ExternalLink, Loader2, ShieldCheck } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { recordWatch, useLibrary } from '../lib/library'
import { PLAYER_SANDBOX, readBlockPopups, saveBlockPopups } from '../lib/adblock'
import { cn } from '../lib/cn'
import Seo from '../components/Seo'
import { DEFAULT_DESCRIPTION, episodeMeta, pageTitle, titleFromSlug } from '../lib/site'
import { SITE_URL } from '../lib/siteUrl'
import { Card, ErrorState, Pill, Skeleton } from '../components/ui'

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <p className="px-1 text-xs font-semibold uppercase text-ink-faint">{children}</p>
}

export default function WatchPage() {
  const { episodeId = '' } = useParams()
  const library = useLibrary()
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

  const episodes = useMemo(() => anime.data?.episodeList ?? [], [anime.data])
  // wajik cuma ngasih "episode sebelumnya", jadi sebelum/sesudah dihitung dari daftar episode
  const index = episodes.findIndex((e) => e.episodeId === episodeId)
  const prev = index > 0 ? episodes[index - 1] : null
  const next = index >= 0 && index < episodes.length - 1 ? episodes[index + 1] : null
  const animeTitle = anime.data?.title ?? ep?.animeTitle ?? ''

  // simpan ke riwayat setelah data episode (dan anime, kalau ada) kelar dimuat
  const animeSettled = !animeId || anime.isSuccess || anime.isError
  useEffect(() => {
    if (!ep || !animeSettled) return
    recordWatch({
      animeId: ep.animeId,
      animeTitle: anime.data?.title ?? ep.animeTitle ?? ep.title.replace(/\s*episode.*$/i, ''),
      poster: anime.data?.poster ?? '',
      episodeId,
      episodeTitle: ep.title,
    })
  }, [ep, animeSettled, anime.data, episodeId])

  // geser panel episode ke episode yang lagi diputar (cuma panelnya, halaman nggak ikut ke-scroll)
  useEffect(() => {
    const item = activeEpisodeRef.current
    const panel = item?.parentElement
    if (!item || !panel) return
    panel.scrollTop = item.offsetTop - panel.clientHeight / 2 + item.clientHeight / 2
  }, [episodes, episodeId])

  const seo = ep ? (
    <Seo
      {...episodeMeta(
        SITE_URL,
        episodeId,
        { title: ep.title, animeId: ep.animeId, releaseTime: ep.releasedOn },
        anime.data ? { title: anime.data.title, poster: anime.data.poster } : undefined,
      )}
    />
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

  const src = ep?.streamingUrl
  const downloads = ep?.downloads.filter((g) => g.qualityList.length > 0) ?? []

  return (
    <div className="space-y-4">
      {seo}
      {ep ? (
        <Link
          to={`/anime/${ep.animeId}`}
          className="inline-flex max-w-full items-center gap-2 py-1 text-[15px] font-semibold text-ink active:opacity-70"
        >
          <ArrowLeft className="size-6 shrink-0" />
          <span className="truncate">{animeTitle || 'Detail anime'}</span>
        </Link>
      ) : (
        <Skeleton className="h-8 w-48" />
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-[20px] bg-black">
            {episode.isLoading ? (
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
                Video episode ini belum tersedia. Coba lagi nanti atau download di bawah.
              </div>
            )}
          </div>

          <Card className="p-4 sm:p-5">
            {ep ? (
              <>
                <p className="text-[13px] font-medium text-ink-muted">
                  {ep.number !== null ? `Episode ${ep.number}` : 'Sedang diputar'}
                  {ep.releasedOn ? ` · ${ep.releasedOn}` : ''}
                </p>
                <h1 className="mt-0.5 text-lg font-bold leading-snug text-ink sm:text-xl">{ep.title}</h1>
              </>
            ) : (
              <Skeleton className="h-12" />
            )}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <EpisodeNav to={prev?.episodeId} dir="prev" />
              <EpisodeNav to={next?.episodeId} dir="next" />
            </div>
          </Card>

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
            <div className="flex items-start justify-between gap-3 px-1">
              <p className="text-xs text-ink-muted">
                Iklan yang tampil di dalam video berasal dari server videonya, jadi nggak bisa dihapus dari sini.
              </p>
              {src ? (
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

          {downloads.length > 0 ? (
            <div className="space-y-2">
              <GroupTitle>Download</GroupTitle>
              {downloads.map((g, gi) => (
                <Card key={`${g.title}-${gi}`} className="px-4">
                  {downloads.length > 1 && g.title ? (
                    <p className="border-b border-line py-3 text-sm font-semibold text-ink">{g.title}</p>
                  ) : null}
                  {g.qualityList.map((q, i) => (
                    <div
                      key={`${q.title}-${i}`}
                      className={cn('flex flex-wrap items-center gap-2 py-3', i < g.qualityList.length - 1 && 'border-b border-line')}
                    >
                      <div className="mr-auto min-w-28">
                        <p className="text-sm font-semibold text-ink">{q.title}</p>
                        {q.size ? <p className="text-xs text-ink-muted">{q.size}</p> : null}
                      </div>
                      {q.urlList.map((u, j) => (
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
              ))}
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
                        <span className="truncate">{e.number !== null ? `Episode ${e.number}` : e.title}</span>
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
