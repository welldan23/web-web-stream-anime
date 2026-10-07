import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'

// Halaman selain beranda dimuat pas dibuka aja, biar JS awal lebih kecil & web lebih cepat
const AnimePage = lazy(() => import('./pages/AnimePage'))
const WatchPage = lazy(() => import('./pages/WatchPage'))
const ImageSearchPage = lazy(() => import('./pages/ImageSearchPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const browse = () => import('./pages/BrowsePages')
const library = () => import('./pages/LibraryPages')
const SchedulePage = lazy(() => browse().then((m) => ({ default: m.SchedulePage })))
const OngoingPage = lazy(() => browse().then((m) => ({ default: m.OngoingPage })))
const CompletedPage = lazy(() => browse().then((m) => ({ default: m.CompletedPage })))
const GenresPage = lazy(() => browse().then((m) => ({ default: m.GenresPage })))
const GenrePage = lazy(() => browse().then((m) => ({ default: m.GenrePage })))
const AzPage = lazy(() => browse().then((m) => ({ default: m.AzPage })))
const SearchPage = lazy(() => browse().then((m) => ({ default: m.SearchPage })))
const WatchlistPage = lazy(() => library().then((m) => ({ default: m.WatchlistPage })))
const HistoryPage = lazy(() => library().then((m) => ({ default: m.HistoryPage })))
const NotFoundPage = lazy(() => library().then((m) => ({ default: m.NotFoundPage })))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="jadwal" element={<SchedulePage />} />
        <Route path="ongoing" element={<OngoingPage />} />
        <Route path="tamat" element={<CompletedPage />} />
        <Route path="genre" element={<GenresPage />} />
        <Route path="genre/:genreId" element={<GenrePage />} />
        <Route path="daftar" element={<AzPage />} />
        <Route path="cari" element={<SearchPage />} />
        <Route path="cari-gambar" element={<ImageSearchPage />} />
        <Route path="anime/:animeId" element={<AnimePage />} />
        <Route path="nonton/:episodeId" element={<WatchPage />} />
        <Route path="koleksi" element={<WatchlistPage />} />
        <Route path="riwayat" element={<HistoryPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
