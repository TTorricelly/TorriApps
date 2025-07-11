import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/manifest-icon-192.maskable.png', 'icons/manifest-icon-512.maskable.png', 'icons/apple-icon-180.png'],
      injectRegister: 'auto',
      strategies: 'generateSW',
      devOptions: {
        enabled: false
      },
      selfDestroying: false,
      manifest: {
        name: 'TorriApps - Salon Booking',
        short_name: 'TorriApps',
        description: 'Book appointments with your favorite salon',
        theme_color: '#ec4899',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        id: '/',
        categories: ['lifestyle', 'business'],
        lang: 'pt-BR',
        icons: [
          {
            src: '/icons/manifest-icon-192.maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/manifest-icon-192.maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/manifest-icon-512.maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/manifest-icon-512.maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        disableDevLogs: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/torri-backend-.*\.run\.app\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/storage\.googleapis\.com\/torri-apps-uploads\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    host: true, // Expose to network
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        configure: (_proxy, options) => {
          console.log('🔗 API Proxy configured - target:', options.target);
        }
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        configure: (_proxy, options) => {
          console.log('🔗 Uploads proxy configured - target:', options.target);
        }
      },
      '/static': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      },
      '/media': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      },
      '/files': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  define: {
    // Make environment variables available to the app
    __DEV__: JSON.stringify(process?.env?.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process?.env?.NODE_ENV === 'production')
  },
  envDir: '.',
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})