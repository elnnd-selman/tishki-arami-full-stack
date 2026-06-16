import slugify from 'slugify';
import type { PrismaClient } from '@prisma/client';

export function toSlug(input: string): string {
  return slugify(input, { lower: true, strict: true, trim: true });
}

// Ensures a unique slug for a given model/column by appending -2, -3, ... when taken.
// `excludeId` lets updates keep their own slug without colliding with themselves.
export async function uniqueSlug(
  prisma: PrismaClient,
  model: 'product' | 'category' | 'brand' | 'project' | 'service' | 'blog',
  base: string,
  excludeId?: string,
): Promise<string> {
  const root = toSlug(base) || 'item';
  let candidate = root;
  let n = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // @ts-expect-error - dynamic model access is intentional and safe here
    const existing = await prisma[model].findFirst({
      where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!existing) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}
