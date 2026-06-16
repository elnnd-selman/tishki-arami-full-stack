import type { Request, Response } from 'express';
import { ok } from '../../utils/http.js';
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
