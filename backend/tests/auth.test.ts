import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { resetDb, seedRbacAndUsers, CREDS, auth, login } from './helpers.js';

let app: Express;

beforeAll(async () => {
  app = createApp();
  await resetDb();
  await seedRbacAndUsers();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const API = '/api/v1';

describe('Auth', () => {
  it('logs in with valid credentials and returns permissions', async () => {
    const res = await request(app).post(`${API}/auth/login`).send(CREDS.admin);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe(CREDS.admin.email);
    expect(res.body.data.user.permissions).toContain('product.create');
  });

  it('rejects a wrong password with 401 INVALID_CREDENTIALS', async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: CREDS.admin.email, password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an unknown email with 401 (no account enumeration)', async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'nobody@test.com', password: 'whatever' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('validates the login body', async () => {
    const res = await request(app).post(`${API}/auth/login`).send({ email: 'not-an-email' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns the current user from /me with a valid token', async () => {
    const token = await login(app, 'editor');
    const res = await request(app).get(`${API}/auth/me`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.role.name).toBe('Editor');
  });

  it('rejects /me without a token (401 NO_TOKEN)', async () => {
    const res = await request(app).get(`${API}/auth/me`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NO_TOKEN');
  });

  it('rejects /me with an invalid token (401 TOKEN_INVALID)', async () => {
    const res = await request(app).get(`${API}/auth/me`).set(auth('garbage.token.value'));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });

  it('refreshes the access token using the refresh token', async () => {
    const loginRes = await request(app).post(`${API}/auth/login`).send(CREDS.admin);
    const refreshToken = loginRes.body.data.refreshToken;
    const res = await request(app).post(`${API}/auth/refresh`).send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it('rejects refresh with an invalid token', async () => {
    const res = await request(app).post(`${API}/auth/refresh`).send({ refreshToken: 'nope' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('REFRESH_INVALID');
  });
});
