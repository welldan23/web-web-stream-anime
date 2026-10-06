import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronRight, ImageUp, Link2, Loader2, Play, RotateCcw, ScanSearch } from 'lucide-react'
import Seo from '../components/Seo'
import { Card, ErrorState, Notice, PageTitle, Pill, Poster } from '../components/ui'
import { cn } from '../lib/cn'
import { pageTitle } from '../lib/site'
import {
  confidence,
  dedupe,
  displayTitle,
  episodeOf,
  findOnSite,
  formatTime,
  prepareImage,
  searchByImage,
  searchByUrl,
  TraceError,
  type TraceResult,
} from '../lib/tracemoe'

type Source = { file: Blob } | { url: string }

/** Cocokin satu hasil trace.moe ke Animeku (dipakai bareng sama kartu besar & baris kecil). */
function useSiteMatch(r: TraceResult) {
  return useQuery({
    queryKey: ['trace-match', r.anilist.id, episodeOf(r)],
    queryFn: () => findOnSite(r),
    staleTime: 1000 * 60 * 60,
    retry: false,
  })
}

function sceneText(r: TraceResult) {
  const ep = episodeOf(r)
  return `${ep !== null ? `Episode ${ep}` : 'Film / spesial'} · menit ${formatTime(r.from)}`
}

function TopResult({ r }: { r: TraceResult }) {
  const match = useSiteMatch(r)
  const conf = confidence(r)
  const ep = episodeOf(r)
  const watchTo = match.data?.episodePath ?? null
  const animeTo = match.data?.animePath ?? null
  const fallbackTo = `/cari?q=${encodeURIComponent(displayTitle(r))}`

  return (
    <Card className="overflow-hidden">
      <video
        key={r.video}
        src={`${r.video}${r.video.includes('?') ? '&' : '?'}size=m`}
        poster={r.image}
        autoPlay
        muted
        loop
        playsInline
        className="aspect-video w-full bg-black object-contain"
      />
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={conf.tone}>
            {conf.label} · {Math.round(r.similarity * 100)}%
          </Pill>
        </div>
        <h2 className="mt-2 text-xl font-bold leading-snug text-ink">{displayTitle(r)}</h2>
        {r.anilist.title.native ? <p className="text-sm text-ink-muted">{r.anilist.title.native}</p> : null}
        <p className="mt-2 text-[15px] font-semibold text-primary-600">{sceneText(r)}</p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {match.isLoading ? (
            <span className="flex flex-1 items-center justify-center gap-2 rounded-full bg-tile py-3 text-sm text-ink-muted">
              <Loader2 className="size-4 animate-spin" /> Nyari di Animeku…
            </span>
          ) : watchTo ? (
            <Link
              to={watchTo}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary-500 py-3 text-[15px] font-semibold text-on-primary active:opacity-80"
            >
              <Play className="size-4 fill-on-primary" /> Tonton Episode {ep}
            </Link>
          ) : animeTo ? (
            <Link
              to={animeTo}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary-500 py-3 text-[15px] font-semibold text-on-primary active:opacity-80"
            >
              Buka {match.data!.anime.title}
            </Link>
          ) : (
            <Link
              to={fallbackTo}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary-50 py-3 text-[15px] font-semibold text-primary-600 active:opacity-80"
            >
              Cari “{displayTitle(r)}”
            </Link>
          )}
          {watchTo && animeTo ? (
            <Link
              to={animeTo}
              className="flex items-center justify-center rounded-full bg-tile px-5 py-3 text-[15px] font-semibold text-ink active:opacity-80"
            >
              Detail anime
            </Link>
          ) : null}
        </div>
        {match.isSuccess && !match.data ? (
          <p className="mt-2 text-xs text-ink-muted">Judul ini belum ketemu di Animeku, coba cari manual.</p>
        ) : null}
      </div>
    </Card>
  )
}

function OtherResult({ r, isLast }: { r: TraceResult; isLast: boolean }) {
  const match = useSiteMatch(r)
  const to = match.data?.episodePath ?? match.data?.animePath ?? `/cari?q=${encodeURIComponent(displayTitle(r))}`
  const conf = confidence(r)
  return (
    <Link to={to} className={cn('flex items-center gap-3 py-3 active:opacity-70', !isLast && 'border-b border-line')}>
      <Poster src={r.image} alt={displayTitle(r)} className="aspect-video w-24 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-[15px] font-semibold text-ink">{displayTitle(r)}</p>
        <p className="text-[13px] text-ink-muted">{sceneText(r)}</p>
      </div>
      <Pill tone={conf.tone}>{Math.round(r.similarity * 100)}%</Pill>
      <ChevronRight className="size-4 shrink-0 text-ink-faint" />
    </Link>
  )
}

