import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

// Single shared Prisma client. In dev we attach it to globalThis so tsx hot
// reloads don't open a new pool on every change.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isTest ? ['warn', 'error'] : ['warn', 'error'],
  });

if (!env.isProd) {
  globalForPrisma.prisma = prisma;
}
