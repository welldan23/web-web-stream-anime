import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import AnimePage from './pages/AnimePage'
import WatchPage from './pages/WatchPage'
import {
  AzPage,
  CompletedPage,
  GenrePage,
  GenresPage,
  OngoingPage,
  SchedulePage,
  SearchPage,
} from './pages/BrowsePages'
import { HistoryPage, NotFoundPage, WatchlistPage } from './pages/LibraryPages'

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
        <Route path="anime/:animeId" element={<AnimePage />} />
        <Route path="nonton/:episodeId" element={<WatchPage />} />
        <Route path="koleksi" element={<WatchlistPage />} />
        <Route path="riwayat" element={<HistoryPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
