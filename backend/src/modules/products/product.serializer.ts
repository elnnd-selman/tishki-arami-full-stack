import type { Prisma } from '@prisma/client';
import { mapTranslations } from '../../utils/i18n.js';
import { toPublicUrl, singleImageUrls } from '../../services/image.service.js';

// The exact shape we load for serialization. Keep in sync with the service includes.
export const productInclude = {
  translations: true,
  images: { orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] },
  category: { include: { translations: true } },
  brand: { include: { translations: true } },
  variants: {
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { attributes: { orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }] } },
  },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function serializeImage(img: ProductWithRelations['images'][number]) {
  return {
    id: img.id,
    url: toPublicUrl(img.path),
    webpUrl: toPublicUrl(img.webpPath),
    thumbnailUrl: toPublicUrl(img.thumbnailPath),
    thumbnailWebpUrl: toPublicUrl(img.thumbnailWebpPath),
    // Raw relative paths are useful for debugging / direct file checks.
    path: img.path,
    webpPath: img.webpPath,
    thumbnailPath: img.thumbnailPath,
    thumbnailWebpPath: img.thumbnailWebpPath,
    mimeType: img.mimeType,
    sizeBytes: img.sizeBytes,
    width: img.width,
    height: img.height,
    isCover: img.isCover,
    sortOrder: img.sortOrder,
    altText: img.altText,
  };
}

export function serializeProduct(product: ProductWithRelations) {
  const cover = product.images.find((i) => i.isCover) ?? product.images[0] ?? null;

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    status: product.status,
    isFeatured: product.isFeatured,
    sortOrder: product.sortOrder,
    categoryId: product.categoryId,
    brandId: product.brandId,
    category: product.category
      ? {
          id: product.category.id,
          slug: product.category.slug,
          translations: mapTranslations(product.category.translations, ['name', 'description']),
        }
      : null,
    brand: product.brand
      ? {
          id: product.brand.id,
          slug: product.brand.slug,
          translations: mapTranslations(product.brand.translations, ['name', 'description']),
        }
      : null,
    translations: mapTranslations(product.translations, [
      'name',
      'shortDescription',
      'description',
      'metaTitle',
      'metaDescription',
    ]),
    images: product.images.map(serializeImage),
    coverImage: cover ? serializeImage(cover) : null,
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      isActive: v.isActive,
      sortOrder: v.sortOrder,
      image: v.imagePath
        ? singleImageUrls({ path: v.imagePath, webpPath: v.imageWebpPath, thumbPath: v.imageThumbnailPath, thumbWebpPath: v.imageThumbnailWebpPath })
        : null,
      attributes: v.attributes.map((a) => ({
        id: a.id,
        key: a.key,
        value: a.value,
        sortOrder: a.sortOrder,
      })),
    })),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}
