import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { toAbsolute } from '../src/services/image.service.js';
import { Locale } from '@prisma/client';
import { resetDb, resetCatalog, seedRbacAndUsers, login, auth, makeImageBuffer } from './helpers.js';

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
  website: 'https://philips.com',
  translations: { en: { name: 'Philips' }, ar: { name: 'فيليبس' }, ku: { name: 'فیلیپس' } },
  ...over,
});

async function create(over = {}) {
  const res = await request(app).post(`${API}/brands`).set(auth(adminToken)).send(payload(over));
  expect(res.status).toBe(201);
  return res.body.data;
}

describe('Brands - CRUD', () => {
  it('creates with translations and website', async () => {
    const b = await create();
    expect(b.slug).toBe('philips');
    expect(b.website).toBe('https://philips.com');
    expect(await prisma.brandTranslation.count({ where: { brandId: b.id } })).toBe(3);
  });

  it('rejects an invalid website url', async () => {
    const res = await request(app).post(`${API}/brands`).set(auth(adminToken)).send(payload({ website: 'not-a-url' }));
    expect(res.status).toBe(422);
  });

  it('accepts an empty website', async () => {
    const res = await request(app).post(`${API}/brands`).set(auth(adminToken)).send(payload({ website: '' }));
    expect(res.status).toBe(201);
    expect(res.body.data.website).toBeNull();
  });

  it('updates fields and translations', async () => {
    const b = await create();
    const res = await request(app)
      .put(`${API}/brands/${b.id}`)
      .set(auth(adminToken))
      .send({ isActive: false, translations: { ku: { name: 'گۆڕدرا' } } });
    expect(res.body.data.isActive).toBe(false);
    expect(res.body.data.translations.ku.name).toBe('گۆڕدرا');
    expect(res.body.data.translations.en.name).toBe('Philips');
  });

  it('deletes a brand', async () => {
    const b = await create();
    expect((await request(app).delete(`${API}/brands/${b.id}`).set(auth(adminToken))).status).toBe(200);
    expect(await prisma.brand.findUnique({ where: { id: b.id } })).toBeNull();
  });

  it('blocks deleting a brand still used by products', async () => {
    const b = await create();
    const cat = await prisma.category.create({ data: { slug: 'c1' } });
    const prod = await prisma.product.create({ data: { slug: 'p1', categoryId: cat.id, brandId: b.id } });
    await prisma.productTranslation.create({ data: { productId: prod.id, locale: Locale.EN, name: 'P1' } });
    const res = await request(app).delete(`${API}/brands/${b.id}`).set(auth(adminToken));
    expect(res.status).toBe(409);
  });
});

describe('Brands - permissions & logo', () => {
  it('viewer cannot mutate', async () => {
    const b = await create();
    expect((await request(app).post(`${API}/brands`).set(auth(viewerToken)).send(payload())).status).toBe(403);
    expect((await request(app).delete(`${API}/brands/${b.id}`).set(auth(viewerToken))).status).toBe(403);
  });

  it('uploads and deletes a logo with physical files', async () => {
    const b = await create();
    const up = await request(app)
      .put(`${API}/brands/${b.id}/logo`)
      .set(auth(adminToken))
      .attach('logo', await makeImageBuffer('png'), 'logo.png');
    expect(up.status).toBe(200);
    expect(up.body.data.logo.url).toBeTruthy();

    const withLogo = await prisma.brand.findUnique({ where: { id: b.id } });
    const paths = [withLogo!.logoPath, withLogo!.logoWebpPath, withLogo!.logoThumbPath, withLogo!.logoThumbWebpPath];
    for (const p of paths) expect(existsSync(toAbsolute(p!))).toBe(true);

    const del = await request(app).delete(`${API}/brands/${b.id}/logo`).set(auth(adminToken));
    expect(del.body.data.logo).toBeNull();
    const cleared = await prisma.brand.findUnique({ where: { id: b.id } });
    expect(cleared!.logoPath).toBeNull();
    for (const p of paths) expect(existsSync(toAbsolute(p!))).toBe(false);
  });
});
