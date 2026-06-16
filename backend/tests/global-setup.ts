import { execSync } from 'node:child_process';

// Runs once before the whole suite: ensure the test database schema is up to date.
// We use the NON-destructive `migrate deploy` (applies migrations forward only) so
// nothing is ever dropped. Per-test isolation is handled by TRUNCATE in helpers.
export default async function setup() {
  process.env.NODE_ENV = 'test';
  const databaseUrl = 'postgresql://elnnd@localhost:5432/tishkiarami_test?schema=public';

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: databaseUrl },
  });
}
