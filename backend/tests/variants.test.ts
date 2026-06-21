import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { Locale } from '@prisma/client';
import { resetDb, resetCatalog, seedRbacAndUsers, login, auth, createCategory } from './helpers.js';

const API = '/api/v1';
let app: Express;
let adminToken: string;
let editorToken: string;
let viewerToken: string;
let productId: string;

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
  const p = await prisma.product.create({ data: { slug: 'base-product', categoryId: cat.id } });
  await prisma.productTranslation.create({ data: { productId: p.id, locale: Locale.EN, name: 'Base' } });
  productId = p.id;
});

afterAll(async () => prisma.$disconnect());

const variantBody = (over = {}) => ({
  sku: 'VAR-1',
  price: 12.5,
  attributes: [
    { key: 'Color', value: 'Red' },
    { key: 'Wattage', value: '60W' },
  ],
  ...over,
});

describe('Variants - CRUD with relational attributes', () => {
  it('creates a variant whose attributes are stored as separate rows (not JSON)', async () => {
    const res = await request(app)
      .post(`${API}/products/${productId}/variants`)
      .set(auth(adminToken))
      .send(variantBody());
    expect(res.status).toBe(201);
    expect(res.body.data.variants).toHaveLength(1);
    const variant = res.body.data.variants[0];
    expect(variant.attributes).toHaveLength(2);
    expect(variant.attributes[0]).toMatchObject({ key: 'Color', value: 'Red' });

    // Attributes exist as real rows in their own table.
    const rows = await prisma.productVariantAttribute.findMany({ where: { variantId: variant.id } });
    expect(rows).toHaveLength(2);
    const cols = Object.keys(rows[0]);
    expect(cols).toContain('key');
    expect(cols).toContain('value');
  });

  it('supports multiple variants per product', async () => {
    await request(app).post(`${API}/products/${productId}/variants`).set(auth(adminToken)).send(variantBody({ sku: 'A', attributes: [{ key: 'Size', value: 'S' }] }));
    await request(app).post(`${API}/products/${productId}/variants`).set(auth(adminToken)).send(variantBody({ sku: 'B', attributes: [{ key: 'Size', value: 'M' }] }));
    const res = await request(app).post(`${API}/products/${productId}/variants`).set(auth(adminToken)).send(variantBody({ sku: 'C', attributes: [{ key: 'Size', value: 'L' }] }));
    expect(res.body.data.variants).toHaveLength(3);
  });

  it('replaces the attribute set on update', async () => {
    const created = await request(app).post(`${API}/products/${productId}/variants`).set(auth(adminToken)).send(variantBody());
    const variantId = created.body.data.variants[0].id;

    const res = await request(app)
      .put(`${API}/products/${productId}/variants/${variantId}`)
      .set(auth(adminToken))
      .send({ price: 20, attributes: [{ key: 'Color', value: 'Blue' }] });
    expect(res.status).toBe(200);
    const variant = res.body.data.variants[0];
    expect(variant.price).toBe(20);
    expect(variant.attributes).toHaveLength(1);
    expect(variant.attributes[0].value).toBe('Blue');

    // Old attribute rows were removed.
    expect(await prisma.productVariantAttribute.count({ where: { variantId } })).toBe(1);
  });

  it('rejects duplicate attribute keys within a variant', async () => {
    const res = await request(app)
      .post(`${API}/products/${productId}/variants`)
      .set(auth(adminToken))
      .send(variantBody({ attributes: [{ key: 'Color', value: 'Red' }, { key: 'Color', value: 'Blue' }] }));
    expect(res.status).toBe(422);
  });

  it('deletes a variant and cascades its attributes', async () => {
    const created = await request(app).post(`${API}/products/${productId}/variants`).set(auth(adminToken)).send(variantBody());
    const variantId = created.body.data.variants[0].id;
    const del = await request(app).delete(`${API}/products/${productId}/variants/${variantId}`).set(auth(adminToken));
    expect(del.status).toBe(200);
    expect(await prisma.productVariant.count({ where: { productId } })).toBe(0);
    expect(await prisma.productVariantAttribute.count({ where: { variantId } })).toBe(0);
  });

  it('removes all variants + attributes when the product is deleted', async () => {
    const created = await request(app).post(`${API}/products/${productId}/variants`).set(auth(adminToken)).send(variantBody());
    const variantId = created.body.data.variants[0].id;
    await request(app).delete(`${API}/products/${productId}`).set(auth(adminToken));
    expect(await prisma.productVariant.count({ where: { productId } })).toBe(0);
    expect(await prisma.productVariantAttribute.count({ where: { variantId } })).toBe(0);
  });
});

describe('Variants - permissions', () => {
  it('editor (product.update) can manage variants', async () => {
    const res = await request(app).post(`${API}/products/${productId}/variants`).set(auth(editorToken)).send(variantBody());
    expect(res.status).toBe(201);
  });

  it('viewer cannot create variants', async () => {
    const res = await request(app).post(`${API}/products/${productId}/variants`).set(auth(viewerToken)).send(variantBody());
    expect(res.status).toBe(403);
  });

  it('requires authentication', async () => {
    const res = await request(app).post(`${API}/products/${productId}/variants`).send(variantBody());
    expect(res.status).toBe(401);
  });
});

// Tiny 1×1 PNG used for upload tests.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

describe('Variants - image upload', () => {
  let variantId: string;

  beforeEach(async () => {
    const created = await request(app)
      .post(`${API}/products/${productId}/variants`)
      .set(auth(adminToken))
      .send(variantBody());
    variantId = created.body.data.variants[0].id;
  });

  it('uploads a variant image and returns URLs', async () => {
    const res = await request(app)
      .post(`${API}/products/${productId}/variants/${variantId}/image`)
      .set(auth(adminToken))
      .attach('image', TINY_PNG, { filename: 'test.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    const variant = res.body.data.variants.find((v: any) => v.id === variantId);
    expect(variant.image).not.toBeNull();
    expect(variant.image.url).toMatch(/uploads/);
  });

  it('removes the variant image', async () => {
    await request(app)
      .post(`${API}/products/${productId}/variants/${variantId}/image`)
      .set(auth(adminToken))
      .attach('image', TINY_PNG, { filename: 'test.png', contentType: 'image/png' });
    const res = await request(app)
      .delete(`${API}/products/${productId}/variants/${variantId}/image`)
      .set(auth(adminToken));
    expect(res.status).toBe(200);
    const variant = res.body.data.variants.find((v: any) => v.id === variantId);
    expect(variant.image).toBeNull();
  });

  it('requires product.upload permission to upload variant image', async () => {
    const res = await request(app)
      .post(`${API}/products/${productId}/variants/${variantId}/image`)
      .set(auth(viewerToken))
      .attach('image', TINY_PNG, { filename: 'test.png', contentType: 'image/png' });
    expect(res.status).toBe(403);
  });
});
