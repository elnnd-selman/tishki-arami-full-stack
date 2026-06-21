import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import { getProduct } from './product.service.js';
import { processImage, deleteImageVariants } from '../../services/image.service.js';
import type { CreateVariantInput, UpdateVariantInput } from './variant.schema.js';

async function ensureProduct(productId: string) {
  const p = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!p) throw new NotFoundError('Product not found');
}

async function ensureVariant(productId: string, variantId: string) {
  const v = await prisma.productVariant.findFirst({
    where: { id: variantId, productId },
    select: { id: true },
  });
  if (!v) throw new NotFoundError('Variant not found for this product');
}

export async function createVariant(productId: string, input: CreateVariantInput) {
  await ensureProduct(productId);

  // Check SKU uniqueness within this product before inserting.
  if (input.sku) {
    const skuExists = await prisma.productVariant.findFirst({ where: { productId, sku: input.sku }, select: { id: true } });
    if (skuExists) throw new ConflictError(`A variant with SKU "${input.sku}" already exists on this product`);
  }

  // Atomic: read count + create in one transaction to avoid duplicate sortOrder under concurrent requests.
  await prisma.$transaction(async (tx) => {
    const count = await tx.productVariant.count({ where: { productId } });
    await tx.productVariant.create({
      data: {
        productId,
        sku: input.sku ?? null,
        price: input.price ?? null,
        currency: input.currency ?? 'USD',
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? count,
        attributes: {
          create: (input.attributes ?? []).map((a, i) => ({
            key: a.key,
            value: a.value,
            sortOrder: i,
          })),
        },
      },
    });
  });

  return getProduct(productId);
}

export async function updateVariant(productId: string, variantId: string, input: UpdateVariantInput) {
  await ensureVariant(productId, variantId);

  // Check SKU uniqueness within this product (exclude self).
  if (input.sku) {
    const skuExists = await prisma.productVariant.findFirst({
      where: { productId, sku: input.sku, NOT: { id: variantId } },
      select: { id: true },
    });
    if (skuExists) throw new ConflictError(`A variant with SKU "${input.sku}" already exists on this product`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.productVariant.update({
      where: { id: variantId },
      data: {
        ...(input.sku !== undefined ? { sku: input.sku } : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
    });

    // When attributes are provided, replace the whole set atomically.
    if (input.attributes !== undefined) {
      await tx.productVariantAttribute.deleteMany({ where: { variantId } });
      if (input.attributes.length > 0) {
        await tx.productVariantAttribute.createMany({
          data: input.attributes.map((a, i) => ({ variantId, key: a.key, value: a.value, sortOrder: i })),
        });
      }
    }
  });

  return getProduct(productId);
}

export async function deleteVariant(productId: string, variantId: string) {
  await ensureVariant(productId, variantId);
  // Cascade removes the variant's attribute rows.
  await prisma.productVariant.delete({ where: { id: variantId } });
  return getProduct(productId);
}

export async function uploadVariantImage(productId: string, variantId: string, buffer: Buffer, mime: string) {
  await ensureVariant(productId, variantId);
  const old = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { imagePath: true, imageWebpPath: true, imageThumbnailPath: true, imageThumbnailWebpPath: true },
  });
  if (old?.imagePath) {
    await deleteImageVariants({
      path: old.imagePath,
      webpPath: old.imageWebpPath,
      thumbnailPath: old.imageThumbnailPath,
      thumbnailWebpPath: old.imageThumbnailWebpPath,
    });
  }
  const processed = await processImage(buffer, `variants/${variantId}`);
  await prisma.productVariant.update({
    where: { id: variantId },
    data: {
      imagePath: processed.path,
      imageWebpPath: processed.webpPath,
      imageThumbnailPath: processed.thumbnailPath,
      imageThumbnailWebpPath: processed.thumbnailWebpPath,
    },
  });
  return getProduct(productId);
}

export async function removeVariantImage(productId: string, variantId: string) {
  await ensureVariant(productId, variantId);
  const v = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { imagePath: true, imageWebpPath: true, imageThumbnailPath: true, imageThumbnailWebpPath: true },
  });
  if (!v?.imagePath) return getProduct(productId);
  await deleteImageVariants({
    path: v.imagePath,
    webpPath: v.imageWebpPath,
    thumbnailPath: v.imageThumbnailPath,
    thumbnailWebpPath: v.imageThumbnailWebpPath,
  });
  await prisma.productVariant.update({
    where: { id: variantId },
    data: { imagePath: null, imageWebpPath: null, imageThumbnailPath: null, imageThumbnailWebpPath: null },
  });
  return getProduct(productId);
}
