import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '@api': new URL('./src/api', import.meta.url).pathname,
      '@components': new URL('./src/components', import.meta.url).pathname,
      '@hooks': new URL('./src/hooks', import.meta.url).pathname,
      '@pages': new URL('./src/pages', import.meta.url).pathname,
      '@stores': new URL('./src/stores', import.meta.url).pathname,
      '@styles': new URL('./src/styles', import.meta.url).pathname,
    }
  }
})
