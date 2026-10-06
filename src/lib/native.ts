// Penyesuaian kalau Animeku jalan sebagai aplikasi Android (Capacitor).
// Di browser biasa, semua ini dilewatin.
import { Capacitor } from '@capacitor/core'

export async function initNative() {
  if (!Capacitor.isNativePlatform()) return
  const [{ App }, { StatusBar, Style }] = await Promise.all([import('@capacitor/app'), import('@capacitor/status-bar')])

  // status bar ikut warna header coklat, teks/ikon terang
  StatusBar.setBackgroundColor({ color: '#2a1e17' }).catch(() => {})
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {})

  // tombol back Android: balik ke halaman sebelumnya, keluar aplikasi kalau udah di awal
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back()
    else App.exitApp()
  })
}
