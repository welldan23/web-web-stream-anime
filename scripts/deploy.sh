#!/usr/bin/env bash
# Update Animeku di VPS: install, build web + server, restart pm2, lalu cek nyala.
# Dipanggil otomatis sama GitHub Actions (.github/workflows/deploy.yml) setelah `git pull`,
# tapi bisa juga dijalanin manual dari folder project: `bash scripts/deploy.sh`
set -euo pipefail

cd "$(dirname "$0")/.."

# SSH non-interaktif nggak baca .bashrc; kalau Node dipasang lewat nvm, muat manual
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
fi

echo "==> Commit: $(git log -1 --format='%h %s')"
echo "==> Node $(node -v), npm $(npm -v)"

npm ci --no-audit --no-fund
npm run build
npm run build:server

if pm2 describe animeku >/dev/null 2>&1; then
  pm2 restart animeku --update-env
else
  pm2 start npm --name animeku -- start
fi
pm2 save >/dev/null

# tunggu server nyala, maksimal ±30 detik
port="$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || true)"
port="${port:-4173}"
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null "http://127.0.0.1:${port}/"; then
    echo "==> Animeku nyala di port ${port}"
    exit 0
  fi
  sleep 1
done
echo "!! Animeku nggak nyala di port ${port}. Cek: pm2 logs animeku --lines 50" >&2
pm2 logs animeku --lines 30 --nostream || true
exit 1
