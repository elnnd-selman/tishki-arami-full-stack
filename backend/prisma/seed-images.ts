/**
 * Seed image provider.
 *
 * Pulls real, theme-relevant photographs from Unsplash's public JSON search
 * endpoint, downloads them once into a local cache (prisma/.seed-cache) and
 * hands the raw buffers to the normal image pipeline. Caching makes re-running
 * the seed fast and keeps it working even if the network is briefly down.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const CACHE_DIR = path.resolve(process.cwd(), 'prisma/.seed-cache');

// Resolved URL pool per search query (fetched lazily, once).
const pools = new Map<string, string[]>();
// Per-query cursor so each call hands back the next distinct photo.
const cursors = new Map<string, number>();

function keyOf(query: string): string {
  return query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function loadPool(query: string): Promise<string[]> {
  const cached = pools.get(query);
  if (cached) return cached;

  let urls: string[] = [];
  try {
    const api = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(
      query,
    )}&per_page=30&orientation=landscape`;
    const res = await fetch(api, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const json = (await res.json()) as { results?: Array<{ urls?: { raw?: string } }> };
      urls = (json.results ?? [])
        .map((r) => r.urls?.raw)
        .filter((u): u is string => typeof u === 'string' && u.startsWith('https://images.unsplash.com/photo-'))
        .map((u) => u.split('?')[0] as string);
    }
  } catch {
    // fall through — pool stays empty, callers handle null gracefully
  }

  pools.set(query, urls);
  return urls;
}

async function download(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Returns the next distinct photo buffer for a search query, or null if no
 * image could be obtained. Buffers are cached on disk keyed by query+index.
 */
export async function nextImage(query: string): Promise<Buffer | null> {
  const idx = cursors.get(query) ?? 0;
  cursors.set(query, idx + 1);

  const cacheFile = path.join(CACHE_DIR, `${keyOf(query)}-${idx}.jpg`);
  try {
    return await fs.readFile(cacheFile);
  } catch {
    // not cached yet
  }

  const pool = await loadPool(query);
  if (pool.length === 0) return null;

  const base = pool[idx % pool.length];
  const sized = `${base}?w=1400&h=1050&fit=crop&crop=entropy&q=80&auto=format`;
  const buf = await download(sized);
  if (!buf) return null;

  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(cacheFile, buf);
  return buf;
}
