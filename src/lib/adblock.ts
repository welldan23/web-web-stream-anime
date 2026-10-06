// Blokir pop-up iklan dari player iframe.
// Iklan yang tampil DI DALAM video nggak bisa dihapus (beda domain, browser ngelarang).
// Yang bisa diblokir: pop-up/tab baru & redirect halaman ke situs iklan, pakai atribut
// `sandbox` di iframe. Sebagian player nolak muter kalau di-sandbox, makanya bisa dimatiin user.

const BLOCK_KEY = 'animeku:block-popups'

/** Izin buat iframe yang di-sandbox: video tetap jalan, tapi nggak boleh buka pop-up / pindah halaman. */
export const PLAYER_SANDBOX =
  'allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock allow-pointer-lock'

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
