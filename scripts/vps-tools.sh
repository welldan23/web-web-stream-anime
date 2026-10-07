#!/usr/bin/env bash
# Alat cek & perawatan VPS Animeku. Dijalanin lewat GitHub Actions (.github/workflows/vps.yml):
# isi file ini dikirim lewat SSH dan dijalanin di folder project, jadi nggak perlu `git pull` dulu.
# Bisa juga manual di VPS: `bash scripts/vps-tools.sh status`
set -uo pipefail

action="${1:-status}"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

port="$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || true)"
port="${port:-4173}"
wajik="$(grep -E '^API_PROXY_TARGET=' .env 2>/dev/null | cut -d= -f2- | tr -d '[:space:]' || true)"
wajik="${wajik:-http://localhost:3001}"

section() { printf '\n===== %s =====\n' "$1"; }
# code URL [TIMEOUT] [opsi curl lain...] -> "200 (0.3s)" atau pesan error curl
code() {
  local url="$1" timeout="${2:-15}"
  shift; [ $# -gt 0 ] && shift
  curl -sS -m "$timeout" -o /dev/null -w '%{http_code} (%{time_total}s)' "$@" "$url" 2>&1 | tr '\n' ' '
}

case "$action" in
  status)
    section "Server"
    uptime; df -h / | tail -1; free -m | sed -n 2p
    echo "Node $(node -v 2>/dev/null || echo '-'), pm2 $(pm2 -v 2>/dev/null || echo '-')"
    section "Kode"
    git log -1 --format='%h %s (%cr)'; git status --short | head -20
    section "pm2"
    pm2 ls
    section "Cek lokal"
    echo "Animeku  http://127.0.0.1:$port/            -> $(code "http://127.0.0.1:$port/")"
    echo "Wajik    $wajik/otakudesu/home -> $(code "$wajik/otakudesu/home" 20)"
    ;;
  logs)
    section "Log Animeku (100 baris terakhir)"
    pm2 logs animeku --lines 100 --nostream 2>&1 | tail -120
    for name in $(pm2 jlist 2>/dev/null | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | grep -v '^animeku$'); do
      section "Log $name (40 baris terakhir)"
      pm2 logs "$name" --lines 40 --nostream 2>&1 | tail -50
    done
    ;;
  check-sources)
    section "Sumber data dari VPS"
    for url in \
      https://api.jikan.moe/v4/anime/1 \
      https://kitsu.app/api/edge/anime/1 \
      https://graphql.anilist.co \
      https://animeapi.my.id/anilist/1 \
      https://otakudesu.blog/ \
      https://media.kitsu.app/ ; do
      printf '%-40s ipv4: %-22s ipv6: %s\n' "$url" "$(code "$url" 20 -4)" "$(code "$url" 20 -6)"
    done
    section "DNS"
    getent ahosts api.jikan.moe | head -4
    ;;
  restart)
    pm2 restart animeku --update-env && sleep 3 && pm2 ls
    echo "Animeku -> $(code "http://127.0.0.1:$port/")"
    ;;
  deploy)
    git pull --ff-only origin master && bash scripts/deploy.sh
    ;;
  *)
    echo "Aksi nggak dikenal: $action (pilihan: status, logs, check-sources, restart, deploy)" >&2
    exit 1
    ;;
esac
