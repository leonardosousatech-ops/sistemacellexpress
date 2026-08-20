import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.png'],
      manifest: {
        name: 'Cell Express - Gestão',
        short_name: 'Gestão Loja',
        description: 'Sistema de Gestão Interna da Cell Express',
        theme_color: '#1a1d24',
        background_color: '#1a1d24',
        display: 'standalone',
        icons: [
          {
            src: '/icon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
