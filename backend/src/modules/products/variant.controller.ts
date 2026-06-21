import type { Request, Response } from 'express';
import { ok } from '../../utils/http.js';
import { BadRequestError } from '../../lib/errors.js';
import * as service from './variant.service.js';

export async function create(req: Request, res: Response) {
  return ok(res, await service.createVariant(req.params.id, req.body), 201);
}
export async function update(req: Request, res: Response) {
  return ok(res, await service.updateVariant(req.params.id, req.params.variantId, req.body));
}
export async function remove(req: Request, res: Response) {
  return ok(res, await service.deleteVariant(req.params.id, req.params.variantId));
}
export async function uploadImage(req: Request, res: Response) {
  if (!req.file) throw new BadRequestError('No file uploaded');
  const { id, variantId } = req.params;
  return ok(res, await service.uploadVariantImage(id, variantId, req.file.buffer, req.file.mimetype));
}
export async function removeImage(req: Request, res: Response) {
  const { id, variantId } = req.params;
  return ok(res, await service.removeVariantImage(id, variantId));
}
