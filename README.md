# Animeku 🎬

Web streaming anime subtitle Indonesia. Fiturnya ala **Tatakai** (player dengan pilihan server, koleksi, riwayat nonton), tampilannya ngikutin gaya **MyWallet** ([wallet-custodial](https://github.com/welldan23/wallet-custodial)): header dengan menu pil dan kartu bersudut bulat, tapi pakai **tema gelap nuansa kopi**: coklat tua dengan aksen karamel.

Frontend ini ngambil data dari **[wajik-anime-api](https://github.com/wajik45/wajik-anime-api)** (sumber: Otakudesu). Animeku nggak nyimpen atau nge-host video apa pun.

## Fitur

- **Beranda**: kartu *Lanjut Nonton*, pintasan (Ongoing, Tamat, Genre, A–Z), rilis hari ini, anime sedang tayang & baru tamat
- **Jadwal rilis** per hari (otomatis kebuka di hari ini)
- **Sedang Tayang / Sudah Tamat** dengan halaman (pagination)
- **Genre** dan **Daftar A–Z** (bisa disaring)
- **Pencarian** anime
- **Detail anime**: info lengkap, sinopsis, daftar episode (bisa diurutkan & dicari), tanda episode yang udah ditonton, rekomendasi
- **Halaman nonton**: player, pilih server per kualitas (360p/480p/720p), episode sebelumnya/berikutnya, link download
- **Koleksi** (watchlist) dan **Riwayat** — disimpan di browser (localStorage), nggak perlu login
- Responsif: menu pil di header, navigasi bawah di HP

## Teknologi

React 19 + TypeScript + Vite + Tailwind CSS v4, React Router, TanStack Query, lucide-react (ikon).

## Cara Menjalankan

Butuh Node.js 20+.

### 1. Jalankan wajik-anime-api

```sh
git clone https://github.com/wajik45/wajik-anime-api.git
cd wajik-anime-api
npm install
npm run dev   # jalan di http://localhost:3001
```

> Kalau datanya kosong / error 403, kemungkinan domain sumbernya ganti. Update URL-nya di `src/configs/otakudesu.config.ts` (di repo API).

### 2. Jalankan frontend ini

```sh
npm install
cp .env.example .env   # opsional, default-nya udah nyambung ke localhost:3001
npm run dev            # buka http://localhost:5173
```

Waktu `npm run dev`, semua request ke `/api/*` diteruskan Vite ke `http://localhost:3001`, jadi nggak kena masalah CORS.

### Build untuk produksi

```sh
npm run build    # hasil di folder dist/
npm run preview
```

### Deploy ke Vercel

1. Deploy **wajik-anime-api** dulu (repo-nya udah ada `vercel.json`), catat alamatnya.
2. Import repo ini ke Vercel, terus isi *Environment Variables*:

   | Nama | Contoh | Fungsi |
   |---|---|---|
   | `VITE_API_URL` | `https://wajik-anime-api-kamu.vercel.app` | alamat API buat browser |
   | `VITE_SITE_URL` | `https://animeku.vercel.app` | alamat web kamu (buat SEO) |
   | `API_URL` | *(opsional)* | alamat API buat server, kalau beda dari `VITE_API_URL` |

3. Deploy. `vercel.json` udah ngatur routing halaman dan fungsi SEO-nya.

## SEO

Yang udah disiapin biar gampang ketemu di Google & rapi pas dibagikan:

- **Judul & deskripsi beda tiap halaman**, misal *“Nonton One Piece Episode 3 Sub Indo – Animeku”* (komponen `src/components/Seo.tsx`, isinya dari `src/lib/site.ts`).
- **Canonical URL, Open Graph & Twitter Card**: preview link di WhatsApp/Facebook/X/Discord muncul lengkap dengan poster.
- **Fungsi server `api/meta.ts`** (Vercel Edge): halaman `/anime/...` dan `/nonton/...` langsung dikirim dengan meta tag yang benar, jadi bot yang nggak jalanin JavaScript tetap dapet judul & poster. Anime/episode yang nggak ada dibalas status **404** beneran.
- **Data terstruktur (JSON-LD)**: `WebSite` + kotak pencarian, `TVSeries`, `TVEpisode`, dan `BreadcrumbList`.
- **`sitemap.xml` & `robots.txt` otomatis** waktu build (`seo/vite-plugin-seo.ts`). Sitemap berisi semua anime & genre dari API.
- Halaman pencarian, koleksi, riwayat, dan 404 di-`noindex` biar nggak nyampah di Google.
- Lebih cepat dimuat: tiap halaman dipecah jadi file JS sendiri, gambar *lazy load*, *preconnect* ke API, cache file statis 1 tahun.
- Gambar preview `public/og-image.png`, ikon aplikasi, dan `manifest.webmanifest`.

Setelah online, daftarin web kamu di **Google Search Console** terus kirim `https://web-kamu/sitemap.xml` biar cepat diindeks.

## Struktur Folder

```
src/
├── components/   # Layout (header + menu pil + nav HP), SearchBox, Seo, komponen UI (kartu, pil, skeleton…)
├── lib/          # api.ts (client API), library.ts (koleksi & riwayat), site.ts (data SEO), helper lain
└── pages/        # Beranda, Detail, Nonton, Jelajah (ongoing/tamat/genre/jadwal/A–Z/cari), Koleksi & Riwayat
api/meta.ts       # fungsi Vercel: suntik meta tag SEO ke halaman anime & episode
seo/              # plugin Vite: sitemap.xml, robots.txt, preconnect
```

## Catatan

Project ini buat belajar. Konten video berasal dari situs pihak ketiga lewat wajik-anime-api, jadi hak ciptanya tetap milik pemiliknya masing-masing.
