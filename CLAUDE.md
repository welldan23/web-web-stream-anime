# Animeku — catatan buat sesi Claude

Web streaming anime (React + Vite + Tailwind), data dari wajik-anime-api (Otakudesu),
server utama video Oploverz. Penjelasan lengkap ada di README.md.

- Jawab pemilik repo pakai bahasa Indonesia santai & sederhana.
- Cek sebelum commit: `npx tsc -b && npx oxlint && npm run build && npm run build:server`.
- Push ke `master` = build APK otomatis (`.github/workflows/android.yml`).

## VPS produksi

- Web: https://srv1977175.hstgr.cloud → container Docker (`node dist-server/index.js`, folder `/app`, port 4173).
- wajik-anime-api di container lain: `http://wajik-anime-api:3001`.
- **Update otomatis:** tiap push ke `master`, container di-build ulang sendiri ±5 menit kemudian
  (env `SOURCE_COMMIT` = commit yang jalan). Nggak perlu deploy manual; cek lewat panel `status`.
- Diurus pemilik pakai Codex di VPS. SSH dari sesi cloud **nggak bisa** (proxy cuma HTTPS).

### Panel ops (server/ops.ts)

Kalau env `OPS_TOKEN` ada di sesi ini, VPS bisa dicek & dirawat lewat HTTPS:

```sh
B=https://srv1977175.hstgr.cloud/_animeku/ops
curl -sS -H "Authorization: Bearer $OPS_TOKEN" $B/status          # server, pm2, versi kode, cek Animeku & wajik
curl -sS -H "Authorization: Bearer $OPS_TOKEN" $B/logs            # log pm2
curl -sS -H "Authorization: Bearer $OPS_TOKEN" $B/check-sources   # VPS → Jikan/Kitsu/AniList/dll (IPv4 & IPv6)
```

`restart`/`deploy` di panel cuma buat server non-Docker (pm2); di VPS ini balikin 501.
Jangan pernah nampilin isi `OPS_TOKEN`. Setelah push, tunggu sampai `status` nunjukin
`Versi kode (build)` = commit baru, lalu cek hasilnya di web. Info episode bisa dicek di `/_animeku/meta/episodes/<anilistId>` (lihat field `failed`).

## Hal yang udah diketahui

- Jikan (api.jikan.moe) nolak/timeout dari IP server (VPS & sesi cloud); filler/recap diambil dari browser (`src/lib/useEpisodeInfo.ts`).
- Judul episode Otakudesu kadang cuma angka ("1180") dan ada entri pemisah `pembatas-episode-...` (lihat `src/lib/episodes.ts`).
