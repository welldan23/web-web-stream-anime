# Animeku — catatan buat sesi Claude

Web streaming anime (React + Vite + Tailwind), data dari wajik-anime-api (Otakudesu),
server utama video Oploverz. Penjelasan lengkap ada di README.md.

- Jawab pemilik repo pakai bahasa Indonesia santai & sederhana.
- Cek sebelum commit: `npx tsc -b && npx oxlint && npm run build && npm run build:server`.
- Push ke `master` = build APK otomatis (`.github/workflows/android.yml`).

## VPS produksi

- Web: https://srv1977175.hstgr.cloud (Caddy → `npm start` = `dist-server/index.js` lewat pm2, nama `animeku`, port 4173).
- wajik-anime-api jalan di VPS yang sama (`http://localhost:3001`).
- SSH dari sesi cloud **nggak bisa** (proxy cuma ngeloloskan HTTPS), jadi pakai panel ops di bawah.

### Panel ops (server/ops.ts)

Kalau env `OPS_TOKEN` ada di sesi ini, VPS bisa dicek & dirawat lewat HTTPS:

```sh
B=https://srv1977175.hstgr.cloud/_animeku/ops
curl -sS -H "Authorization: Bearer $OPS_TOKEN" $B/status          # server, pm2, versi kode, cek Animeku & wajik
curl -sS -H "Authorization: Bearer $OPS_TOKEN" $B/logs            # log pm2
curl -sS -H "Authorization: Bearer $OPS_TOKEN" $B/check-sources   # VPS → Jikan/Kitsu/AniList/dll (IPv4 & IPv6)
curl -sS -X POST -H "Authorization: Bearer $OPS_TOKEN" $B/deploy  # git pull + build + restart → {"id": ...}
curl -sS -X POST -H "Authorization: Bearer $OPS_TOKEN" $B/restart
curl -sS -H "Authorization: Bearer $OPS_TOKEN" $B/jobs/<id>       # hasil deploy/restart (tunggu sampai ada "[selesai, kode keluar N]")
```

Jangan pernah nampilin isi `OPS_TOKEN`. Setelah push kode, deploy lewat panel ini lalu cek hasilnya
di web. Info episode bisa dicek di `/_animeku/meta/episodes/<anilistId>` (lihat field `failed`).

## Hal yang udah diketahui

- Jikan (api.jikan.moe) nolak/timeout dari IP server (VPS & sesi cloud); filler/recap diambil dari browser (`src/lib/useEpisodeInfo.ts`).
- Judul episode Otakudesu kadang cuma angka ("1180") dan ada entri pemisah `pembatas-episode-...` (lihat `src/lib/episodes.ts`).
