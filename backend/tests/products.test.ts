import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { toAbsolute } from '../src/services/image.service.js';
import {
  resetDb,
  resetCatalog,
  seedRbacAndUsers,
  login,
  auth,
  createCategory,
  createBrand,
  makeImageBuffer,
} from './helpers.js';

const API = '/api/v1';

let app: Express;
let adminToken: string;
let editorToken: string;
let viewerToken: string;
let categoryId: string;
let brandId: string;

beforeAll(async () => {
  app = createApp();
  await resetDb();
  await seedRbacAndUsers();
  adminToken = await login(app, 'admin');
  editorToken = await login(app, 'editor');
  viewerToken = await login(app, 'viewer');
});

beforeEach(async () => {
  await resetCatalog();
  const cat = await createCategory('Lighting');
  const brand = await createBrand('Philips');
  categoryId = cat.id;
  brandId = brand.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Helper to build a valid create payload.
function productPayload(overrides: Record<string, unknown> = {}) {
  return {
    categoryId,
    brandId,
    status: 'PUBLISHED',
    translations: {
      en: { name: 'LED Panel', shortDescription: 'A bright panel' },
      ar: { name: 'لوحة ليد', shortDescription: 'لوحة ساطعة' },
      ku: { name: 'پانێڵی لێد', shortDescription: 'پانێڵێکی ڕووناک' },
    },
    ...overrides,
  };
}

async function createProduct(token = adminToken, overrides = {}) {
  const res = await request(app)
    .post(`${API}/products`)
    .set(auth(token))
    .send(productPayload(overrides));
  expect(res.status).toBe(201);
  return res.body.data;
}

// ---------------------------------------------------------------------------
describe('Products - CRUD', () => {
  it('creates a product and stores it (with all translations) in the database', async () => {
    const product = await createProduct();
    expect(product.slug).toBe('led-panel');

    const inDb = await prisma.product.findUnique({
      where: { id: product.id },
      include: { translations: true },
    });
    expect(inDb).not.toBeNull();
    expect(inDb!.translations).toHaveLength(3);
    const locales = inDb!.translations.map((t) => t.locale).sort();
    expect(locales).toEqual(['AR', 'EN', 'KU']);
  });

  it('reads a single product with all data returned', async () => {
    const created = await createProduct();
    const res = await request(app).get(`${API}/products/${created.id}`).set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.translations.en.name).toBe('LED Panel');
    expect(res.body.data.translations.ar.name).toBe('لوحة ليد');
    expect(res.body.data.translations.ku.name).toBe('پانێڵی لێد');
    expect(res.body.data.category.translations.en.name).toBe('Lighting');
    expect(res.body.data.brand.translations.en.name).toBe('Philips');
  });

  it('returns 404 for a missing product', async () => {
    const res = await request(app).get(`${API}/products/nonexistent`).set(auth(adminToken));
    expect(res.status).toBe(404);
  });

  it('updates every editable field and persists the changes', async () => {
    const created = await createProduct();
    const res = await request(app)
      .put(`${API}/products/${created.id}`)
      .set(auth(adminToken))
      .send({
        sku: 'SKU-123',
        status: 'DRAFT',
        isFeatured: true,
        sortOrder: 5,
        translations: { en: { name: 'Updated Panel' }, ku: { name: 'نوێکراوە' } },
      });
    expect(res.status).toBe(200);

    const inDb = await prisma.product.findUnique({
      where: { id: created.id },
      include: { translations: true },
    });
    expect(inDb!.sku).toBe('SKU-123');
    expect(inDb!.status).toBe('DRAFT');
    expect(inDb!.isFeatured).toBe(true);
    expect(inDb!.sortOrder).toBe(5);
    const en = inDb!.translations.find((t) => t.locale === 'EN');
    const ku = inDb!.translations.find((t) => t.locale === 'KU');
    expect(en!.name).toBe('Updated Panel');
    expect(ku!.name).toBe('نوێکراوە');
    // Arabic was untouched and must remain.
    expect(inDb!.translations.find((t) => t.locale === 'AR')!.name).toBe('لوحة ليد');
  });

  it('deletes a product and removes it plus its translations (no orphans)', async () => {
    const created = await createProduct();
    const res = await request(app).delete(`${API}/products/${created.id}`).set(auth(adminToken));
    expect(res.status).toBe(200);

    expect(await prisma.product.findUnique({ where: { id: created.id } })).toBeNull();
    const orphanTranslations = await prisma.productTranslation.count({
      where: { productId: created.id },
    });
    expect(orphanTranslations).toBe(0);
  });
});

// ---------------------------------------------------------------------------
describe('Products - list, search, filter, pagination, sort', () => {
  beforeEach(async () => {
    const otherCat = await createCategory('Furniture');
    await createProduct(adminToken, {
      translations: { en: { name: 'Alpha Chair' } },
      categoryId: otherCat.id,
      brandId: null,
      isFeatured: true,
      sortOrder: 1,
    });
    await createProduct(adminToken, {
      translations: { en: { name: 'Beta Lamp' }, ku: { name: 'چرای بێتا' } },
      sortOrder: 3,
    });
    await createProduct(adminToken, {
      translations: { en: { name: 'Gamma Cable' } },
      status: 'DRAFT',
      sortOrder: 2,
    });
  });

  it('paginates results with correct meta', async () => {
    const res = await request(app).get(`${API}/products?page=1&pageSize=2`).set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(3);
    expect(res.body.meta.totalPages).toBe(2);
  });

  it('searches by translated name in English', async () => {
    const res = await request(app).get(`${API}/products?search=lamp`).set(auth(adminToken));
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].translations.en.name).toBe('Beta Lamp');
  });

  it('searches by translated content in Kurdish', async () => {
    const res = await request(app)
      .get(`${API}/products?search=${encodeURIComponent('چرای')}`)
      .set(auth(adminToken));
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].translations.en.name).toBe('Beta Lamp');
  });

  it('filters by category', async () => {
    const res = await request(app)
      .get(`${API}/products?categoryId=${categoryId}`)
      .set(auth(adminToken));
    // Beta Lamp and Gamma Cable are in the default category.
    expect(res.body.data).toHaveLength(2);
  });

  it('filters by status', async () => {
    const res = await request(app).get(`${API}/products?status=DRAFT`).set(auth(adminToken));
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].translations.en.name).toBe('Gamma Cable');
  });

  it('filters by isFeatured', async () => {
    const res = await request(app).get(`${API}/products?isFeatured=true`).set(auth(adminToken));
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].translations.en.name).toBe('Alpha Chair');
  });

  it('sorts by sortOrder ascending and descending', async () => {
    const asc = await request(app)
      .get(`${API}/products?sortBy=sortOrder&sortDir=asc`)
      .set(auth(adminToken));
    const ascOrders = asc.body.data.map((p: { sortOrder: number }) => p.sortOrder);
    expect(ascOrders).toEqual([...ascOrders].sort((a, b) => a - b));

    const desc = await request(app)
      .get(`${API}/products?sortBy=sortOrder&sortDir=desc`)
      .set(auth(adminToken));
    const descOrders = desc.body.data.map((p: { sortOrder: number }) => p.sortOrder);
    expect(descOrders).toEqual([...descOrders].sort((a, b) => b - a));
  });
});

