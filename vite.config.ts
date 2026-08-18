import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react-markdown', 'remark-gfm'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/__tests__/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/hooks/**/*.ts',
        'src/components/map/**/*.tsx',
        'src/components/location/**/*.tsx',
        'src/services/locationService.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
      },
    },
  },
})
