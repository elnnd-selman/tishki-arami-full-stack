import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: { NODE_ENV: 'test' },
    globalSetup: ['./tests/global-setup.ts'],
    // DB-backed tests share one database, so run files serially to avoid races.
    fileParallelism: false,
    sequence: { concurrent: false },
    hookTimeout: 30000,
    testTimeout: 30000,
    include: ['tests/**/*.test.ts'],
  },
});
