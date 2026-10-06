import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { cn } from '../lib/cn'

export default function SearchBox({ className }: { className?: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  // isi awal ngikutin query di URL halaman /cari (komponen di-remount lewat key tiap URL berubah)
  const [value, setValue] = useState(() => (location.pathname === '/cari' ? (params.get('q') ?? '') : ''))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const q = value.trim()
    if (q) navigate(`/cari?q=${encodeURIComponent(q)}`)
  }

  return (
    <form onSubmit={submit} className={cn('relative', className)} role="search">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Cari anime…"
        className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-10 text-sm outline-none transition placeholder:text-muted focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue('')}
          className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted hover:text-white"
          aria-label="Hapus pencarian"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </form>
  )
}
