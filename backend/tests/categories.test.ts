import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { toAbsolute } from '../src/services/image.service.js';
import { Locale } from '@prisma/client';
import {
  resetDb,
  resetCatalog,
  seedRbacAndUsers,
  login,
  auth,
  makeImageBuffer,
} from './helpers.js';

const API = '/api/v1';
let app: Express;
let adminToken: string;
let viewerToken: string;

beforeAll(async () => {
  app = createApp();
  await resetDb();
  await seedRbacAndUsers();
  adminToken = await login(app, 'admin');
  viewerToken = await login(app, 'viewer');
});
beforeEach(async () => resetCatalog());
afterAll(async () => prisma.$disconnect());

const payload = (over = {}) => ({
  type: 'PRODUCT',
  translations: { en: { name: 'Lighting' }, ar: { name: 'إضاءة' }, ku: { name: 'ڕووناکی' } },
  ...over,
});

async function create(over = {}) {
  const res = await request(app).post(`${API}/categories`).set(auth(adminToken)).send(payload(over));
  expect(res.status).toBe(201);
  return res.body.data;
}

describe('Categories - CRUD', () => {
  it('creates with all translations stored', async () => {
    const c = await create();
    expect(c.slug).toBe('lighting');
    const db = await prisma.categoryTranslation.count({ where: { categoryId: c.id } });
    expect(db).toBe(3);
  });

  it('reads a category with translations and counts', async () => {
    const c = await create();
    const res = await request(app).get(`${API}/categories/${c.id}`).set(auth(adminToken));
    expect(res.body.data.translations.ku.name).toBe('ڕووناکی');
    expect(res.body.data.productCount).toBe(0);
  });

  it('updates fields and translations', async () => {
    const c = await create();
    const res = await request(app)
      .put(`${API}/categories/${c.id}`)
      .set(auth(adminToken))
      .send({ isActive: false, sortOrder: 3, translations: { en: { name: 'Lamps' } } });
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
    expect(res.body.data.translations.en.name).toBe('Lamps');
    expect(res.body.data.translations.ar.name).toBe('إضاءة'); // untouched
  });

  it('deletes a category', async () => {
    const c = await create();
    expect((await request(app).delete(`${API}/categories/${c.id}`).set(auth(adminToken))).status).toBe(200);
    expect(await prisma.category.findUnique({ where: { id: c.id } })).toBeNull();
  });

  it('blocks deleting a category that still has products', async () => {
    const c = await create();
    const prod = await prisma.product.create({ data: { slug: 'p1', categoryId: c.id } });
    await prisma.productTranslation.create({ data: { productId: prod.id, locale: Locale.EN, name: 'P1' } });
    const res = await request(app).delete(`${API}/categories/${c.id}`).set(auth(adminToken));
    expect(res.status).toBe(409);
    expect(await prisma.category.findUnique({ where: { id: c.id } })).not.toBeNull();
  });

  it('generates unique slugs', async () => {
    const a = await create({ translations: { en: { name: 'Dup' } } });
    const b = await create({ translations: { en: { name: 'Dup' } } });
    expect(a.slug).toBe('dup');
    expect(b.slug).toBe('dup-2');
  });
});

describe('Categories - list/search/permissions', () => {
  it('searches by translated name', async () => {
    await create({ translations: { en: { name: 'Furniture' } } });
    await create({ translations: { en: { name: 'Electrical' } } });
    const res = await request(app).get(`${API}/categories?search=furni`).set(auth(adminToken));
    expect(res.body.data).toHaveLength(1);
  });

  it('viewer cannot create/update/delete', async () => {
    const c = await create();
    expect((await request(app).post(`${API}/categories`).set(auth(viewerToken)).send(payload())).status).toBe(403);
    expect((await request(app).put(`${API}/categories/${c.id}`).set(auth(viewerToken)).send({})).status).toBe(403);
    expect((await request(app).delete(`${API}/categories/${c.id}`).set(auth(viewerToken))).status).toBe(403);
  });

  it('requires auth', async () => {
    expect((await request(app).get(`${API}/categories`)).status).toBe(401);
  });
});

describe('Categories - image', () => {
  it('uploads, replaces and deletes the category image with physical files', async () => {
    const c = await create();
    const up = await request(app)
      .put(`${API}/categories/${c.id}/image`)
      .set(auth(adminToken))
      .attach('image', await makeImageBuffer('png'), 'cat.png');
    expect(up.status).toBe(200);
    expect(up.body.data.image.url).toBeTruthy();

    // Verify physical file via the path stored in the DB.
    const cat1 = await prisma.category.findUnique({ where: { id: c.id } });
    const paths1 = [cat1!.imagePath, cat1!.imageWebpPath, cat1!.imageThumbPath, cat1!.imageThumbWebpPath];
    for (const p of paths1) expect(existsSync(toAbsolute(p!))).toBe(true);

    // Replace - new files exist, old files removed.
    await request(app)
      .put(`${API}/categories/${c.id}/image`)
      .set(auth(adminToken))
      .attach('image', await makeImageBuffer('jpeg'), 'cat2.jpg');
    const cat2 = await prisma.category.findUnique({ where: { id: c.id } });
    expect(cat2!.imagePath).not.toBe(cat1!.imagePath);
    for (const p of paths1) expect(existsSync(toAbsolute(p!))).toBe(false);
    expect(existsSync(toAbsolute(cat2!.imagePath!))).toBe(true);

    // Delete - DB reference cleared and files removed.
    const del = await request(app).delete(`${API}/categories/${c.id}/image`).set(auth(adminToken));
    expect(del.body.data.image).toBeNull();
    const cat3 = await prisma.category.findUnique({ where: { id: c.id } });
    expect(cat3!.imagePath).toBeNull();
    expect(existsSync(toAbsolute(cat2!.imagePath!))).toBe(false);
  });
});
