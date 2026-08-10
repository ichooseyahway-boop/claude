import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // PRD 18.5: high-risk functions must carry unit and integration tests.
      // These thresholds guard the pure domain core, which is where the
      // scoring, entitlement and security decisions live.
      include: ['src/domain/**/*.ts', 'src/lib/security/**/*.ts'],
      exclude: ['**/*.test.ts', '**/index.ts'],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
