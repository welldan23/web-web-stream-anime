// Potongan tampilan dari data AniList buat halaman detail anime.
import { useState } from 'react'
import { CalendarClock, ExternalLink, Heart, Play, Star, TrendingUp } from 'lucide-react'
import { compactNumber, countdown, type AniListMedia } from '../lib/anilist'
import { cn } from '../lib/cn'
import { Card, CardSection, Poster } from './ui'

/** Banner lebar di atas kartu judul. */
export function AniListBanner({ media, title }: { media: AniListMedia; title: string }) {
  if (!media.bannerImage) return null
  return (
    <div className="relative -mx-4 -mt-4 mb-4 h-28 overflow-hidden rounded-t-[20px] sm:-mx-5 sm:-mt-5 sm:h-44">
      <img
        src={media.bannerImage}
        alt={`Banner ${title}`}
        decoding="async"
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
    </div>
  )
}

/** 3 kotak angka: skor, popularitas, favorit (kayak tombol aksi cepat di wallet). */
export function AniListStats({ media }: { media: AniListMedia }) {
  const stats = [
    media.averageScore !== null && { icon: Star, label: 'Skor', value: `${media.averageScore}%` },
    media.popularity !== null && { icon: TrendingUp, label: 'Ditonton', value: compactNumber(media.popularity) },
    media.favourites !== null && { icon: Heart, label: 'Favorit', value: compactNumber(media.favourites) },
  ].filter((s): s is { icon: typeof Star; label: string; value: string } => Boolean(s))
  if (stats.length === 0) return null

  return (
    <div className={cn('grid gap-3', stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
      {stats.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex flex-col items-center gap-1 rounded-[18px] bg-tile py-3">
          <Icon className="size-5 text-primary-500" />
          <span className="text-lg font-bold leading-none text-ink tabular-nums">{value}</span>
          <span className="text-xs text-ink-muted">{label}</span>
        </div>
      ))}
    </div>
  )
}

/** "Episode 13 tayang 2 hari 4 jam lagi". */
export function NextEpisode({ media }: { media: AniListMedia }) {
  const next = media.nextAiringEpisode
  if (!next) return null
  const when = new Date(next.airingAt * 1000).toLocaleString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <Card className="flex items-center gap-3 px-4 py-3.5">
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-500">
        <CalendarClock className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-ink">
          Episode {next.episode} tayang {countdown(next.timeUntilAiring)} lagi
        </p>
        <p className="text-[13px] text-ink-muted">
          {when} · jadwal Jepang, sub Indo biasanya nyusul beberapa jam kemudian
        </p>
      </div>
    </Card>
  )
}

/** Trailer YouTube. Iframe baru dimuat setelah diklik biar halaman tetap ringan. */
export function Trailer({ media, title }: { media: AniListMedia; title: string }) {
  const [playing, setPlaying] = useState(false)
  if (media.trailer?.site !== 'youtube' || !media.trailer.id) return null
  const id = media.trailer.id

  return (
    <CardSection title="Trailer">
      <div className="relative aspect-video overflow-hidden rounded-[14px] bg-black">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`}
            title={`Trailer ${title}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button onClick={() => setPlaying(true)} className="group absolute inset-0" aria-label={`Putar trailer ${title}`}>
            <img
              src={`https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
            />
            <span className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary-500 shadow-card">
              <Play className="ml-0.5 size-6 fill-on-primary text-on-primary" />
            </span>
          </button>
        )}
      </div>
    </CardSection>
  )
}

const ROLE = { MAIN: 'Utama', SUPPORTING: 'Pendukung', BACKGROUND: 'Figuran' }

/** Daftar karakter + pengisi suara Jepang. */
export function Characters({ media }: { media: AniListMedia }) {
  const edges = media.characters.edges
  if (edges.length === 0) return null
  // di layar lebar (2 kolom) baris terakhir nggak pakai garis bawah
  const lastRowStart = edges.length - (edges.length % 2 || 2)

  return (
    <CardSection title="Karakter & Pengisi Suara">
      <div className="grid gap-x-6 sm:grid-cols-2">
        {edges.map((e, i) => {
          const va = e.voiceActors[0]
          return (
            <div
              key={e.node.id}
              className={cn(
                'flex items-center gap-3 py-2.5',
                i < edges.length - 1 && 'border-b border-line',
                i >= lastRowStart && 'sm:border-b-0',
              )}
            >
              <Poster src={e.node.image.medium ?? undefined} alt={e.node.name.full} className="size-11 rounded-full" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{e.node.name.full}</p>
                <p className="text-xs text-ink-muted">{ROLE[e.role] ?? e.role}</p>
              </div>
              {va ? (
                <>
                  <div className="min-w-0 text-right">
                    <p className="truncate text-sm text-ink-soft">{va.name.full}</p>
                    <p className="text-xs text-ink-faint">Seiyuu</p>
                  </div>
                  <Poster src={va.image.medium ?? undefined} alt={va.name.full} className="size-11 rounded-full" />
                </>
              ) : null}
            </div>
          )
        })}
      </div>
    </CardSection>
  )
}

/** Tombol ke AniList & MyAnimeList + keterangan sumber data. */
export function ExternalLinks({ media }: { media: AniListMedia }) {
  const links = [
    { href: media.siteUrl, label: 'AniList' },
    media.idMal ? { href: `https://myanimelist.net/anime/${media.idMal}`, label: 'MyAnimeList' } : null,
  ].filter((l): l is { href: string; label: string } => Boolean(l))

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary-50 px-3 py-2.5 text-[13px] font-semibold text-primary-600 active:opacity-70"
          >
            {l.label} <ExternalLink className="size-3.5" />
          </a>
        ))}
      </div>
      <p className="px-1 text-[11px] text-ink-faint">Skor, trailer, karakter & jadwal dari AniList.</p>
    </div>
  )
}
