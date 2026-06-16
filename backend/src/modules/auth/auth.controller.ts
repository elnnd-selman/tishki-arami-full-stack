import type { Request, Response } from 'express';
import { env } from '../../config/env.js';
import { ok } from '../../utils/http.js';
import * as authService from './auth.service.js';

const REFRESH_COOKIE = 'refreshToken';

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export async function loginController(req: Request, res: Response) {
  const result = await authService.login(req.body);
  setRefreshCookie(res, result.refreshToken);
  return ok(res, {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
}

export async function refreshController(req: Request, res: Response) {
  const token =
    (req as Request & { cookies?: Record<string, string> }).cookies?.[REFRESH_COOKIE] ??
    req.body?.refreshToken;
  const result = await authService.refresh(token);
  return ok(res, result);
}

export async function meController(req: Request, res: Response) {
  const me = await authService.getMe(req.user!.id);
  return ok(res, me);
}

export async function logoutController(_req: Request, res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
  return ok(res, { message: 'Logged out' });
}
