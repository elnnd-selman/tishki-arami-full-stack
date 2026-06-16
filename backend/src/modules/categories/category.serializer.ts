import type { Prisma } from '@prisma/client';
import { mapTranslations } from '../../utils/i18n.js';
import { singleImageUrls } from '../../services/image.service.js';

export const categoryInclude = {
  translations: true,
  parent: { include: { translations: true } },
  _count: { select: { products: true, children: true } },
} satisfies Prisma.CategoryInclude;

type CategoryWithRelations = Prisma.CategoryGetPayload<{ include: typeof categoryInclude }>;

export function serializeCategory(c: CategoryWithRelations) {
  return {
    id: c.id,
    slug: c.slug,
    type: c.type,
    parentId: c.parentId,
    parent: c.parent
      ? { id: c.parent.id, slug: c.parent.slug, translations: mapTranslations(c.parent.translations, ['name']) }
      : null,
    isActive: c.isActive,
    sortOrder: c.sortOrder,
    image: singleImageUrls({
      path: c.imagePath,
      webpPath: c.imageWebpPath,
      thumbPath: c.imageThumbPath,
      thumbWebpPath: c.imageThumbWebpPath,
    }),
    productCount: c._count.products,
    childCount: c._count.children,
    translations: mapTranslations(c.translations, ['name', 'description']),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}
