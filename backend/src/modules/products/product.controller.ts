import type { Request, Response } from 'express';
import { ok, paginated } from '../../utils/http.js';
import { BadRequestError } from '../../lib/errors.js';
import * as service from './product.service.js';

export async function list(req: Request, res: Response) {
  const { items, meta } = await service.listProducts(req.query as never);
  return paginated(res, items, meta);
}

export async function getById(req: Request, res: Response) {
  const product = await service.getProduct(req.params.id);
  return ok(res, product);
}

export async function getBySlug(req: Request, res: Response) {
  const product = await service.getProductBySlug(req.params.slug);
  return ok(res, product);
}

export async function create(req: Request, res: Response) {
  const product = await service.createProduct(req.body);
  return ok(res, product, 201);
}

export async function update(req: Request, res: Response) {
  const product = await service.updateProduct(req.params.id, req.body);
  return ok(res, product);
}

export async function remove(req: Request, res: Response) {
  const result = await service.deleteProduct(req.params.id);
  return ok(res, result);
}

export async function uploadImages(req: Request, res: Response) {
  const files = (req.files as Express.Multer.File[]) ?? [];
  const product = await service.addProductImages(req.params.id, files);
  return ok(res, product, 201);
}

export async function replaceImage(req: Request, res: Response) {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) throw new BadRequestError('No image file was provided');
  const product = await service.replaceProductImage(req.params.id, req.params.imageId, file);
  return ok(res, product);
}

export async function deleteImage(req: Request, res: Response) {
  const product = await service.deleteProductImage(req.params.id, req.params.imageId);
  return ok(res, product);
}

export async function setCover(req: Request, res: Response) {
  const product = await service.setCoverImage(req.params.id, req.params.imageId);
  return ok(res, product);
}

export async function updateImageAlt(req: Request, res: Response) {
  const product = await service.updateImageAlt(
    req.params.id,
    req.params.imageId,
    req.body.altText ?? null,
  );
  return ok(res, product);
}
