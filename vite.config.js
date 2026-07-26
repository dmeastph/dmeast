import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Force Rolldown to recompute module hashes on each build (bust Vercel build cache)
  define: {
    '__VITE_CACHE_BUST__': JSON.stringify('v2'),
  },
  test: {
    environment: 'node',
    globals: true,
  },
})
