#!/usr/bin/env bash
# Jalanin restart/deploy di belakang buat panel ops (server/ops.ts), hasilnya ke file log.
# Dipanggil lepas dari proses server (setsid + nohup), soalnya pm2 restart ikut ngematiin server-nya.
# Pemakaian: bash scripts/ops-job.sh <restart|deploy> <file-log>
set -uo pipefail
action="$1"
log="$2"
cd "$(dirname "$0")/.."
{
  echo "==> $action mulai $(date '+%Y-%m-%d %H:%M:%S')"
  case "$action" in
    deploy) git pull --ff-only origin master && bash scripts/deploy.sh ;;
    restart) sleep 1 && bash scripts/vps-tools.sh restart ;;
    *) echo "Aksi nggak dikenal: $action"; false ;;
  esac
} >"$log" 2>&1
echo "[selesai, kode keluar $?]" >>"$log"
