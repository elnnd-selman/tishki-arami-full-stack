import type { Prisma } from '@prisma/client';
import { mapTranslations } from '../../utils/i18n.js';
import { singleImageUrls, toPublicUrl } from '../../services/image.service.js';

// ---- Service ----
export const serviceInclude = {
  translations: true,
  category: { include: { translations: true } },
} satisfies Prisma.ServiceInclude;

type ServiceWith = Prisma.ServiceGetPayload<{ include: typeof serviceInclude }>;

export function serializeService(s: ServiceWith) {
  return {
    id: s.id,
    slug: s.slug,
    sortOrder: s.sortOrder,
    image: singleImageUrls({
      path: s.imagePath,
      webpPath: s.imageWebpPath,
      thumbPath: s.imageThumbPath,
      thumbWebpPath: s.imageThumbWebpPath,
    }),
    category: s.category
      ? { id: s.category.id, slug: s.category.slug, translations: mapTranslations(s.category.translations, ['name']) }
      : null,
    translations: mapTranslations(s.translations, ['name', 'description']),
  };
}

// ---- Project ----
export const projectInclude = {
  translations: true,
  images: { orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] },
} satisfies Prisma.ProjectInclude;

type ProjectWith = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

function projectImage(img: ProjectWith['images'][number]) {
  return {
    id: img.id,
    url: toPublicUrl(img.path),
    webpUrl: toPublicUrl(img.webpPath),
    thumbnailUrl: toPublicUrl(img.thumbnailPath),
    thumbnailWebpUrl: toPublicUrl(img.thumbnailWebpPath),
    isCover: img.isCover,
    altText: img.altText,
  };
}

export function serializeProject(p: ProjectWith) {
  const cover = p.images.find((i) => i.isCover) ?? p.images[0] ?? null;
  return {
    id: p.id,
    slug: p.slug,
    clientName: p.clientName,
    location: p.location,
    completedAt: p.completedAt,
    isFeatured: p.isFeatured,
    sortOrder: p.sortOrder,
    translations: mapTranslations(p.translations, ['title', 'description']),
    images: p.images.map(projectImage),
    coverImage: cover ? projectImage(cover) : null,
    createdAt: p.createdAt,
  };
}

// ---- Blog ----
export const blogInclude = {
  translations: true,
  category: { include: { translations: true } },
  author: { select: { fullName: true } },
} satisfies Prisma.BlogInclude;

type BlogWith = Prisma.BlogGetPayload<{ include: typeof blogInclude }>;

export function serializeBlog(b: BlogWith) {
  return {
    id: b.id,
    slug: b.slug,
    publishedAt: b.publishedAt,
    viewsCount: b.viewsCount,
    authorName: b.author?.fullName ?? null,
    cover: singleImageUrls({
      path: b.coverPath,
      webpPath: b.coverWebpPath,
      thumbPath: b.coverThumbPath,
      thumbWebpPath: b.coverThumbWebpPath,
    }),
    category: b.category
      ? { id: b.category.id, slug: b.category.slug, translations: mapTranslations(b.category.translations, ['name']) }
      : null,
    translations: mapTranslations(b.translations, ['title', 'excerpt', 'content']),
    createdAt: b.createdAt,
  };
}
