#!/usr/bin/env bash
# "Satpam" buat kunci deploy GitHub: kunci itu CUMA boleh ngejalanin aksi di bawah,
# nggak bisa buka terminal atau ngejalanin perintah lain.
#
# Pasang sekali di VPS (lihat README "Deploy otomatis"):
#   sudo install -m 755 scripts/ssh-gate.sh /usr/local/bin/animeku-ssh-gate
# lalu di ~/.ssh/authorized_keys, kunci deploy-nya diawali:
#   command="/usr/local/bin/animeku-ssh-gate /folder/animeku",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty ssh-ed25519 AAAA... github-deploy-animeku
#
# Sengaja dipasang di luar folder project, biar nggak bisa diganti lewat `git pull`.
set -euo pipefail

app_dir="${1:?folder project belum diisi di authorized_keys}"
action="${SSH_ORIGINAL_COMMAND:-}"

case "$action" in
  status | logs | check-sources | restart) ;;
  deploy) ;;
  *)
    echo "Ditolak: aksi '$action' nggak diizinin. Pilihan: status, logs, check-sources, restart, deploy" >&2
    exit 1
    ;;
esac

cd "$app_dir"
if [ "$action" = deploy ]; then
  git pull --ff-only origin master
  exec bash scripts/deploy.sh
fi
exec bash scripts/vps-tools.sh "$action"
