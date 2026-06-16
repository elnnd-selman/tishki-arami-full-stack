import sharp from 'sharp';
import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/lib/password.js';
import { PERMISSION_DEFINITIONS, PERMISSIONS } from '../src/config/permissions.js';
import { Locale } from '@prisma/client';

const TABLES = [
  'ProductImage',
  'ProductTranslation',
  'ProjectImage',
  'ProjectTranslation',
  'ServiceTranslation',
  'BlogTranslation',
  'CategoryTranslation',
  'BrandTranslation',
  'RolePermission',
  'Product',
  'Project',
  'Service',
  'Blog',
  'Category',
  'Brand',
  'User',
  'Role',
  'Permission',
];

// Wipe every table between tests for full isolation.
export async function resetDb() {
  const list = TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
}

// Catalog-only reset that keeps RBAC (users/roles/permissions) intact, so the
// expensive password hashing + login only happen once per test file.
const CATALOG_TABLES = [
  'ProductImage',
  'ProductTranslation',
  'ProjectImage',
  'ProjectTranslation',
  'ServiceTranslation',
  'BlogTranslation',
  'CategoryTranslation',
  'BrandTranslation',
  'Product',
  'Project',
  'Service',
  'Blog',
  'Category',
  'Brand',
];

export async function resetCatalog() {
  const list = CATALOG_TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
}

export const CREDS = {
  admin: { email: 'admin@test.com', password: 'Admin@123' },
  editor: { email: 'editor@test.com', password: 'Editor@123' },
  viewer: { email: 'viewer@test.com', password: 'Viewer@123' },
};

// Seeds permissions, three roles and three users matching CREDS.
export async function seedRbacAndUsers() {
  for (const def of PERMISSION_DEFINITIONS) {
    await prisma.permission.create({
      data: { code: def.code, group: def.group, description: def.description },
    });
  }
  const allPerms = await prisma.permission.findMany();
  const all = allPerms.map((p) => p.id);
  const viewerPermIds = allPerms.filter((p) => p.code.endsWith('.view')).map((p) => p.id);
  const editorCodes = new Set<string>([
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.PRODUCT_CREATE,
    PERMISSIONS.PRODUCT_UPDATE,
    PERMISSIONS.PRODUCT_UPLOAD,
    PERMISSIONS.CATEGORY_VIEW,
    PERMISSIONS.BRAND_VIEW,
  ]);
  const editorPermIds = allPerms.filter((p) => editorCodes.has(p.code)).map((p) => p.id);

  const superAdmin = await prisma.role.create({
    data: {
      name: 'Super Admin',
      isSystem: true,
      permissions: { create: all.map((permissionId) => ({ permissionId })) },
    },
  });
  const editor = await prisma.role.create({
    data: {
      name: 'Editor',
      permissions: { create: editorPermIds.map((permissionId) => ({ permissionId })) },
    },
  });
  const viewer = await prisma.role.create({
    data: {
      name: 'Viewer',
      permissions: { create: viewerPermIds.map((permissionId) => ({ permissionId })) },
    },
  });

  await prisma.user.create({
    data: {
      email: CREDS.admin.email,
      fullName: 'Admin',
      passwordHash: await hashPassword(CREDS.admin.password),
      roleId: superAdmin.id,
    },
  });
  await prisma.user.create({
    data: {
      email: CREDS.editor.email,
      fullName: 'Editor',
      passwordHash: await hashPassword(CREDS.editor.password),
      roleId: editor.id,
    },
  });
  await prisma.user.create({
    data: {
      email: CREDS.viewer.email,
      fullName: 'Viewer',
      passwordHash: await hashPassword(CREDS.viewer.password),
      roleId: viewer.id,
    },
  });
}

// Logs in through the real endpoint and returns the access token.
export async function login(app: Express, who: keyof typeof CREDS): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send(CREDS[who]);
  if (res.status !== 200) {
    throw new Error(`login failed for ${who}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data.accessToken;
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function createCategory(name = 'Test Category') {
  const cat = await prisma.category.create({ data: { slug: `cat-${Date.now()}-${Math.random().toString(16).slice(2, 6)}` } });
  await prisma.categoryTranslation.create({
    data: { categoryId: cat.id, locale: Locale.EN, name },
  });
  return cat;
}

export async function createBrand(name = 'Test Brand') {
  const brand = await prisma.brand.create({ data: { slug: `brand-${Date.now()}-${Math.random().toString(16).slice(2, 6)}` } });
  await prisma.brandTranslation.create({ data: { brandId: brand.id, locale: Locale.EN, name } });
  return brand;
}

// Generates a real in-memory image so the sharp pipeline has valid bytes to process.
export async function makeImageBuffer(
  format: 'png' | 'jpeg' = 'jpeg',
  size = 800,
): Promise<Buffer> {
  const img = sharp({
    create: {
      width: size,
      height: size,
      channels: format === 'png' ? 4 : 3,
      background: format === 'png' ? { r: 220, g: 40, b: 40, alpha: 1 } : { r: 30, g: 60, b: 200 },
    },
  });
  return format === 'png' ? img.png().toBuffer() : img.jpeg().toBuffer();
}
