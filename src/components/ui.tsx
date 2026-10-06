import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronLeft, ChevronRight, Play, RefreshCw, Star } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Pagination as PaginationData } from '../lib/api'
import { ApiError } from '../lib/api'
import { cn } from '../lib/cn'

export function Poster({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  return (
    <div className={cn('relative overflow-hidden bg-surface-2', className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.visibility = 'hidden'
          }}
        />
      ) : null}
    </div>
  )
}

interface AnimeCardProps {
  animeId: string
  title: string
  poster?: string
  topLeft?: ReactNode
  topRight?: ReactNode
  subtitle?: ReactNode
}

export function AnimeCard({ animeId, title, poster, topLeft, topRight, subtitle }: AnimeCardProps) {
  return (
    <Link to={`/anime/${animeId}`} className="group block min-w-0">
      <div className="relative">
        <Poster
          src={poster}
          alt={title}
          className="aspect-[2/3] rounded-xl ring-1 ring-white/5 transition duration-300 group-hover:ring-accent/60"
        />
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-t from-black/80 via-black/0 to-black/0" />
        <div className="absolute inset-0 grid place-items-center opacity-0 transition duration-300 group-hover:opacity-100">
          <span className="grid size-12 place-items-center rounded-full bg-accent/90 shadow-lg shadow-accent/40">
            <Play className="size-5 fill-white text-white" />
          </span>
        </div>
        {topLeft ? <div className="absolute left-2 top-2">{topLeft}</div> : null}
        {topRight ? <div className="absolute right-2 top-2">{topRight}</div> : null}
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug transition group-hover:text-accent">
        {title}
      </h3>
      {subtitle ? <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p> : null}
    </Link>
  )
}

export function Badge({ children, tone = 'dark' }: { children: ReactNode; tone?: 'dark' | 'accent' | 'gold' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold backdrop-blur',
        tone === 'dark' && 'bg-black/70 text-white',
        tone === 'accent' && 'bg-accent text-white',
        tone === 'gold' && 'bg-amber-400/90 text-black',
      )}
    >
      {children}
    </span>
  )
}

export function ScoreBadge({ score }: { score?: string }) {
  if (!score || score === '0' || score === '-') return null
  return (
    <Badge tone="gold">
      <Star className="size-3 fill-current" />
      {score}
    </Badge>
  )
}

export function Section({
  title,
  action,
  children,
}: {
  title: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <h2 className="flex items-center gap-2 text-lg font-bold sm:text-xl">
          <span className="h-5 w-1 rounded-full bg-gradient-to-b from-accent to-accent-2" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {children}
    </div>
  )
}

export function CardGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <CardGrid>
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <div className="aspect-[2/3] animate-pulse rounded-xl bg-surface-2" />
          <div className="mt-2 h-3.5 w-4/5 animate-pulse rounded bg-surface-2" />
          <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-surface-2" />
        </div>
      ))}
    </CardGrid>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-surface-2', className)} />
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const isNetwork = error instanceof TypeError || (error instanceof ApiError && error.status >= 500)
  const message =
    error instanceof ApiError && error.status === 404
      ? 'Data nggak ketemu. Mungkin linknya udah berubah.'
      : isNetwork
        ? 'Gagal nyambung ke API. Pastikan wajik-anime-api udah jalan di http://localhost:3001.'
        : error instanceof Error
          ? error.message
          : 'Terjadi kesalahan.'

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-6 py-12 text-center">
      <AlertTriangle className="size-8 text-accent" />
      <p className="max-w-md text-sm text-muted">{message}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg bg-surface-2 px-4 py-2 text-sm font-semibold hover:bg-line"
        >
          <RefreshCw className="size-4" /> Coba lagi
        </button>
      ) : null}
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <div className="text-muted">{icon}</div>
      <p className="font-semibold">{title}</p>
      {children ? <div className="text-sm text-muted">{children}</div> : null}
    </div>
  )
}

export function Pager({
  pagination,
  page,
  onChange,
}: {
  pagination: PaginationData | null | undefined
  page: number
  onChange: (page: number) => void
}) {
  if (!pagination) return null
  const total = pagination.totalPages
  return (
    <div className="flex items-center justify-center gap-3 pt-4">
      <button
        disabled={!pagination.hasPrevPage}
        onClick={() => onChange(page - 1)}
        className="grid size-10 place-items-center rounded-lg bg-surface-2 hover:bg-line disabled:opacity-40"
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeft className="size-5" />
      </button>
      <span className="text-sm text-muted">
        Halaman <b className="text-zinc-100">{page}</b>
        {total ? ` dari ${total}` : ''}
      </span>
      <button
        disabled={!pagination.hasNextPage}
        onClick={() => onChange(page + 1)}
        className="grid size-10 place-items-center rounded-lg bg-surface-2 hover:bg-line disabled:opacity-40"
        aria-label="Halaman berikutnya"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  )
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
      {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
    </header>
  )
}
