#!/usr/bin/env bash
# Pasang panel ops (server/ops.ts) sekali jalan di VPS:
#   1. bikin OPS_TOKEN acak & simpan ke .env (kalau belum ada)
#   2. update + build + restart Animeku (scripts/deploy.sh)
#   3. ngetes panelnya, terus nampilin token buat disalin ke pengaturan lingkungan Claude Code
#
# Jalanin dari folder project di VPS:  git pull && bash scripts/setup-ops.sh
set -euo pipefail

cd "$(dirname "$0")/.."
touch .env
chmod 600 .env

token="$(grep -E '^OPS_TOKEN=' .env | tail -1 | cut -d= -f2- | tr -d '[:space:]' || true)"
if [ "${#token}" -ge 32 ]; then
  echo "==> OPS_TOKEN udah ada di .env, dipakai yang lama."
else
  token="$(openssl rand -hex 32)"
  sed -i '/^OPS_TOKEN=/d' .env
  [ -z "$(tail -c1 .env)" ] || echo >> .env
  echo "OPS_TOKEN=$token" >> .env
  echo "==> OPS_TOKEN baru dibikin & disimpan di .env"
fi

bash scripts/deploy.sh

port="$(grep -E '^PORT=' .env | cut -d= -f2 | tr -d '[:space:]' || true)"
port="${port:-4173}"
code="$(curl -sS -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $token" "http://127.0.0.1:${port}/_animeku/ops/status" || true)"
if [ "$code" != 200 ]; then
  echo "!! Panel ops belum nyahut (HTTP $code). Cek: pm2 logs animeku --lines 50" >&2
  exit 1
fi

cat <<EOT

==================================================================
 Panel ops aktif ✅

 Salin baris di bawah ke pengaturan lingkungan Claude Code
 (menu lingkungan → Edit → Variabel lingkungan), JANGAN ke chat:

   OPS_TOKEN=$token

 Habis itu buka sesi baru.
==================================================================
EOT
