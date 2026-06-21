import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

export const prisma = new PrismaClient({
  log: env.isTest ? ['warn', 'error'] : ['warn', 'error'],
});
