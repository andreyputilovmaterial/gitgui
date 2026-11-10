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
    // This proxy forwards any HTTP method, but the Node.js HTTP server under
    // Vite rejects non-standard methods (SIZE, DOWNLOAD, …) with a 400 at the
    // parser layer before the proxy ever runs — so custom methods can't be used
    // from `npm run dev`. Keep frontend requests on standard methods (see
    // docs/dev-docs.md, "HTTP methods and the Vite dev server").
    proxy: {
      '/command': {
        target: 'http://localhost:5180',
        changeOrigin: true
      },
      '/textconv': {
        target: 'http://localhost:5180',
        changeOrigin: true
      },
      '/config': {
        target: 'http://localhost:5180',
        changeOrigin: true
      },
      '/health': {
        target: 'http://localhost:5180',
        changeOrigin: true
      },
      '/repo': {
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
      '/browse': {
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
