import type { Request, Response } from 'express';
import { ok, paginated } from '../../utils/http.js';
import { BadRequestError } from '../../lib/errors.js';
import * as service from './category.service.js';

export async function list(req: Request, res: Response) {
  const { items, meta } = await service.listCategories(req.query as never);
  return paginated(res, items, meta);
}
export async function getById(req: Request, res: Response) {
  return ok(res, await service.getCategory(req.params.id));
}
export async function create(req: Request, res: Response) {
  return ok(res, await service.createCategory(req.body), 201);
}
export async function update(req: Request, res: Response) {
  return ok(res, await service.updateCategory(req.params.id, req.body));
}
export async function remove(req: Request, res: Response) {
  return ok(res, await service.deleteCategory(req.params.id));
}
export async function uploadImage(req: Request, res: Response) {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) throw new BadRequestError('No image file was provided');
  return ok(res, await service.setCategoryImage(req.params.id, file));
}
export async function deleteImage(req: Request, res: Response) {
  return ok(res, await service.deleteCategoryImage(req.params.id));
}
