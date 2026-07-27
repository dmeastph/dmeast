import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Disable Rolldown's incremental cache so Vercel always gets a fresh bundle
    rolldownOptions: {
      cache: false,
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
})
