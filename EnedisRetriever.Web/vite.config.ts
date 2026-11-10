import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Same-origin /api in dev, like Nginx does in production: no CORS, no per-env URL.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
