import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Clapperboard,
  History,
  Home,
  LayoutGrid,
  ListOrdered,
  Search,
  Tv,
} from 'lucide-react'
import { cn } from '../lib/cn'
import SearchBox from './SearchBox'

const mainNav = [
  { to: '/', label: 'Beranda', icon: Home, end: true },
  { to: '/jadwal', label: 'Jadwal Rilis', icon: CalendarDays },
  { to: '/ongoing', label: 'Sedang Tayang', icon: Tv },
  { to: '/tamat', label: 'Sudah Tamat', icon: CheckCircle2 },
  { to: '/genre', label: 'Genre', icon: LayoutGrid },
  { to: '/daftar', label: 'Daftar A–Z', icon: ListOrdered },
]

const libraryNav = [
  { to: '/koleksi', label: 'Koleksi', icon: Bookmark },
  { to: '/riwayat', label: 'Riwayat', icon: History },
]

const mobileNav = [
  { to: '/', label: 'Beranda', icon: Home, end: true },
  { to: '/jadwal', label: 'Jadwal', icon: CalendarDays },
  { to: '/cari', label: 'Cari', icon: Search },
  { to: '/genre', label: 'Genre', icon: LayoutGrid },
  { to: '/koleksi', label: 'Koleksi', icon: Bookmark },
]

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 shadow-lg shadow-accent/30">
        <Clapperboard className="size-5 text-white" />
      </span>
      <span className="text-xl font-extrabold tracking-tight">
        Anime<span className="text-gradient">ku</span>
      </span>
    </Link>
  )
}

function SideLink({ to, label, icon: Icon, end }: (typeof mainNav)[number]) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
          isActive
            ? 'bg-gradient-to-r from-accent/20 to-transparent text-white shadow-[inset_3px_0_0_var(--color-accent)]'
            : 'text-muted hover:bg-surface-2 hover:text-white',
        )
      }
    >
      <Icon className="size-[18px]" />
      {label}
    </NavLink>
  )
}

export default function Layout() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="min-h-dvh">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-bg/95 px-4 py-5 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-widest text-muted/70">Jelajah</p>
          {mainNav.map((item) => (
            <SideLink key={item.to} {...item} />
          ))}
          <p className="px-3 pb-2 pt-6 text-[11px] font-bold uppercase tracking-widest text-muted/70">Punyaku</p>
          {libraryNav.map((item) => (
            <SideLink key={item.to} {...item} />
          ))}
        </nav>
        <div className="rounded-xl border border-line bg-surface p-3 text-xs leading-relaxed text-muted">
          Data dari <b className="text-zinc-200">wajik-anime-api</b> (sumber: Otakudesu). Animeku nggak nyimpen video
          apa pun.
        </div>
      </aside>

      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-xl lg:pl-64">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <div className="lg:hidden">
            <Logo />
          </div>
          <SearchBox key={pathname + search} className="ml-auto hidden w-full max-w-md sm:block lg:ml-0" />
          <Link
            to="/cari"
            className="ml-auto grid size-10 place-items-center rounded-xl bg-surface text-muted sm:hidden"
            aria-label="Cari"
          >
            <Search className="size-5" />
          </Link>
        </div>
      </header>

      <main className="pb-24 lg:pb-10 lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5">
          {mobileNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium',
                  isActive ? 'text-accent' : 'text-muted',
                )
              }
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
