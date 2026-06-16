import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';
import { getProduct } from './product.service.js';
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

  // Count existing variants so we can append in order when sortOrder is omitted.
  const count = await prisma.productVariant.count({ where: { productId } });

  await prisma.productVariant.create({
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

  return getProduct(productId);
}

export async function updateVariant(productId: string, variantId: string, input: UpdateVariantInput) {
  await ensureVariant(productId, variantId);

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
