import type { Request, Response } from 'express';
import { ok, paginated } from '../../utils/http.js';
import { BadRequestError } from '../../lib/errors.js';
import * as service from './brand.service.js';

export async function list(req: Request, res: Response) {
  const { items, meta } = await service.listBrands(req.query as never);
  return paginated(res, items, meta);
}
export async function getById(req: Request, res: Response) {
  return ok(res, await service.getBrand(req.params.id));
}
export async function create(req: Request, res: Response) {
  return ok(res, await service.createBrand(req.body), 201);
}
export async function update(req: Request, res: Response) {
  return ok(res, await service.updateBrand(req.params.id, req.body));
}
export async function remove(req: Request, res: Response) {
  return ok(res, await service.deleteBrand(req.params.id));
}
export async function uploadLogo(req: Request, res: Response) {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) throw new BadRequestError('No image file was provided');
  return ok(res, await service.setBrandLogo(req.params.id, file));
}
export async function deleteLogo(req: Request, res: Response) {
  return ok(res, await service.deleteBrandLogo(req.params.id));
}
