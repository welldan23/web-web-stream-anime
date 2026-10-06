# Animeku 🎬

Web streaming anime subtitle Indonesia **tanpa iklan**. Fiturnya ala **Tatakai** (koleksi, riwayat, cari pakai gambar, data AniList), tampilannya ngikutin gaya **MyWallet** ([wallet-custodial](https://github.com/welldan23/wallet-custodial)): header dengan menu pil dan kartu bersudut bulat, tapi pakai **tema gelap nuansa kopi**: coklat tua dengan aksen karamel.

Frontend ini ngambil data dari **[wajik-anime-api](https://github.com/wajik45/wajik-anime-api)** (sumber: **Kuramanime**). Animeku nggak nyimpen atau nge-host video apa pun.

> Versi lama yang pakai sumber Otakudesu masih ada di branch [`versi-otakudesu`](https://github.com/welldan23/web-web-stream-anime/tree/versi-otakudesu).

## Fitur

- **Beranda**: kartu *Lanjut Nonton*, pintasan (Ongoing, Tamat, Film, Genre), fakta anime, rilis hari ini, episode terbaru, baru tamat & film
- **Jadwal rilis** per hari (otomatis kebuka di hari ini)
- **Sedang Tayang / Sudah Tamat** dengan halaman (pagination)
- **Genre**, **Film**, dan **Semua Anime** (urut Populer, Paling ditonton, Terbaru, A–Z)
- **Pencarian** anime, plus **Cari Pakai Gambar**: upload/tempel screenshot → ketahuan judul, episode & menit adegannya lewat [trace.moe](https://trace.moe), terus langsung dicocokin ke Animeku biar bisa ditonton (`src/lib/tracemoe.ts`)
- **Detail anime**: info lengkap, sinopsis, daftar episode (bisa diurutkan & dicari), tanda episode yang udah ditonton, rekomendasi
- **Data tambahan dari [AniList](https://anilist.co)** di halaman detail: banner HD, skor/popularitas/favorit, hitung mundur episode berikutnya, trailer YouTube, karakter + seiyuu, dan link ke AniList/MyAnimeList. Judul dicocokin otomatis ke AniList (`src/lib/anilist.ts`); kalau nggak yakin cocok, bagian ini disembunyiin aja
- **Halaman nonton tanpa iklan**: Kuramanime ngasih link video langsung (`kuramadrive`) per kualitas, jadi semua episode diputar pakai **player Animeku sendiri** (`src/components/DirectPlayer.tsx`), tanpa iframe, iklan, atau pop-up. Bisa ganti kualitas tanpa balik ke awal, lanjut dari menit terakhir, kualitas pilihan diingat, plus episode sebelumnya/berikutnya & link download
- **Fakta anime**: "Fakta Anime Hari Ini" di beranda & "Tahukah kamu?" di halaman detail (One Piece, Naruto, Demon Slayer, AoT, JJK, HxH, Dragon Ball, dll). Data dari [AnimeFacts](https://github.com/chandan-02/anime-facts-rest-api) (MIT), diterjemahin & disaring, disimpan di `src/data/animeFacts.ts` karena server API aslinya udah mati
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

> Kalau datanya kosong / error 403, kemungkinan domain sumbernya ganti. Update URL-nya di `src/configs/kuramanime.config.ts` (di repo API).

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

### Tes SEO di localhost (nggak perlu Vercel)

Fungsi suntik meta tag juga jalan di `npm run dev` dan `npm run preview`, jadi bisa dicek di laptop:

```sh
# pastikan wajik-anime-api jalan di http://localhost:3001, lalu:
npm run dev

# lihat HTML mentah kayak bot WhatsApp/Google lihat (tanpa JavaScript)
curl -s http://localhost:5173/anime/123/judul-anime | grep -E "<title|og:"   # ganti 123/judul-anime pakai alamat anime asli
```

Di browser: buka halaman mana aja → tab browser nunjukin judulnya, atau klik kanan → **Inspect** → lihat bagian `<head>`.

Buat ngecek status **404** beneran, sitemap, dan robots.txt, pakai mode produksi:

```sh
VITE_SITE_URL=http://localhost:4173 npm run build
npm run preview
curl -I http://localhost:4173/anime/99999/judul-ngawur   # HTTP/1.1 404
curl http://localhost:4173/sitemap.xml
```

> Preview link WhatsApp/Facebook **nggak bisa** dites di localhost, karena server mereka nggak bisa ngakses laptop kamu. Kalau mau nyoba sebelum deploy, buka sementara ke internet pakai tunnel, misalnya `npx cloudflared tunnel --url http://localhost:4173`, terus tempel link-nya ke [opengraph.xyz](https://www.opengraph.xyz).

Setelah online, daftarin web kamu di **Google Search Console** terus kirim `https://web-kamu/sitemap.xml` biar cepat diindeks.

## Struktur Folder

```
src/
├── components/   # Layout (header + menu pil + nav HP), SearchBox, Seo, komponen UI (kartu, pil, skeleton…)
├── lib/          # api.ts (client API), library.ts (koleksi & riwayat), site.ts (data SEO), helper lain
└── pages/        # Beranda, Detail, Nonton, Jelajah (ongoing/tamat/film/semua/genre/jadwal/cari), Cari Gambar, Koleksi & Riwayat
api/meta.ts       # fungsi Vercel: suntik meta tag SEO ke halaman anime & episode
seo/render.ts     # logika suntik meta tag (dipakai Vercel & localhost)
seo/              # plugin Vite: sitemap.xml, robots.txt, preconnect, meta tag di dev/preview
```

## Catatan

Project ini buat belajar. Konten video berasal dari situs pihak ketiga lewat wajik-anime-api, jadi hak ciptanya tetap milik pemiliknya masing-masing.
