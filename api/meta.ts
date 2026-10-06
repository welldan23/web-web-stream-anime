// Vercel Edge Function: suntik meta tag (judul, deskripsi, poster, JSON-LD)
// ke index.html buat halaman /anime/:id/:slug dan /nonton/:id/:slug/:episode.
//
// Kenapa perlu? Bot WhatsApp/Facebook/Twitter/Discord nggak jalanin JavaScript,
// jadi tanpa ini preview link-nya cuma judul default. Google juga dapet info
// halaman lebih cepat tanpa nunggu JS. Logikanya ada di seo/render.ts
// (dipakai juga waktu `npm run dev` / `npm run preview`).
//
// Env: API_URL (atau VITE_API_URL kalau udah alamat lengkap) dan
// VITE_SITE_URL (opsional, default = domain yang lagi diakses).
import { renderPage } from '../seo/render.ts'

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const site = (process.env.VITE_SITE_URL || url.origin).replace(/\/+$/, '')

  // cookie diteruskan biar tetap jalan di preview deployment yang dikunci (Vercel Authentication)
  const shell = await fetch(new URL('/index.html', url.origin), {
    headers: { cookie: req.headers.get('cookie') ?? '' },
  })
  if (!shell.ok) return shell

  const { html, status } = await renderPage(await shell.text(), {
    url,
    api: process.env.API_URL || process.env.VITE_API_URL,
    site,
  })

  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // cache di CDN Vercel 10 menit, sisanya diperbarui di belakang layar
      'cache-control':
        status === 200 ? 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400' : 'public, max-age=0, s-maxage=60',
    },
  })
}
