# Animeku 🎬

Web streaming anime subtitle Indonesia. Fiturnya ala **Tatakai** (player dengan pilihan server, koleksi, riwayat nonton), tampilannya ngikutin gaya **MyWallet** ([wallet-custodial](https://github.com/welldan23/wallet-custodial)): header dengan menu pil dan kartu bersudut bulat, tapi pakai **tema gelap nuansa kopi**: coklat tua dengan aksen karamel.

Frontend ini ngambil data dari **[wajik-anime-api](https://github.com/wajik45/wajik-anime-api)**: **data anime dari Otakudesu**, **video dari Oploverz** (server utama). Animeku nggak nyimpen atau nge-host video apa pun.

## Fitur

- **Beranda**: kartu *Lanjut Nonton*, pintasan (Ongoing, Tamat, Genre, A–Z), rilis hari ini, anime sedang tayang & baru tamat
- **Jadwal rilis** per hari (otomatis kebuka di hari ini)
- **Sedang Tayang / Sudah Tamat** dengan halaman (pagination)
- **Genre** dan **Daftar A–Z** (bisa disaring)
- **Pencarian** anime, plus **Cari Pakai Gambar**: upload/tempel screenshot → ketahuan judul, episode & menit adegannya lewat [trace.moe](https://trace.moe), terus langsung dicocokin ke otakudesu biar bisa ditonton (`src/lib/tracemoe.ts`)
- **Detail anime**: info lengkap, sinopsis, daftar episode (bisa diurutkan & dicari), tanda episode yang udah ditonton, rekomendasi
- **Data tambahan dari [AniList](https://anilist.co)** di halaman detail: banner HD, skor/popularitas/favorit, hitung mundur episode berikutnya, trailer YouTube, karakter + seiyuu, dan link ke AniList/MyAnimeList. Judul otakudesu dicocokin otomatis ke AniList (`src/lib/anilist.ts`); kalau nggak yakin cocok, bagian ini disembunyiin aja
- **Server video**: tiap episode otomatis dicariin di **Oploverz** dan diputar dari situ (server utama, `src/lib/oploverz.ts`). Kalau episodenya belum ada di Oploverz, otomatis pakai server Otakudesu yang lancar (Vidhide), terus player bawaan kalau masih gagal
- **Halaman nonton**: pilihan server (Utama Oploverz / Cadangan Otakudesu / Server lain), pilihan diingat buat episode selanjutnya, tombol **blokir pop-up iklan** (pakai `sandbox` di iframe; otomatis dilewati buat Vidhide yang nolak di-sandbox), link **buka di tab baru**, episode sebelumnya/berikutnya, dan daftar episode
- **Fakta anime**: "Fakta Anime Hari Ini" di beranda & "Tahukah kamu?" di halaman detail (One Piece, Naruto, Demon Slayer, AoT, JJK, HxH, Dragon Ball, dll). Data dari [AnimeFacts](https://github.com/chandan-02/anime-facts-rest-api) (MIT), diterjemahin & disaring, disimpan di `src/data/animeFacts.ts` karena server API aslinya udah mati
- **Data dari situs lain** (lewat server Animeku, `server/meta.ts`):
  - Link ke database anime lain di halaman detail. Sumbernya [AnimeAPI](https://animeapi.my.id), termasuk database Indonesia OtakOtaku dan SilverYasha.
  - **Info tiap episode** di halaman nonton: judul, sinopsis, gambar, plus tanda **Filler/Recap** (juga muncul di daftar episode halaman detail). Datanya digabung dari beberapa sumber gratis tanpa daftar:
    - judul + tanda filler/recap dari MyAnimeList lewat [Jikan](https://jikan.moe)
    - gambar dari AniList (Crunchyroll dkk), kalau nggak ada dari [Kitsu](https://kitsu.app)
    - sinopsis dari Kitsu
  - Kalau `TMDB_API_KEY` diisi, [TMDB](https://www.themoviedb.org) dipakai duluan karena ada bahasa Indonesianya. Datanya nggak dipakai kalau jumlah episode di TMDB nggak cocok sama AniList (misalnya dua cour digabung), biar nomor episodenya nggak meleset.
- **Koleksi** (watchlist) dan **Riwayat** — disimpan di browser (localStorage), nggak perlu login
- **Dashboard admin** (`/admin`, pakai password): statistik pengunjung, episode ditonton, pencarian, pengguna aplikasi & download APK, grafik per hari, anime & kata kunci terpopuler (lihat "Jalanin di VPS")
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

### Jalanin di VPS (+ dashboard admin)

Di VPS, pakai server bawaan Animeku (`server/index.ts`) sebagai pengganti `vite preview`. Server ini:

- nampilin web,
- nerusin `/api` ke wajik,
- nyatet statistik buat dashboard `/admin`.

```sh
git pull
npm ci
npm run build && npm run build:server
```

Bikin file `.env` di folder project:

```sh
PORT=4173                                  # sama kayak vite preview, jadi Caddy nggak perlu diubah
API_PROXY_TARGET=http://localhost:3001     # alamat wajik
VITE_SITE_URL=https://srv1977175.hstgr.cloud
ADMIN_PASSWORD=ganti-pakai-password-panjang
TMDB_API_KEY=                              # opsional: info episode bahasa Indonesia dari TMDB
```

`TMDB_API_KEY` itu gratis. Caranya: daftar di [themoviedb.org](https://www.themoviedb.org), masuk ke **Settings → API**, terus bikin key tipe *Developer*. Bisa pakai "API Key" yang pendek atau "Read Access Token" yang panjang. Kalau dikosongin, info episode tetap muncul dari MyAnimeList, AniList, dan Kitsu, cuma pakai bahasa Inggris.

Matiin `vite preview` yang lama, terus jalanin server barunya pakai pm2 biar tetap nyala walau terminal ditutup:

```sh
npm i -g pm2
pm2 start npm --name animeku -- start
pm2 save && pm2 startup      # biar otomatis nyala lagi kalau VPS restart
```

Tiap kali update manual: `git pull && npm ci && npm run build && npm run build:server && pm2 restart animeku`.

#### Deploy otomatis (GitHub Actions)

Biar nggak perlu update manual, `.github/workflows/deploy.yml` bisa SSH ke VPS tiap ada push ke `master`, terus jalanin `git pull` dan [`scripts/deploy.sh`](scripts/deploy.sh). Skrip itu ngelakuin install, build, restart pm2, terus ngecek servernya nyala. Pasangnya cukup sekali:

1. Di VPS, masuk ke folder project, terus pasang "satpam" dan kunci khusus deploy. Satpam ini bikin kunci itu **cuma boleh** ngejalanin `status`, `logs`, `check-sources`, `restart`, dan `deploy`. Kunci itu nggak bisa buka terminal, nggak bisa ngejalanin perintah lain, dan nggak bisa jadi jembatan ke tempat lain:
   ```sh
   git pull
   install -m 755 scripts/ssh-gate.sh /usr/local/bin/animeku-ssh-gate      # kalau bukan root: pakai sudo
   ssh-keygen -t ed25519 -f ~/.ssh/animeku_deploy -N "" -C "github-deploy-animeku"
   echo "command=\"/usr/local/bin/animeku-ssh-gate $(pwd)\",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty $(cat ~/.ssh/animeku_deploy.pub)" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ssh -i ~/.ssh/animeku_deploy -o StrictHostKeyChecking=accept-new localhost status   # tes: harus keluar status server
   ssh -i ~/.ssh/animeku_deploy localhost "ls /"                                      # tes: harus "Ditolak"
   ```
   Satpamnya sengaja dipasang di luar folder project, biar nggak bisa diganti lewat `git pull`.
2. Masih di VPS, ambil data buat GitHub:
   ```sh
   whoami                                 # → VPS_USER
   cat ~/.ssh/animeku_deploy              # kunci privat → VPS_SSH_KEY
   ssh-keyscan -p 22 IP_VPS_KAMU 2>/dev/null   # ganti IP_VPS_KAMU, hasilnya → VPS_KNOWN_HOSTS
   pwd                                    # → VPS_APP_DIR
   ```
3. Di GitHub: **Settings → Secrets and variables → Actions → New repository secret**, isi:

   | Secret | Isi |
   |---|---|
   | `VPS_HOST` | IP VPS, mis. `145.79.11.57` |
   | `VPS_USER` | user SSH, mis. `root` |
   | `VPS_SSH_KEY` | seluruh isi `~/.ssh/animeku_deploy` (dari `-----BEGIN` sampai `-----END ...-----`) |
   | `VPS_KNOWN_HOSTS` | hasil perintah `ssh-keyscan` di atas |
   | `VPS_APP_DIR` | folder project di VPS, mis. `/root/web-web-stream-anime` |
   | `VPS_PORT` | (opsional) kalau port SSH bukan 22 |

4. Coba jalanin: tab **Actions → Deploy VPS → Run workflow**. Kalau hijau, berarti udah otomatis.

Selama secret-nya belum diisi, workflow ini dilewatin aja, jadi nggak bikin error.

Pakai secret yang sama, ada juga workflow **VPS tools** (`.github/workflows/vps.yml` + [`scripts/vps-tools.sh`](scripts/vps-tools.sh)) buat ngecek VPS dari GitHub tanpa SSH manual. Buka **Actions → VPS tools → Run workflow**, terus pilih aksinya:

- `status`: kondisi server, pm2, versi kode, cek Animeku & wajik
- `logs`: log pm2
- `check-sources`: cek VPS bisa nyambung ke Jikan, Kitsu, AniList, dll (IPv4 & IPv6)
- `restart`: restart Animeku
- `deploy`: update + build + restart

Mau berhenti? Hapus baris `github-deploy-animeku` dari `~/.ssh/authorized_keys` di VPS (akses langsung putus), atau hapus secret `VPS_SSH_KEY`. Aktifin juga **2FA di akun GitHub**, karena siapa pun yang bisa ngubah repo ini bisa nyuruh deploy. File `.env` di VPS nggak ikut ke-update atau ketimpa.

**Dashboard admin** ada di `https://web-kamu/admin`. Masuknya pakai `ADMIN_PASSWORD`. Isinya:

- jumlah pengunjung, halaman dibuka, episode ditonton, pencarian, pengguna aplikasi Android, dan download APK, dibandingin sama periode sebelumnya,
- grafik per hari (7 atau 30 hari),
- anime paling banyak ditonton, kata yang paling sering dicari, dan pencarian yang nggak ketemu hasilnya.

Catatan:

- **Statistiknya anonim.** IP pengunjung nggak disimpan. Pengunjung dihitung pakai kode acak yang ganti tiap hari, jadi nggak bisa dilacak.
- Datanya disimpan di `data/stats.json` dan disimpan 120 hari. Jangan dihapus kalau nggak mau statistiknya ilang.
- Angka download APK diambil dari GitHub. Angkanya mulai dari nol lagi tiap ada build APK baru, karena rilisnya dibikin ulang.
- Dashboard nggak jalan di Vercel, karena Vercel nggak punya tempat nyimpen file permanen. Pakai VPS.

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
curl -s http://localhost:5173/anime/one-piece-sub-indo | grep -E "<title|og:"
```

Di browser: buka halaman mana aja → tab browser nunjukin judulnya, atau klik kanan → **Inspect** → lihat bagian `<head>`.

Buat ngecek status **404** beneran, sitemap, dan robots.txt, pakai mode produksi:

```sh
VITE_SITE_URL=http://localhost:4173 npm run build
npm run preview
curl -I http://localhost:4173/anime/judul-ngawur      # HTTP/1.1 404
curl http://localhost:4173/sitemap.xml
```

> Preview link WhatsApp/Facebook **nggak bisa** dites di localhost, karena server mereka nggak bisa ngakses laptop kamu. Kalau mau nyoba sebelum deploy, buka sementara ke internet pakai tunnel, misalnya `npx cloudflared tunnel --url http://localhost:4173`, terus tempel link-nya ke [opengraph.xyz](https://www.opengraph.xyz).

Setelah online, daftarin web kamu di **Google Search Console** terus kirim `https://web-kamu/sitemap.xml` biar cepat diindeks.

## Aplikasi Android (APK)

Animeku juga bisa dipasang di HP Android sebagai aplikasi. Isinya web yang sama, dibungkus pakai [Capacitor](https://capacitorjs.com). APK-nya dibuat otomatis oleh **GitHub Actions** tiap ada push ke `master`, jadi kamu nggak perlu install Android Studio.

**Cara pasang:**

1. Buka halaman **Releases** repo ini, cari rilis **apk-latest**, terus download `animeku.apk`. File yang sama juga ada di tab **Actions** (bagian Artifacts).
2. Buka file-nya di HP. Kalau muncul peringatan, izinkan **"Install dari sumber tidak dikenal"**.
3. Selesai. Ikon Animeku bakal muncul di menu HP.

Beberapa hal yang perlu kamu tahu:

- **Nggak ada di Play Store.** APK ini dipasang manual (sideload), jadi wajar kalau Play Protect ngasih peringatan.
- **Data diambil dari server wajik-anime-api kamu.** Defaultnya `https://srv1977175.hstgr.cloud/api`. Kalau mau ganti, isi variable `ANIMEKU_API_URL` (dan `ANIMEKU_SITE_URL`) di **Settings → Secrets and variables → Actions → Variables**. Server-nya harus **HTTPS**.
- **Update tanpa uninstall:** APK ini ditandatangani pakai kunci debug yang dibuat acak tiap build. Akibatnya, versi baru bisa ditolak kalau dipasang di atas versi lama ("aplikasi tidak terpasang"). Biar kuncinya selalu sama, bikin sekali:
  ```bash
  keytool -genkey -v -keystore debug.keystore -storepass android -alias androiddebugkey \
    -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
  base64 -w0 debug.keystore   # salin hasilnya
  ```
  Terus simpan hasilnya sebagai secret `ANDROID_DEBUG_KEYSTORE`. Setelah itu, uninstall versi lama sekali aja. Build-build selanjutnya bisa langsung ditimpa.
- Kalau mau build sendiri di laptop yang ada Android Studio-nya: `npm run android:sync`, terus buka folder `android/`. Folder itu dibuat dulu pakai `npx cap add android`, dan `native/android/MainActivity.java` disalin ke dalamnya.

## Struktur Folder

```
src/
├── components/   # Layout (header + menu pil + nav HP), SearchBox, Seo, komponen UI (kartu, pil, skeleton…)
├── lib/          # api.ts (client API), library.ts (koleksi & riwayat), site.ts (data SEO), helper lain
└── pages/        # Beranda, Detail, Nonton, Jelajah (ongoing/tamat/genre/jadwal/A–Z/cari), Koleksi & Riwayat
api/meta.ts       # fungsi Vercel: suntik meta tag SEO ke halaman anime & episode
seo/render.ts     # logika suntik meta tag (dipakai Vercel & localhost)
seo/              # plugin Vite: sitemap.xml, robots.txt, preconnect, meta tag di dev/preview
server/           # server produksi buat VPS: statistik, dashboard admin, metadata (AnimeAPI/TMDB)
capacitor.config.ts, assets/, native/   # aplikasi Android: config, ikon & splash, MainActivity
.github/workflows/android.yml           # build APK otomatis
.github/workflows/deploy.yml, scripts/deploy.sh   # deploy otomatis ke VPS
.github/workflows/vps.yml, scripts/vps-tools.sh   # cek/perawatan VPS lewat GitHub
scripts/ssh-gate.sh                               # satpam kunci deploy (cuma aksi yang diizinin)
```

## Catatan

Project ini buat belajar. Konten video berasal dari situs pihak ketiga lewat wajik-anime-api, jadi hak ciptanya tetap milik pemiliknya masing-masing.
