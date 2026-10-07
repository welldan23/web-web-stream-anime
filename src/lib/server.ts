// Alamat API server Animeku (server/index.ts): statistik, dashboard admin, metadata.
// Di aplikasi Android web-nya dibuka dari https://localhost, jadi alamat server
// diambil dari VITE_API_URL (mis. https://domain/api → https://domain/_animeku).
const API_URL = import.meta.env.VITE_API_URL || '/api'

export const SERVER_URL = (
  import.meta.env.VITE_STATS_URL || `${/^https?:\/\//.test(API_URL) ? new URL(API_URL).origin : ''}/_animeku`
).replace(/\/+$/, '')
