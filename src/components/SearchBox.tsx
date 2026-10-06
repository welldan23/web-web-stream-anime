import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { cn } from '../lib/cn'

/**
 * Kotak pencarian. `onTeal` = versi transparan buat di atas header teal.
 * Isi awal ngikutin ?q= di halaman /cari (di-remount lewat key tiap URL berubah).
 */
export default function SearchBox({ className, onTeal }: { className?: string; onTeal?: boolean }) {
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
          onTeal ? 'text-white' : 'text-ink-faint',
        )}
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Cari judul anime"
        enterKeyHint="search"
        className={cn(
          'h-11 w-full rounded-full pl-11 pr-10 text-[15px] outline-none transition',
          onTeal
            ? 'bg-white/25 text-white placeholder:text-white/80 focus:bg-white/35'
            : 'border border-line bg-surface text-ink shadow-card placeholder:text-ink-faint focus:border-primary-500',
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue('')}
          className={cn(
            'absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full',
            onTeal ? 'text-white' : 'text-ink-faint',
          )}
          aria-label="Hapus pencarian"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </form>
  )
}
