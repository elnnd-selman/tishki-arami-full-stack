import dotenv from 'dotenv';

// Load .env.test when running under the test runner, otherwise the normal .env.
dotenv.config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
});

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  isTest: process.env.NODE_ENV === 'test',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(optional('PORT', '4000')),
  apiPrefix: optional('API_PREFIX', '/api/v1'),
  corsOrigin: optional('CORS_ORIGIN', 'http://localhost:5173'),
  databaseUrl: required('DATABASE_URL'),

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessExpires: optional('JWT_ACCESS_EXPIRES', '15m'),
    refreshExpires: optional('JWT_REFRESH_EXPIRES', '7d'),
  },

  upload: {
    dir: optional('UPLOAD_DIR', 'uploads'),
    maxSizeMb: Number(optional('MAX_UPLOAD_SIZE_MB', '8')),
    publicBaseUrl: optional('PUBLIC_BASE_URL', 'http://localhost:4000'),
  },
} as const;
