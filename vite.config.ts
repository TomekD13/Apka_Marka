import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// dostęp do zmiennych środowiskowych w configu (bez dokładania @types/node do całego projektu)
declare const process: { env: Record<string, string | undefined> }

// base '/' = hosting w korzeniu (Netlify/Vercel/Cloudflare) i lokalny dev/preview.
// GitHub Pages serwuje z podkatalogu repo - build w CI ustawia VITE_BASE=/nazwa-repo/.
const base = process.env.VITE_BASE || '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Żywe Słowo - droga do domu Ojca',
        short_name: 'Żywe Słowo',
        description: 'Czytnik studiów biblijnych (offline). Bible study reader.',
        theme_color: '#1f4e79',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: base + 'index.html',
        // nie precache'ujemy treści (bywa duża) – cache'ujemy ją w runtime; „Pobierz offline” ją rozgrzewa
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        // tresc dociagamy w runtime; baner w wersji 2560 tylko wtedy, gdy ekran go potrzebuje
        globIgnores: ['**/content/**', '**/jestnadzieja-2560.png'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/content/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'content',
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      }
    })
  ]
})
