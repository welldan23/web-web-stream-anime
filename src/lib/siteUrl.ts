// Alamat web (tanpa "/" di akhir) buat canonical URL & og:url.
// Isi VITE_SITE_URL di produksi, mis. https://animeku.vercel.app
export const SITE_URL = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/+$/, '')
