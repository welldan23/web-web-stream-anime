import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { ApiError } from './lib/api'
import './index.css'
import { initNative } from './lib/native'

// Hapus meta tag bawaan dari index.html; gantinya dirender komponen <Seo> per halaman
document.head.querySelectorAll('[data-seo]').forEach((el) => el.remove())

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      // 404 nggak usah diulang, error lain coba sekali lagi
      retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

initNative()