// ---------------------------------------------------------------------------
describe('Products - permissions', () => {
  it('blocks anonymous access (401)', async () => {
    expect((await request(app).get(`${API}/products`)).status).toBe(401);
  });

  it('lets a viewer read but not create/update/delete', async () => {
    const created = await createProduct();
    expect((await request(app).get(`${API}/products`).set(auth(viewerToken))).status).toBe(200);
    expect(
      (await request(app).post(`${API}/products`).set(auth(viewerToken)).send(productPayload()))
        .status,
    ).toBe(403);
    expect(
      (await request(app).put(`${API}/products/${created.id}`).set(auth(viewerToken)).send({}))
        .status,
    ).toBe(403);
    expect(
      (await request(app).delete(`${API}/products/${created.id}`).set(auth(viewerToken))).status,
    ).toBe(403);
  });

  it('lets an editor create/update but NOT delete', async () => {
    const createRes = await request(app)
      .post(`${API}/products`)
      .set(auth(editorToken))
      .send(productPayload());
    expect(createRes.status).toBe(201);
    const id = createRes.body.data.id;
    expect(
      (await request(app).put(`${API}/products/${id}`).set(auth(editorToken)).send({ sortOrder: 2 }))
        .status,
    ).toBe(200);
    expect((await request(app).delete(`${API}/products/${id}`).set(auth(editorToken))).status).toBe(
      403,
    );
  });

  it('enforces the backend even though the frontend might hide the button', async () => {
    // A viewer crafting a direct DELETE request is still rejected by the server.
    const created = await createProduct();
    const res = await request(app).delete(`${API}/products/${created.id}`).set(auth(viewerToken));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    // The product still exists.
    expect(await prisma.product.findUnique({ where: { id: created.id } })).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe('Products - image pipeline', () => {
  function variantPaths(image: {
    path: string;
    webpPath: string;
    thumbnailPath: string;
    thumbnailWebpPath: string;
  }) {
    return [image.path, image.webpPath, image.thumbnailPath, image.thumbnailWebpPath];
  }

  it('uploads an image and generates optimized + webp + thumbnail variants on disk', async () => {
    const product = await createProduct();
    const buf = await makeImageBuffer('jpeg');
    const res = await request(app)
      .post(`${API}/products/${product.id}/images`)
      .set(auth(adminToken))
      .attach('images', buf, 'photo.jpg');

    expect(res.status).toBe(201);
    expect(res.body.data.images).toHaveLength(1);
    const image = res.body.data.images[0];

    // All four variant paths recorded in DB.
    expect(image.path).toBeTruthy();
    expect(image.webpPath).toMatch(/\.webp$/);
    expect(image.thumbnailPath).toMatch(/-thumb\./);
    expect(image.thumbnailWebpPath).toMatch(/-thumb\.webp$/);
    expect(image.isCover).toBe(true); // first image becomes cover

    // All four physical files exist on disk.
    for (const p of variantPaths(image)) {
      expect(existsSync(toAbsolute(p))).toBe(true);
    }

    // DB row matches.
    const dbImage = await prisma.productImage.findFirst({ where: { productId: product.id } });
    expect(dbImage).not.toBeNull();
    expect(dbImage!.webpPath).toBe(image.webpPath);
  });

  it('uploads multiple images at once', async () => {
    const product = await createProduct();
    const res = await request(app)
      .post(`${API}/products/${product.id}/images`)
      .set(auth(adminToken))
      .attach('images', await makeImageBuffer('jpeg'), 'a.jpg')
      .attach('images', await makeImageBuffer('png'), 'b.png');
    expect(res.status).toBe(201);
    expect(res.body.data.images).toHaveLength(2);
    const covers = res.body.data.images.filter((i: { isCover: boolean }) => i.isCover);
    expect(covers).toHaveLength(1); // exactly one cover
  });

  it('stores distinct files for duplicate image uploads', async () => {
    const product = await createProduct();
    const buf = await makeImageBuffer('jpeg');
    await request(app)
      .post(`${API}/products/${product.id}/images`)
      .set(auth(adminToken))
      .attach('images', buf, 'dup.jpg');
    const res = await request(app)
      .post(`${API}/products/${product.id}/images`)
      .set(auth(adminToken))
      .attach('images', buf, 'dup.jpg');
    const paths = res.body.data.images.map((i: { path: string }) => i.path);
    expect(new Set(paths).size).toBe(paths.length); // all unique
  });

  it('replaces an image: new files appear, old files are removed', async () => {
    const product = await createProduct();
    const up = await request(app)
      .post(`${API}/products/${product.id}/images`)
      .set(auth(adminToken))
      .attach('images', await makeImageBuffer('jpeg'), 'old.jpg');
    const oldImage = up.body.data.images[0];

    const replace = await request(app)
      .put(`${API}/products/${product.id}/images/${oldImage.id}`)
      .set(auth(adminToken))
      .attach('image', await makeImageBuffer('png'), 'new.png');
    expect(replace.status).toBe(200);
    const newImage = replace.body.data.images[0];

    // Same DB row id, but new file paths.
    expect(newImage.id).toBe(oldImage.id);
    expect(newImage.path).not.toBe(oldImage.path);
    // New files exist, old files deleted.
    for (const p of variantPaths(newImage)) expect(existsSync(toAbsolute(p))).toBe(true);
    for (const p of variantPaths(oldImage)) expect(existsSync(toAbsolute(p))).toBe(false);
  });

  it('deletes an image: removes DB row, physical files, thumbnails and webp', async () => {
    const product = await createProduct();
    const up = await request(app)
      .post(`${API}/products/${product.id}/images`)
      .set(auth(adminToken))
      .attach('images', await makeImageBuffer('jpeg'), 'x.jpg');
    const image = up.body.data.images[0];
    for (const p of variantPaths(image)) expect(existsSync(toAbsolute(p))).toBe(true);

    const del = await request(app)
      .delete(`${API}/products/${product.id}/images/${image.id}`)
      .set(auth(adminToken));
    expect(del.status).toBe(200);

    // DB reference removed.
    expect(await prisma.productImage.findUnique({ where: { id: image.id } })).toBeNull();
    // Every physical variant removed.
    for (const p of variantPaths(image)) expect(existsSync(toAbsolute(p))).toBe(false);
  });

  it('promotes a new cover when the cover image is deleted', async () => {
    const product = await createProduct();
    const up = await request(app)
      .post(`${API}/products/${product.id}/images`)
      .set(auth(adminToken))
      .attach('images', await makeImageBuffer('jpeg'), 'a.jpg')
      .attach('images', await makeImageBuffer('jpeg'), 'b.jpg');
    const cover = up.body.data.images.find((i: { isCover: boolean }) => i.isCover);

    await request(app)
      .delete(`${API}/products/${product.id}/images/${cover.id}`)
      .set(auth(adminToken));

    const remaining = await prisma.productImage.findMany({ where: { productId: product.id } });
    expect(remaining).toHaveLength(1);
    expect(remaining[0].isCover).toBe(true); // a cover still exists
  });

  it('deletes all image files when the parent product is deleted', async () => {
    const product = await createProduct();
    const up = await request(app)
      .post(`${API}/products/${product.id}/images`)
      .set(auth(adminToken))
      .attach('images', await makeImageBuffer('jpeg'), 'a.jpg')
      .attach('images', await makeImageBuffer('png'), 'b.png');
    const allPaths = up.body.data.images.flatMap(variantPaths);
    for (const p of allPaths) expect(existsSync(toAbsolute(p))).toBe(true);

    await request(app).delete(`${API}/products/${product.id}`).set(auth(adminToken));

    // All image rows gone (cascade) and all files removed from disk.
    expect(await prisma.productImage.count({ where: { productId: product.id } })).toBe(0);
    for (const p of allPaths) expect(existsSync(toAbsolute(p))).toBe(false);
  });

  it('rejects a corrupted image (valid extension, invalid bytes)', async () => {
    const product = await createProduct();
    const res = await request(app)
      .post(`${API}/products/${product.id}/images`)
      .set(auth(adminToken))
      .attach('images', Buffer.from('this is not an image'), 'fake.jpg');
    expect(res.status).toBe(400);
    // Nothing persisted.
    expect(await prisma.productImage.count({ where: { productId: product.id } })).toBe(0);
  });

  it('rejects an unsupported file type (text/plain)', async () => {
    const product = await createProduct();
    const res = await request(app)
      .post(`${API}/products/${product.id}/images`)
      .set(auth(adminToken))
      .attach('images', Buffer.from('hello'), { filename: 'note.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });

  it('blocks image upload without the upload permission', async () => {
    const product = await createProduct();
    const res = await request(app)
      .post(`${API}/products/${product.id}/images`)
      .set(auth(viewerToken))
      .attach('images', await makeImageBuffer('jpeg'), 'a.jpg');
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
describe('Products - database integrity', () => {
  it('generates unique slugs for duplicate names', async () => {
    const a = await createProduct(adminToken, { translations: { en: { name: 'Same Name' } } });
    const b = await createProduct(adminToken, { translations: { en: { name: 'Same Name' } } });
    expect(a.slug).toBe('same-name');
    expect(b.slug).toBe('same-name-2');
  });

  it('enforces the unique SKU constraint (409 conflict)', async () => {
    await createProduct(adminToken, { sku: 'UNIQUE-1' });
    const res = await request(app)
      .post(`${API}/products`)
      .set(auth(adminToken))
      .send(productPayload({ sku: 'UNIQUE-1' }));
    expect(res.status).toBe(409);
  });

  it('blocks deleting a category that still has products (FK restrict)', async () => {
    await createProduct();
    // Direct DB delete is blocked by the onDelete: Restrict relation.
    await expect(prisma.category.delete({ where: { id: categoryId } })).rejects.toThrow();
  });

  it('rejects creating a product with a non-existent category', async () => {
    const res = await request(app)
      .post(`${API}/products`)
      .set(auth(adminToken))
      .send(productPayload({ categoryId: 'does-not-exist' }));
    expect(res.status).toBe(400);
  });

  it('sets brand to null in the product when the brand is removed', async () => {
    const product = await createProduct();
    // onDelete: SetNull keeps the product but clears the brand reference.
    await prisma.brand.delete({ where: { id: brandId } });
    const inDb = await prisma.product.findUnique({ where: { id: product.id } });
    expect(inDb!.brandId).toBeNull();
  });
});
