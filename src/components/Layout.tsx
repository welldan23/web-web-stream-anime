import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Bookmark, CalendarDays, Home, LayoutGrid, Search } from 'lucide-react'
import { cn } from '../lib/cn'
import SearchBox from './SearchBox'

type NavItem = { to: string; label: string; icon: typeof Home; match: (path: string) => boolean }

const home: NavItem = { to: '/', label: 'Beranda', icon: Home, match: (p) => p === '/' }
const schedule: NavItem = { to: '/jadwal', label: 'Jadwal', icon: CalendarDays, match: (p) => p === '/jadwal' }
const genre: NavItem = { to: '/genre', label: 'Genre', icon: LayoutGrid, match: (p) => p.startsWith('/genre') }
const library: NavItem = {
  to: '/koleksi',
  label: 'Koleksi',
  icon: Bookmark,
  match: (p) => p === '/koleksi' || p === '/riwayat',
}
const search: NavItem = { to: '/cari', label: 'Cari', icon: Search, match: (p) => p === '/cari' }

const desktopPills = [home, schedule, genre, library]
const mobilePills = [home, schedule, library]
const bottomNav = [home, schedule, search, library]

/** Menu pil di header: aktif = putih, sisanya transparan. */
function Pills({ items, pathname, className }: { items: NavItem[]; pathname: string; className?: string }) {
  return (
    <nav className={cn('flex gap-2', className)}>
      {items.map(({ to, label, icon: Icon, match }) => {
        const active = match(pathname)
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-semibold transition active:opacity-80 md:flex-none md:px-4',
              active ? 'bg-surface text-ink' : 'bg-white/10 text-ink-soft hover:bg-white/15',
            )}
          >
            <Icon className={cn('size-[17px] shrink-0', active ? 'text-primary-500' : 'text-ink-soft')} />
            <span className="truncate">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export default function Layout() {
  const { pathname, search: query } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="relative min-h-dvh bg-brand-300">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-br from-brand-500 via-brand-400 to-brand-300" />

      <header className="relative mx-auto flex max-w-5xl items-center gap-3 px-4 pb-4 pt-3 sm:gap-5 sm:pt-4">
        <Link to="/" className="hidden shrink-0 text-xl font-bold tracking-tight text-ink sm:block">
          Animeku
        </Link>
        <Pills items={desktopPills} pathname={pathname} className="hidden md:flex" />
        <Pills items={mobilePills} pathname={pathname} className="flex-1 md:hidden" />
        <SearchBox key={pathname + query} onHeader className="ml-auto hidden w-64 lg:block" />
        <Link
          to="/cari"
          aria-label="Cari"
          className="ml-auto hidden size-11 shrink-0 place-items-center rounded-full bg-white/10 text-ink-soft active:opacity-80 md:grid lg:hidden"
        >
          <Search className="size-5" />
        </Link>
      </header>

      {/* Lembaran konten bersudut melengkung */}
      <main className="relative min-h-[calc(100dvh-68px)] rounded-t-[28px] bg-canvas bg-[linear-gradient(var(--c-surface),var(--c-canvas)_360px)]">
        <div className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:pb-12">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-4">
          {bottomNav.map(({ to, label, icon: Icon, match }) => (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center gap-1 pb-2 pt-2.5 text-xs font-semibold',
                match(pathname) ? 'text-primary-500' : 'text-ink-faint',
              )}
            >
              <Icon className={cn('size-6', match(pathname) && 'fill-primary-500/15')} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