export default function ImageSearchPage() {
  const [preview, setPreview] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const search = useMutation({
    mutationFn: async (src: Source) => ('file' in src ? searchByImage(await prepareImage(src.file)) : searchByUrl(src.url)),
  })

  const startFile = (file: File | null | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    setPreview((old) => {
      if (old?.startsWith('blob:')) URL.revokeObjectURL(old)
      return URL.createObjectURL(file)
    })
    search.mutate({ file })
  }

  // tempel gambar langsung (Ctrl+V / tahan → Tempel di HP)
  const startFileRef = useRef(startFile)
  useEffect(() => {
    startFileRef.current = startFile
  })
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'))
      if (item) startFileRef.current(item.getAsFile())
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  const submitUrl = (e: FormEvent) => {
    e.preventDefault()
    const url = urlInput.trim()
    if (!/^https?:\/\//i.test(url)) return
    setPreview(url)
    search.mutate({ url })
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    startFile(e.dataTransfer.files[0])
  }

  const reset = () => {
    search.reset()
    setPreview((old) => {
      if (old?.startsWith('blob:')) URL.revokeObjectURL(old)
      return null
    })
    setUrlInput('')
  }

  const all = search.data ? dedupe(search.data) : []
  const results = all.filter((r) => !r.anilist.isAdult).slice(0, 5)
  const hiddenAdult = all.filter((r) => r.anilist.isAdult).length
  const [top, ...others] = results

  return (
    <div className="space-y-4">
      <Seo
        title={pageTitle('Cari Anime Pakai Screenshot')}
        description="Lupa judul anime? Upload screenshot-nya, nanti ketahuan judul, episode, dan menit adegannya, terus langsung tonton sub Indo."
        path="/cari-gambar"
      />
      <PageTitle title="Cari Pakai Gambar" subtitle="Upload screenshot anime, nanti ketahuan judul & episodenya" />

      {!preview ? (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'flex flex-col items-center gap-3 rounded-[20px] border-2 border-dashed px-6 py-10 text-center transition',
              dragging ? 'border-primary-500 bg-primary-50' : 'border-line bg-surface',
            )}
          >
            <div className="grid size-14 place-items-center rounded-full bg-primary-50 text-primary-500">
              <ImageUp className="size-7" />
            </div>
            <div>
              <p className="font-semibold text-ink">Pilih atau seret screenshot ke sini</p>
              <p className="mt-1 text-sm text-ink-muted">Bisa juga tempel gambar langsung (Ctrl+V). JPG/PNG, maks 25 MB.</p>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-full bg-primary-500 px-6 py-3 text-[15px] font-semibold text-on-primary active:opacity-80"
            >
              Pilih Gambar
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => startFile(e.target.files?.[0])}
            />
          </div>

          <form onSubmit={submitUrl} className="relative">
            <Link2 className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-faint" />
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="atau tempel link gambar (https://…)"
              inputMode="url"
              className="h-12 w-full rounded-full border border-line bg-surface pl-11 pr-24 text-[15px] shadow-card outline-none placeholder:text-ink-faint focus:border-primary-500"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-600 active:opacity-70"
            >
              Cari
            </button>
          </form>

          <Card className="space-y-2 p-4 text-sm text-ink-muted">
            <p className="font-semibold text-ink">Biar hasilnya akurat</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Pakai screenshot asli dari video, jangan yang udah diedit atau di-crop kecil.</li>
              <li>Fan art, gambar manga, atau poster biasanya nggak bakal ketemu.</li>
              <li>Gambar kamu dikirim ke trace.moe buat dicari, nggak disimpan di Animeku.</li>
            </ul>
          </Card>
        </>
      ) : (
        <Card className="flex items-center gap-3 p-3">
          <img src={preview} alt="Gambar yang dicari" className="h-16 w-28 shrink-0 rounded-lg bg-tile object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">
              {search.isPending ? 'Lagi dicari…' : search.isError ? 'Gagal mencari' : `${results.length} hasil`}
            </p>
            <p className="text-xs text-ink-muted">via trace.moe</p>
          </div>
          {search.isPending ? (
            <Loader2 className="size-5 animate-spin text-primary-500" />
          ) : (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 rounded-full bg-tile px-3 py-2 text-[13px] font-semibold text-ink active:opacity-70"
            >
              <RotateCcw className="size-3.5" /> Ganti
            </button>
          )}
        </Card>
      )}

      {search.isError ? (
        search.error instanceof TraceError ? (
          <Notice tone="danger">{search.error.message}</Notice>
        ) : (
          <ErrorState error={search.error} onRetry={reset} />
        )
      ) : null}

      {search.isSuccess && !top ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <ScanSearch className="size-8 text-ink-faint" />
          <p className="font-semibold text-ink">Nggak ketemu</p>
          <p className="text-sm text-ink-muted">Coba pakai screenshot lain yang lebih jelas.</p>
        </Card>
      ) : null}

      {top ? (
        <>
          {top.similarity < 0.85 ? (
            <Notice>Hasilnya kurang yakin. Coba pakai screenshot yang lebih jelas biar akurat.</Notice>
          ) : null}
          <TopResult r={top} />
        </>
      ) : null}

      {others.length > 0 ? (
        <div className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase text-ink-faint">Kemungkinan lain</p>
          <Card className="px-4">
            {others.map((r, i) => (
              <OtherResult key={`${r.anilist.id}-${episodeOf(r)}-${i}`} r={r} isLast={i === others.length - 1} />
            ))}
          </Card>
        </div>
      ) : null}

      {hiddenAdult > 0 ? (
        <p className="px-1 text-xs text-ink-faint">{hiddenAdult} hasil 18+ disembunyiin.</p>
      ) : null}
    </div>
  )
}
