import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ImageUp, Search, X } from 'lucide-react'
import { cn } from '../lib/cn'

/**
 * Kotak pencarian. `onHeader` = versi transparan buat di atas header.
 * Isi awal ngikutin ?q= di halaman /cari (di-remount lewat key tiap URL berubah).
 */
export default function SearchBox({ className, onHeader }: { className?: string; onHeader?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [value, setValue] = useState(() => (location.pathname === '/cari' ? (params.get('q') ?? '') : ''))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const q = value.trim()
    if (q) navigate(`/cari?q=${encodeURIComponent(q)}`)
  }

  return (
    <form onSubmit={submit} className={cn('relative', className)} role="search">
      <Search
        className={cn(
          'pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2',
          onHeader ? 'text-ink-muted' : 'text-ink-faint',
        )}
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Cari judul anime"
        enterKeyHint="search"
        className={cn(
          'h-11 w-full rounded-full pl-11 pr-10 text-[15px] outline-none transition',
          onHeader
            ? 'bg-white/10 text-ink placeholder:text-ink-muted focus:bg-white/15'
            : 'border border-line bg-surface text-ink shadow-card placeholder:text-ink-faint focus:border-primary-500',
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue('')}
          className={cn(
            'absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full',
            onHeader ? 'text-ink-muted' : 'text-ink-faint',
          )}
          aria-label="Hapus pencarian"
        >
          <X className="size-4" />
        </button>
      ) : (
        <Link
          to="/cari-gambar"
          className={cn(
            'absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full',
            onHeader ? 'text-ink-muted hover:text-ink' : 'text-ink-faint hover:text-ink',
          )}
          aria-label="Cari pakai gambar"
          title="Cari pakai gambar"
        >
          <ImageUp className="size-4" />
        </Link>
      )}
    </form>
  )
}
