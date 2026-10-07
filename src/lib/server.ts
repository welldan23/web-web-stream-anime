// Alamat API server Animeku (server/index.ts): statistik, dashboard admin, metadata.
// Di web, server-nya selalu sama dengan yang nyajiin halaman, jadi cukup alamat relatif
// (VITE_API_URL bisa aja nunjuk langsung ke wajik, yang nggak punya /_animeku).
// Di aplikasi Android web-nya dibuka dari https://localhost, jadi alamat server
// diambil dari VITE_API_URL (mis. https://domain/api → https://domain/_animeku).
import { Capacitor } from '@capacitor/core'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const appOrigin = Capacitor.isNativePlatform() && /^https?:\/\//.test(API_URL) ? new URL(API_URL).origin : ''

export const SERVER_URL = (import.meta.env.VITE_STATS_URL || `${appOrigin}/_animeku`).replace(/\/+$/, '')
