import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownRight, ArrowUpRight, Loader2, LockKeyhole, LogOut, RefreshCw } from 'lucide-react'
import Seo from '../components/Seo'
import { Card, CardSection, Chip, Notice, PageTitle, Skeleton } from '../components/ui'
import { cn } from '../lib/cn'
import { pageTitle } from '../lib/site'
import { AdminError, adminApi, type AdminStats, type Totals } from '../lib/stats'

const numberFormat = new Intl.NumberFormat('id-ID')
const compactFormat = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 })
const formatNumber = (n: number) => (n >= 10_000 ? compactFormat.format(n) : numberFormat.format(n))
const dayLabel = (day: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  new Intl.DateTimeFormat('id-ID', { ...opts, timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`))

function LoginCard({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await adminApi.login(password)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="mx-auto max-w-sm px-5 py-6">
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-primary-50 text-primary-500">
        <LockKeyhole className="size-5" />
      </div>
      <h1 className="text-xl font-bold text-ink">Dashboard Admin</h1>
      <p className="mt-1 text-sm text-ink-muted">Khusus pemilik Animeku. Masukin password admin.</p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          aria-label="Password admin"
          className="h-11 w-full rounded-full bg-subtle px-4 text-sm text-ink outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-primary-500/30"
        />
        {error ? <p className="text-sm text-danger-600">{error}</p> : null}
        <button
          disabled={busy || !password}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary-500 text-[15px] font-semibold text-on-primary active:opacity-80 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Masuk
        </button>
      </form>
    </Card>
  )
}

/** Perubahan dibanding periode sebelumnya (naik = bagus buat semua angka di sini). */
function Delta({ now, before, days }: { now: number; before: number; days: number }) {
  if (before === 0) return <p className="mt-1 text-xs text-ink-faint">{now > 0 ? 'Belum ada data pembanding' : '—'}</p>
  const change = Math.round(((now - before) / before) * 100)
  const up = change >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-1 text-xs">
      <span className={cn('inline-flex items-center gap-0.5 font-semibold', up ? 'text-success-600' : 'text-danger-600')}>
        <Icon className="size-3.5" />
        {up ? '+' : ''}
        {change}%
      </span>
      <span className="whitespace-nowrap text-ink-faint">vs {days} hari sebelumnya</span>
    </p>
  )
}

function StatTile({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <Card className="px-4 py-4">
      <p className="text-[13px] font-medium text-ink-muted">{label}</p>
      <p className="mt-1 text-[26px] font-semibold leading-tight text-ink">{value}</p>
      {children}
    </Card>
  )
}

const TILES: { key: keyof Totals; label: string }[] = [
  { key: 'visitors', label: 'Pengunjung' },
  { key: 'views', label: 'Halaman dibuka' },
  { key: 'watches', label: 'Episode ditonton' },
  { key: 'searches', label: 'Pencarian' },
  { key: 'appVisitors', label: 'Pengguna aplikasi' },
]

const METRICS = [
  { key: 'visitors', label: 'Pengunjung' },
  { key: 'watches', label: 'Episode ditonton' },
  { key: 'views', label: 'Halaman dibuka' },
  { key: 'searches', label: 'Pencarian' },
] as const
type Metric = (typeof METRICS)[number]['key']

/** Batas atas sumbu yang bulat (1, 2, 5 × 10ⁿ), dibagi 4 garis. */
function niceScale(max: number) {
  if (max <= 4) return { top: 4, step: 1 }
  const raw = max / 4
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw
  return { top: step * 4, step }
}

function DailyChart({ daily }: { daily: AdminStats['daily'] }) {
  const [metric, setMetric] = useState<Metric>('visitors')
  const [hover, setHover] = useState<number | null>(null)
  const label = METRICS.find((m) => m.key === metric)!.label
  const values = daily.map((d) => d[metric])
  const { top, step } = niceScale(Math.max(...values, 0))
  const ticks = Array.from({ length: 5 }, (_, i) => top - i * step)
  const labelEvery = daily.length > 10 ? 5 : 1

  return (
    <CardSection title="Per hari" subtitle={`${label} tiap hari`}>
      <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {METRICS.map((m) => (
          <Chip key={m.key} size="sm" active={metric === m.key} onClick={() => setMetric(m.key)}>
            {m.label}
          </Chip>
        ))}
      </div>

      <div className="flex gap-2">
        {/* sumbu Y */}
        <div className="relative h-44 w-8 shrink-0 text-right text-[11px] tabular-nums text-ink-faint">
          {ticks.map((t, i) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(i / 4) * 100}%` }}>
              {formatNumber(t)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-44" onMouseLeave={() => setHover(null)}>
            {ticks.map((t, i) => (
              <div key={t} className="absolute inset-x-0 h-px bg-line" style={{ top: `${(i / 4) * 100}%` }} />
            ))}
            <div className="absolute inset-0 flex items-end">
              {daily.map((d, i) => {
                const value = values[i]
                const active = hover === i
                return (
                  <button
                    key={d.day}
                    type="button"
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    onClick={() => setHover(i)}
                    aria-label={`${dayLabel(d.day)}: ${numberFormat.format(value)} ${label.toLowerCase()}`}
                    className="relative flex h-full min-w-0 flex-1 items-end justify-center px-px outline-none"
                  >
                    <span
                      className={cn(
                        'block w-full max-w-6 rounded-t-[4px] transition-opacity',
                        value > 0 ? 'bg-primary-500' : 'bg-transparent',
                        hover !== null && !active && 'opacity-50',
                      )}
                      style={{ height: `${(value / top) * 100}%` }}
                    />
                    {active ? (
                      <span
                        className={cn(
                          'pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg bg-tile px-2.5 py-1.5 text-left text-xs shadow-card',
                          i < daily.length / 2 ? 'left-0' : 'right-0',
                        )}
                      >
                        <span className="block text-ink-muted">{dayLabel(d.day, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                        <span className="block font-semibold text-ink">
                          {numberFormat.format(value)} {label.toLowerCase()}
                        </span>
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
          {/* sumbu X */}
          <div className="mt-1.5 flex text-[11px] text-ink-faint">
            {daily.map((d, i) => (
              <span key={d.day} className="min-w-0 flex-1 text-center">
                {(daily.length - 1 - i) % labelEvery === 0 ? dayLabel(d.day, { day: 'numeric' }) : ''}
              </span>
            ))}
          </div>
        </div>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-semibold text-primary-500">Lihat tabel</summary>
        <div className="mt-2 max-h-72 overflow-auto">
          <table className="w-full text-left tabular-nums">
            <thead className="text-xs text-ink-muted">
              <tr>
                <th className="py-1.5 font-medium">Tanggal</th>
                {METRICS.map((m) => (
                  <th key={m.key} className="py-1.5 text-right font-medium">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-ink-soft">
              {[...daily].reverse().map((d) => (
                <tr key={d.day} className="border-t border-line">
                  <td className="py-1.5">{dayLabel(d.day)}</td>
                  {METRICS.map((m) => (
                    <td key={m.key} className="py-1.5 text-right">
                      {numberFormat.format(d[m.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </CardSection>
  )
}

/** Daftar peringkat dengan batang tipis sepanjang jumlahnya. */
function RankList({
  items,
  empty,
}: {
  items: { key: string; label: ReactNode; count: number; note?: string }[]
  empty: string
}) {
  if (items.length === 0) return <p className="py-3 text-sm text-ink-muted">{empty}</p>
  const max = items[0].count
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={item.key} className="flex items-center gap-3">
          <span className="w-5 shrink-0 text-right text-sm font-semibold tabular-nums text-ink-faint">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium text-ink">{item.label}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-soft">
                {numberFormat.format(item.count)}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-tile">
              <div className="h-full rounded-full bg-primary-500" style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
            {item.note ? <p className="mt-1 text-xs text-ink-faint">{item.note}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

function Dashboard({ data, days }: { data: AdminStats; days: number }) {
  const apkDate = data.apk?.publishedAt ? dayLabel(data.apk.publishedAt.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' }) : null

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {TILES.map((t) => (
          <StatTile key={t.key} label={t.label} value={formatNumber(data.totals[t.key])}>
            <Delta now={data.totals[t.key]} before={data.previous[t.key]} days={days} />
          </StatTile>
        ))}
        <StatTile label="Download APK" value={data.apk ? formatNumber(data.apk.downloads) : '—'}>
          <p className="mt-1 text-xs text-ink-faint">
            {data.apk ? `Build terbaru${apkDate ? ` · ${apkDate}` : ''}` : 'GitHub nggak bisa dihubungi'}
          </p>
        </StatTile>
      </div>

      <DailyChart daily={data.daily} />

      <div className="grid gap-4 lg:grid-cols-2">
        <CardSection title="Anime paling banyak ditonton" subtitle={`${days} hari terakhir`}>
          <RankList
            empty="Belum ada yang nonton."
            items={data.topAnime.map((a) => ({
              key: a.animeId,
              count: a.count,
              label: (
                <Link to={`/anime/${a.animeId}`} className="hover:underline">
                  {a.title}
                </Link>
              ),
            }))}
          />
        </CardSection>

        <div className="space-y-4">
          <CardSection title="Paling sering dicari" subtitle={`${days} hari terakhir`}>
            <RankList
              empty="Belum ada pencarian."
              items={data.topSearches.map((s) => ({
                key: s.q,
                label: `“${s.q}”`,
                count: s.count,
                note: s.empty > 0 ? `${numberFormat.format(s.empty)}× nggak ada hasil` : undefined,
              }))}
            />
          </CardSection>
          <CardSection title="Dicari tapi nggak ketemu" subtitle="Bisa jadi ide: judulnya beda atau belum ada di Otakudesu">
            <RankList
              empty="Semua pencarian ketemu hasilnya."
              items={data.emptySearches.map((s) => ({ key: s.q, label: `“${s.q}”`, count: s.count }))}
            />
          </CardSection>
        </div>
      </div>
    </>
  )
}

export default function AdminPage() {
  const queryClient = useQueryClient()
  const [days, setDays] = useState<7 | 30>(7)
  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-stats', days],
    queryFn: () => adminApi.stats(days),
    retry: false,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
  const needsLogin = error instanceof AdminError && error.status === 401

  const logout = async () => {
    await adminApi.logout().catch(() => {})
    queryClient.removeQueries({ queryKey: ['admin-stats'] })
    refetch()
  }

  return (
    <div className="space-y-4">
      <Seo title={pageTitle('Dashboard Admin')} description="Dashboard admin Animeku." path="/admin" noindex />

      {needsLogin ? (
        <LoginCard onDone={() => queryClient.invalidateQueries({ queryKey: ['admin-stats'] })} />
      ) : (
        <>
          <PageTitle
            title="Dashboard"
            subtitle={data ? `Statistik Animeku · zona waktu ${data.timeZone}` : 'Statistik Animeku'}
            action={
              data ? (
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 rounded-full bg-tile px-3 py-2 text-[13px] font-semibold text-ink-soft active:opacity-70"
                >
                  <LogOut className="size-3.5" /> Keluar
                </button>
              ) : null
            }
          />

          <div className="flex items-center gap-2">
            <Chip size="sm" active={days === 7} onClick={() => setDays(7)}>
              7 hari
            </Chip>
            <Chip size="sm" active={days === 30} onClick={() => setDays(30)}>
              30 hari
            </Chip>
            <button
              onClick={() => refetch()}
              aria-label="Muat ulang"
              className="ml-auto grid size-9 place-items-center rounded-full bg-tile text-ink-soft active:opacity-70"
            >
              <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} />
            </button>
          </div>

          {error && !needsLogin ? <Notice tone="danger">{error.message}</Notice> : null}

          {isLoading ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-24 rounded-[20px]" />
                ))}
              </div>
              <Skeleton className="h-72 rounded-[20px]" />
            </>
          ) : data ? (
            <Dashboard data={data} days={days} />
          ) : null}
        </>
      )}
    </div>
  )
}
