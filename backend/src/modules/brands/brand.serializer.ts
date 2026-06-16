import type { Prisma } from '@prisma/client';
import { mapTranslations } from '../../utils/i18n.js';
import { singleImageUrls } from '../../services/image.service.js';

export const brandInclude = {
  translations: true,
  _count: { select: { products: true } },
} satisfies Prisma.BrandInclude;

type BrandWithRelations = Prisma.BrandGetPayload<{ include: typeof brandInclude }>;

export function serializeBrand(b: BrandWithRelations) {
  return {
    id: b.id,
    slug: b.slug,
    website: b.website,
    isActive: b.isActive,
    sortOrder: b.sortOrder,
    logo: singleImageUrls({
      path: b.logoPath,
      webpPath: b.logoWebpPath,
      thumbPath: b.logoThumbPath,
      thumbWebpPath: b.logoThumbWebpPath,
    }),
    productCount: b._count.products,
    translations: mapTranslations(b.translations, ['name', 'description']),
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}
