// Kartu "Tahukah kamu?" — fakta anime dari src/data/animeFacts.ts.
// Datanya dimuat terpisah (dynamic import) biar nggak nambah berat loading awal.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Lightbulb, Shuffle } from 'lucide-react'
import { Card, Pill } from './ui'

function useFactsData() {
  return useQuery({
    queryKey: ['anime-facts'],
    queryFn: () => import('../data/animeFacts'),
    staleTime: Infinity,
  })
}

function FactShell({
  title,
  name,
  fact,
  onNext,
  footer,
}: {
  title: string
  name: string
  fact: string
  onNext?: () => void
  footer?: React.ReactNode
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-500">
          <Lightbulb className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-ink">{title}</p>
          <Pill tone="neutral" className="mt-0.5">
            {name}
          </Pill>
        </div>
        {onNext ? (
          <button
            onClick={onNext}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-tile px-3 py-1.5 text-[13px] font-semibold text-ink-soft active:opacity-70"
          >
            <Shuffle className="size-3.5" /> Fakta lain
          </button>
        ) : null}
      </div>
      <p key={fact} className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        {fact}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        {footer ?? <span />}
        <span className="text-right text-[11px] text-ink-faint">Sumber: AnimeFacts</span>
      </div>
    </Card>
  )
}

/** Di halaman detail: fakta buat anime itu (kalau ada datanya). */
export function AnimeFactCard({ titles }: { titles: (string | null | undefined)[] }) {
  const { data } = useFactsData()
  const group = data?.factsFor(titles) ?? null
  const [offset, setOffset] = useState(() => Math.floor(Math.random() * 1000))
  if (!group) return null

  return (
    <FactShell
      title="Tahukah kamu?"
      name={group.name}
      fact={group.facts[offset % group.facts.length]}
      onNext={group.facts.length > 1 ? () => setOffset((o) => o + 1) : undefined}
    />
  )
}

/** Di beranda: fakta hari ini (sama buat semua orang di hari yang sama), bisa diacak. */
export function DailyFactCard() {
  const { data } = useFactsData()
  const [day] = useState(() => Math.floor(Date.now() / 86_400_000))
  const [offset, setOffset] = useState(0)
  if (!data) return null
  const all = data.ALL_FACTS
  // langkah 37 biar "Fakta lain" lompat ke anime yang beda-beda, nggak urut
  const item = all[(day * 7 + offset * 37) % all.length]

  return (
    <FactShell
      title={offset === 0 ? 'Fakta Anime Hari Ini' : 'Fakta Anime'}
      name={item.group.name}
      fact={item.fact}
      onNext={() => setOffset((o) => o + 1)}
      footer={
        // cari pakai judul romaji (alias pertama), karena judul otakudesu biasanya romaji (mis. "Kimetsu no Yaiba")
        <Link
          to={`/cari?q=${encodeURIComponent(item.group.aliases[0])}`}
          className="shrink-0 text-[13px] font-semibold text-primary-500 hover:underline"
        >
          Cari anime-nya ›
        </Link>
      }
    />
  )
}
