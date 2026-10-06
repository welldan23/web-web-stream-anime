// Aturan pilih server streaming.
// Dari pengalaman, server otakudesu yang lancar cuma Vidhide & Mega; sisanya
// (player bawaan, ondesu, filedon, dll) sering gagal. Kalau nanti ada server
// lain yang lancar, tinggal tambahin namanya di sini (urutan = prioritas).
import type { Quality, Server } from './api'

export const RELIABLE_SERVERS = ['vidhide', 'mega']

const QUALITY_ORDER = ['720p', '480p', '360p']
const PREF_KEY = 'animeku:player'

export interface ServerOption extends Server {
  quality: string
  /** Nama server yang dikenali, mis. "vidhide"; null kalau bukan server andalan. */
  reliable: string | null
}

interface PlayerPref {
  server?: string
  quality?: string
}

function readPref(): PlayerPref {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}') as PlayerPref
  } catch {
    return {}
  }
}

const reliableName = (title: string) => RELIABLE_SERVERS.find((name) => title.toLowerCase().includes(name)) ?? null

/** Semua server dari respons episode, diratakan jadi satu daftar. */
export function flattenServers(qualities: Quality[]): ServerOption[] {
  return qualities.flatMap((q) =>
    (q.serverList ?? []).map((s) => ({ ...s, quality: q.title, reliable: reliableName(s.title) })),
  )
}

/**
 * Urutan server andalan buat dicoba otomatis: pilihan terakhir user dulu;
 * kalau blokir pop-up nyala, server yang mau di-sandbox didahulukan;
 * lalu kualitas 720p → 480p → 360p dan urutan RELIABLE_SERVERS.
 */
export function autoCandidates(options: ServerOption[], blockPopups = false): ServerOption[] {
  const pref = readPref()
  const prefRank = (o: ServerOption) => (pref.server && o.reliable === pref.server ? 0 : 1)
  const sandboxRank = (o: ServerOption) => (blockPopups && !canSandbox(o) ? 1 : 0)
  const serverRank = (o: ServerOption) => RELIABLE_SERVERS.indexOf(o.reliable ?? '')
  const qualityRank = (o: ServerOption) => {
    if (o.quality === pref.quality) return -1
    const i = QUALITY_ORDER.indexOf(o.quality)
    return i === -1 ? QUALITY_ORDER.length : i
  }
  return options
    .filter((o) => o.reliable)
    .sort(
      (a, b) =>
        prefRank(a) - prefRank(b) ||
        sandboxRank(a) - sandboxRank(b) ||
        qualityRank(a) - qualityRank(b) ||
        serverRank(a) - serverRank(b),
    )
}

/** Simpan pilihan user biar episode berikutnya langsung pakai server & kualitas yang sama. */
export function rememberServer(option: ServerOption) {
  if (!option.reliable) return
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify({ server: option.reliable, quality: option.quality }))
  } catch {
    // nggak apa-apa kalau gagal nyimpen
  }
}

/** Urutan buat ditampilin: kualitas tertinggi dulu, lalu urutan RELIABLE_SERVERS. */
export function sortForDisplay(options: ServerOption[]) {
  const q = (o: ServerOption) => {
    const i = QUALITY_ORDER.indexOf(o.quality)
    return i === -1 ? QUALITY_ORDER.length : i
  }
  const r = (o: ServerOption) => RELIABLE_SERVERS.indexOf(o.reliable ?? '')
  return [...options].sort((a, b) => q(a) - q(b) || r(a) - r(b))
}

export function serverLabel(o: ServerOption) {
  const name = o.title.trim()
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${o.quality}`
}

// ---------- Blokir pop-up iklan ----------
// Iklan yang tampil DI DALAM video nggak bisa dihapus (beda domain, browser ngelarang).
// Yang bisa diblokir: pop-up/tab baru & redirect halaman ke situs iklan, pakai
// atribut `sandbox` di iframe. Beberapa server nolak muter kalau di-sandbox,
// makanya bisa dimatiin user.

const BLOCK_KEY = 'animeku:block-popups'

/**
 * Server yang nolak muter kalau iframe-nya di-sandbox
 * (Vidhide nampilin "This video is not available due to sandboxed iframe!").
 * Buat server ini blokir pop-up otomatis dimatiin biar videonya tetap jalan.
 */
export const NO_SANDBOX_SERVERS = ['vidhide']

/** `undefined` = player bawaan (server nggak diketahui), dianggap boleh di-sandbox. */
export function canSandbox(option: Pick<ServerOption, 'title'> | undefined) {
  if (!option) return true
  const title = option.title.toLowerCase()
  return !NO_SANDBOX_SERVERS.some((name) => title.includes(name))
}

/** Izin buat iframe yang di-sandbox: video tetap jalan, tapi nggak boleh buka pop-up / pindah halaman. */
export const PLAYER_SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock allow-pointer-lock'

export function readBlockPopups() {
  try {
    return localStorage.getItem(BLOCK_KEY) !== 'off'
  } catch {
    return true
  }
}

export function saveBlockPopups(on: boolean) {
  try {
    localStorage.setItem(BLOCK_KEY, on ? 'on' : 'off')
  } catch {
    // abaikan
  }
}
