import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'id.animeku.app',
  appName: 'Animeku',
  webDir: 'dist',
  backgroundColor: '#120e0b',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SystemBars: {
      // index.html udah pakai viewport-fit=cover, jarak status bar diatur lewat --safe-top
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      style: 'DARK',
    },
  },
}

export default config
