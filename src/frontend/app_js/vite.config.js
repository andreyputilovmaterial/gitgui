import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  server: {
    proxy: {
      '/command': {
        target: 'http://localhost:5180',
        changeOrigin: true
      },
      '/functionality': {
        target: 'http://localhost:5180',
        changeOrigin: true
      },
      '/assets': {
        target: 'http://localhost:5180',
        changeOrigin: true
      },
      '/files': {
        target: 'http://localhost:5180',
        changeOrigin: true
      },
    }
  },
  resolve: {
    alias: {
      vue: 'vue/dist/vue.esm-bundler.js',
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
