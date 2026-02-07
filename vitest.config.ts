import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/**', 'components/**', 'app/api/**'],
      exclude: ['**/*.d.ts', 'node_modules'],
    },
  },
})
