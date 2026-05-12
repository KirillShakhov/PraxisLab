import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'prompt',
      injectManifest: {
        globIgnores: ['compilers/**/*'],
        maximumFileSizeToCacheInBytes: 5242880
      },
      manifest: {
        name: 'Distributed V-Lab',
        short_name: 'V-Lab',
        description: 'Децентрализованная виртуальная лаборатория',
        theme_color: '#121212',
        background_color: '#121212',
        display: 'standalone',
        icons: [
          {
            src: '/vite.svg', // Используем пока дефолтную иконку Vite
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ]
})