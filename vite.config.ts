import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // The PDF engine (@react-pdf/renderer, ~1.4 MB) is irreducibly large but
    // lives in its own vendor chunk and is only fetched when the lazy-loaded
    // cookbook editor opens — so it never weighs on first paint. Lift the limit
    // just above it so this expected chunk doesn't trip the warning, while real
    // regressions in app chunks still do.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/@tanstack/')) {
            return 'vendor-query';
          }
          if (id.includes('node_modules/@react-pdf/')) {
            return 'vendor-pdf';
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
