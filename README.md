# Animeku 🎬

Web streaming anime subtitle Indonesia. Fiturnya ala **Tatakai** (player dengan pilihan server, koleksi, riwayat nonton), tampilannya ngikutin gaya **MyWallet** ([wallet-custodial](https://github.com/welldan23/wallet-custodial)): header teal dengan menu pil, kartu putih bersudut bulat, aksen biru, dan otomatis ikut mode gelap/terang HP.

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

Kalau di-deploy (misal ke Vercel), API-nya juga harus di-deploy terpisah, lalu isi `VITE_API_URL` dengan URL API tersebut (contoh: `https://wajik-anime-api-kamu.vercel.app`). `vercel.json` udah disiapin biar routing halaman (misal `/anime/...`) nggak 404.

## Struktur Folder

```
src/
├── components/   # Layout (sidebar, topbar, nav HP), SearchBox, komponen UI (kartu, badge, skeleton…)
├── lib/          # api.ts (client API), library.ts (koleksi & riwayat), helper episode & hari
└── pages/        # Beranda, Detail, Nonton, Jelajah (ongoing/tamat/genre/jadwal/A–Z/cari), Koleksi & Riwayat
```

## Catatan

Project ini buat belajar. Konten video berasal dari situs pihak ketiga lewat wajik-anime-api, jadi hak ciptanya tetap milik pemiliknya masing-masing.
