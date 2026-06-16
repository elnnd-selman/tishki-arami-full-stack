import type { Request, Response } from 'express';
import { ok, paginated } from '../../utils/http.js';
import * as service from './public.service.js';

export async function home(_req: Request, res: Response) {
  return ok(res, await service.getHome());
}

export async function products(req: Request, res: Response) {
  const { items, meta } = await service.listProducts(req.query as never);
  return paginated(res, items, meta);
}

export async function productBySlug(req: Request, res: Response) {
  return ok(res, await service.getProduct(req.params.slug));
}

export async function categories(_req: Request, res: Response) {
  return ok(res, await service.listCategories());
}

export async function brands(_req: Request, res: Response) {
  return ok(res, await service.listBrands());
}

export async function services(_req: Request, res: Response) {
  return ok(res, await service.listServices());
}

export async function projects(req: Request, res: Response) {
  const { items, meta } = await service.listProjects(req.query as never);
  return paginated(res, items, meta);
}

export async function projectBySlug(req: Request, res: Response) {
  return ok(res, await service.getProject(req.params.slug));
}

export async function blogs(req: Request, res: Response) {
  const { items, meta } = await service.listBlogs(req.query as never);
  return paginated(res, items, meta);
}

export async function blogBySlug(req: Request, res: Response) {
  return ok(res, await service.getBlog(req.params.slug));
}
