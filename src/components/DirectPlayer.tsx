// Player sendiri buat link video langsung (server bebas iklan).
// - lanjut dari menit terakhir kalau episode yang sama dibuka lagi
// - ganti kualitas tanpa balik ke awal
// - kalau video gagal dimuat (link mati / ditolak), panggil onFail biar halaman pindah ke server lain
import { useRef } from 'react'
import { getPosition, savePosition, type DirectSource } from '../lib/kuramanime'

export default function DirectPlayer({
  episodeId,
  sources,
  quality,
  onFail,
}: {
  episodeId: string
  sources: DirectSource[]
  quality: string
  onFail: () => void
}) {
  // posisi terakhir di link sebelumnya (dipakai pas ganti kualitas)
  const lastTime = useRef(0)
  const lastSaved = useRef(0)
  // lagi diputar atau nggak (biar abis ganti kualitas langsung lanjut muter)
  const playing = useRef(false)
  const current = sources.find((s) => s.quality === quality) ?? sources[0]

  return (
    <video
      src={current.url}
      controls
      playsInline
      preload="metadata"
      className="absolute inset-0 h-full w-full bg-black"
      onLoadedMetadata={(e) => {
        const v = e.currentTarget
        const target = lastTime.current || getPosition(episodeId)
        // jangan lompat kalau posisinya di awal banget atau udah mau habis
        if (target > 3 && (!Number.isFinite(v.duration) || target < v.duration - 20)) v.currentTime = target
        if (playing.current) v.play().catch(() => {})
      }}
      onPlay={() => {
        playing.current = true
      }}
      onTimeUpdate={(e) => {
        const v = e.currentTarget
        // waktu ganti link (mis. ganti kualitas), browser ngirim timeupdate dengan waktu 0
        // sebelum video barunya siap; abaikan biar posisi terakhir nggak ketimpa
        if (v.readyState < HTMLMediaElement.HAVE_METADATA) return
        const t = v.currentTime
        lastTime.current = t
        if (Math.abs(t - lastSaved.current) >= 5) {
          lastSaved.current = t
          savePosition(episodeId, t)
        }
      }}
      onPause={(e) => {
        const v = e.currentTarget
        // pause gara-gara ganti link (readyState 0) bukan pause beneran dari user
        if (v.readyState < HTMLMediaElement.HAVE_METADATA) return
        playing.current = false
        savePosition(episodeId, v.currentTime)
      }}
      onEnded={() => savePosition(episodeId, 0)}
      onError={onFail}
    />
  )
}
