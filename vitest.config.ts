import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup/setupTests.ts'],
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    exclude: ['node_modules/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 85,
        functions: 80,
        branches: 75
      }
    }
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') }
  }
});
