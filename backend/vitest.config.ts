import os from 'node:os';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATA_DIR: path.join(os.tmpdir(), `potm-test-${process.pid}`),
      DB_FILE: ':memory:',
      APP_TIMEZONE: 'Europe/Berlin',
      RATE_LIMIT: 'false',
      STATIC_DIR: 'does-not-exist',
    },
  },
});
