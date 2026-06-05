import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => ({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'Logo.png', 'icons.svg'],
      manifest: {
        name: 'Vocabulary Learning',
        short_name: 'Vocab',
        description: 'Independent Vocabulary Learning with Offline Sync',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'Logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'Logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // Cache vocabulary JSON files
        runtimeCaching: [
          {
            urlPattern: /^.*\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'vocabulary-json-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    })
  ],

  // 本地 npm run dev 用 /
  // 打包 npm run build 用 /static/
  base: command === 'serve' ? '/' : '/static/',

  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}))