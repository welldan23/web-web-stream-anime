import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import seoPlugin from './seo/vite-plugin-seo.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:3001'
  // API yang bisa diakses dari server (buat sitemap & preconnect)
  const serverApi = env.API_URL || (/^https?:\/\//.test(env.VITE_API_URL ?? '') ? env.VITE_API_URL : undefined)

  return {
    plugins: [
      react(),
      tailwindcss(),
      seoPlugin({ siteUrl: env.VITE_SITE_URL, apiUrl: serverApi, localApiUrl: apiTarget }),
    ],
    server: {
      port: 5173,
      // Request ke /api/* diteruskan ke wajik-anime-api, jadi nggak kena masalah CORS
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
