import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, RefreshCw, Star, TriangleAlert, WifiOff } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Pagination as PaginationData } from '../lib/api'
import { ApiError } from '../lib/api'
import { cn } from '../lib/cn'

export function Poster({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  return (
    <div className={cn('relative shrink-0 overflow-hidden bg-tile', className)}>
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

/** Kartu putih dengan sudut 20px dan bayangan tipis. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-[20px] bg-surface shadow-card', className)}>{children}</div>
}

/** Kartu putih dengan judul + link "Lihat Semua" di kanan. */
export function CardSection({
  title,
  subtitle,
  more,
  children,
  className,
}: {
  title: string
  subtitle?: string
  more?: { to: string; label?: string }
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('px-4 py-4 sm:px-5', className)}>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-ink sm:text-xl">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p> : null}
        </div>
        {more ? (
          <Link
            to={more.to}
            className="mt-0.5 flex shrink-0 items-center text-sm font-semibold text-primary-500 hover:text-primary-600"
          >
            {more.label ?? 'Lihat Semua'} <ChevronRight className="size-4" />
          </Link>
        ) : null}
      </div>
      {children}
    </Card>
  )
}

/** Label status kecil, mis. "Ongoing" (biru) atau "Tamat" (hijau). */
export function Pill({
  children,
  tone = 'primary',
  className,
}: {
  children: ReactNode
  tone?: 'primary' | 'success' | 'warning' | 'neutral'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold',
        tone === 'primary' && 'bg-primary-50 text-primary-600',
        tone === 'success' && 'bg-success-50 text-success-600',
        tone === 'warning' && 'bg-warning-50 text-warning-600',
        tone === 'neutral' && 'bg-tile text-ink-soft',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Score({ score, className }: { score?: string; className?: string }) {
  if (!score || score === '0' || score === '-') return null
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold text-ink-soft', className)}>
      <Star className="size-3 fill-warning-500 text-warning-500" />
      <span className="tabular-nums">{score}</span>
    </span>
  )
}

interface AnimeCardProps {
  animeId: string
  title: string
  poster?: string
  label?: string
  meta?: ReactNode
}

/** Poster + judul. Label kecil di pojok kiri bawah poster (mis. "Ep 12"). */
export function AnimeCard({ animeId, title, poster, label, meta }: AnimeCardProps) {
  return (
    <Link to={`/anime/${animeId}`} className="group block min-w-0">
      <div className="relative">
        <Poster src={poster} alt={title} className="aspect-[3/4] rounded-[14px] transition group-active:opacity-80" />
        {label ? (
          <span className="absolute bottom-2 left-2 rounded-full bg-surface/95 px-2 py-0.5 text-[11px] font-bold text-ink shadow-card">
            {label}
          </span>
        ) : null}
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-ink group-hover:text-primary-500">
        {title}
      </h3>
      {meta ? <div className="mt-1 flex items-center gap-2 truncate text-xs text-ink-muted">{meta}</div> : null}
    </Link>
  )
}

export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 lg:grid-cols-6">{children}</div>
}

export function CardGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <CardGrid>
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <div className="aspect-[3/4] animate-pulse rounded-[14px] bg-tile" />
          <div className="mt-2 h-3.5 w-4/5 animate-pulse rounded bg-tile" />
        </div>
      ))}
    </CardGrid>
  )
}

/** Baris daftar: thumbnail, judul + keterangan, isi kanan, panah. */
export function ListRow({
  to,
  poster,
  title,
  subtitle,
  trailing,
  isLast,
}: {
  to: string
  poster?: string
  title: string
  subtitle?: ReactNode
  trailing?: ReactNode
  isLast?: boolean
}) {
  return (
    <Link
      to={to}
      className={cn('flex items-center gap-3 py-3 active:opacity-70', !isLast && 'border-b border-line')}
    >
      {poster !== undefined ? <Poster src={poster} alt={title} className="h-14 w-11 rounded-lg" /> : null}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-[15px] font-semibold text-ink">{title}</p>
        {subtitle ? <div className="mt-0.5 line-clamp-1 text-[13px] text-ink-muted">{subtitle}</div> : null}
      </div>
      {trailing}
      <ChevronRight className="size-4 shrink-0 text-ink-faint" />
    </Link>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-tile', className)} />
}

export function Notice({ children, tone = 'warning' }: { children: ReactNode; tone?: 'warning' | 'danger' }) {
  return (
    <div
      className={cn(
        'flex gap-2.5 rounded-2xl border px-4 py-3 text-sm leading-relaxed',
        tone === 'warning' && 'border-warning-500/30 bg-warning-50 text-warning-600',
        tone === 'danger' && 'border-danger-500/30 bg-danger-50 text-danger-600',
      )}
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const isNetwork = error instanceof TypeError || (error instanceof ApiError && error.status >= 500)
  const notFound = error instanceof ApiError && error.status === 404
  const message = notFound
    ? 'Datanya nggak ketemu. Mungkin linknya udah berubah.'
    : isNetwork
      ? 'Nggak bisa nyambung ke API. Pastikan wajik-anime-api udah jalan di http://localhost:3001.'
      : error instanceof Error
        ? error.message
        : 'Ada yang salah.'

  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-danger-50 text-danger-500">
        {isNetwork ? <WifiOff className="size-5" /> : <TriangleAlert className="size-5" />}
      </div>
      <p className="font-semibold text-ink">{notFound ? 'Nggak ketemu' : 'Gagal memuat'}</p>
      <p className="max-w-sm text-sm text-ink-muted">{message}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-600 active:opacity-70"
        >
          <RefreshCw className="size-4" /> Coba lagi
        </button>
      ) : null}
    </Card>
  )
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="mb-1 grid size-12 place-items-center rounded-full bg-primary-50 text-primary-500">{icon}</div>
      <p className="font-semibold text-ink">{title}</p>
      {children ? <div className="max-w-sm text-sm text-ink-muted">{children}</div> : null}
    </Card>
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
  const btn =
    'grid size-10 place-items-center rounded-full bg-surface text-ink shadow-card active:opacity-70 disabled:opacity-40'
  return (
    <div className="flex items-center justify-center gap-4 pt-2">
      <button disabled={!pagination.hasPrevPage} onClick={() => onChange(page - 1)} className={btn} aria-label="Halaman sebelumnya">
        <ChevronLeft className="size-5" />
      </button>
      <span className="text-sm text-ink-muted tabular-nums">
        Hal. <b className="text-ink">{page}</b>
        {total ? ` / ${total}` : ''}
      </span>
      <button disabled={!pagination.hasNextPage} onClick={() => onChange(page + 1)} className={btn} aria-label="Halaman berikutnya">
        <ChevronRight className="size-5" />
      </button>
    </div>
  )
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-bold leading-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}

/** Pilihan berbentuk pil (kayak pilihan jaringan di wallet). */
export function Chip({
  active,
  onClick,
  children,
  size = 'md',
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  size?: 'sm' | 'md'
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border font-semibold transition active:opacity-70',
        size === 'md' ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-[13px]',
        active
          ? 'border-primary-500 bg-primary-50 text-primary-600'
          : 'border-line bg-surface text-ink-soft hover:border-ink-faint',
      )}
    >
      {children}
    </button>
  )
}
