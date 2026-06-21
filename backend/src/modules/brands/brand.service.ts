import { Prisma, Locale } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import { uniqueSlug } from '../../utils/slug.js';
import { buildPageMeta, parsePagination } from '../../utils/pagination.js';
import { processImage, deleteImageFiles } from '../../services/image.service.js';
import { brandInclude, serializeBrand } from './brand.serializer.js';
import type { CreateBrandInput, UpdateBrandInput, ListBrandsQuery } from './brand.schema.js';

const IMAGE_SUBDIR = 'brands';

type TranslationInput = NonNullable<CreateBrandInput['translations']['en']>;

function translationRows(translations: Record<string, TranslationInput | undefined>) {
  const rows: Array<{ locale: Locale } & TranslationInput> = [];
  if (translations.en) rows.push({ locale: Locale.EN, ...translations.en });
  if (translations.ar) rows.push({ locale: Locale.AR, ...translations.ar });
  if (translations.ku) rows.push({ locale: Locale.KU, ...translations.ku });
  return rows;
}

function normalizeWebsite(website?: string | null) {
  if (website === undefined) return undefined;
  return website && website.trim() ? website.trim() : null;
}

export async function listBrands(query: ListBrandsQuery) {
  const { page, pageSize, skip, take } = parsePagination(query);

  const filters: Prisma.BrandWhereInput[] = [];
  if (query.isActive !== undefined) filters.push({ isActive: query.isActive });
  if (query.search) {
    const s = query.search.replace(/%/g, '\\%').replace(/_/g, '\\_');
    filters.push({
      OR: [
        { slug: { contains: s, mode: 'insensitive' } },
        { translations: { some: { name: { contains: s, mode: 'insensitive' } } } },
      ],
    });
  }
  const where: Prisma.BrandWhereInput = filters.length ? { AND: filters } : {};

  const sortDir = query.sortDir ?? 'asc';
  const orderBy: Prisma.BrandOrderByWithRelationInput =
    query.sortBy === 'createdAt'
      ? { createdAt: sortDir }
      : query.sortBy === 'name'
        ? { slug: sortDir }
        : { sortOrder: sortDir };

  const [total, items] = await Promise.all([
    prisma.brand.count({ where }),
    prisma.brand.findMany({ where, include: brandInclude, orderBy, skip, take }),
  ]);

  return { items: items.map(serializeBrand), meta: buildPageMeta(page, pageSize, total) };
}

export async function getBrand(id: string) {
  const brand = await prisma.brand.findUnique({ where: { id }, include: brandInclude });
  if (!brand) throw new NotFoundError('Brand not found');
  return serializeBrand(brand);
}

export async function createBrand(input: CreateBrandInput) {
  const slug = await uniqueSlug(prisma, 'brand', input.slug || input.translations.en.name);
  const brand = await prisma.brand.create({
    data: {
      slug,
      website: normalizeWebsite(input.website) ?? null,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
      translations: { create: translationRows(input.translations) },
    },
    include: brandInclude,
  });
  return serializeBrand(brand);
}

export async function updateBrand(id: string, input: UpdateBrandInput) {
  const existing = await prisma.brand.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new NotFoundError('Brand not found');

  const data: Prisma.BrandUpdateInput = {};
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  const website = normalizeWebsite(input.website);
  if (website !== undefined) data.website = website;
  if (input.slug !== undefined && input.slug.trim()) {
    data.slug = await uniqueSlug(prisma, 'brand', input.slug, id);
  }

  await prisma.$transaction(async (tx) => {
    await tx.brand.update({ where: { id }, data });
    if (input.translations) {
      for (const [key, fields] of Object.entries(input.translations)) {
        if (!fields) continue;
        const locale = key === 'ar' ? Locale.AR : key === 'ku' ? Locale.KU : Locale.EN;
        await tx.brandTranslation.upsert({
          where: { brandId_locale: { brandId: id, locale } },
          update: fields,
          create: { brandId: id, locale, ...(fields as TranslationInput) },
        });
      }
    }
  });

  return getBrand(id);
}

export async function deleteBrand(id: string) {
  const brand = await prisma.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!brand) throw new NotFoundError('Brand not found');
  if (brand._count.products > 0) {
    throw new ConflictError(`Cannot delete: ${brand._count.products} product(s) still use this brand`);
  }

  await prisma.brand.delete({ where: { id } });
  await deleteImageFiles([brand.logoPath, brand.logoWebpPath, brand.logoThumbPath, brand.logoThumbWebpPath]);
  return { id };
}

// ---- Logo ----
export async function setBrandLogo(id: string, file: Express.Multer.File) {
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) throw new NotFoundError('Brand not found');

  const processed = await processImage(file.buffer, IMAGE_SUBDIR, file.mimetype);
  const oldPaths = [brand.logoPath, brand.logoWebpPath, brand.logoThumbPath, brand.logoThumbWebpPath];

  try {
    await prisma.brand.update({
      where: { id },
      data: {
        logoPath: processed.path,
        logoWebpPath: processed.webpPath,
        logoThumbPath: processed.thumbnailPath,
        logoThumbWebpPath: processed.thumbnailWebpPath,
      },
    });
  } catch (err) {
    await deleteImageFiles([processed.path, processed.webpPath, processed.thumbnailPath, processed.thumbnailWebpPath]);
    throw err;
  }

  await deleteImageFiles(oldPaths);
  return getBrand(id);
}

export async function deleteBrandLogo(id: string) {
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) throw new NotFoundError('Brand not found');
  if (!brand.logoPath) return getBrand(id);

  await prisma.brand.update({
    where: { id },
    data: { logoPath: null, logoWebpPath: null, logoThumbPath: null, logoThumbWebpPath: null },
  });
  await deleteImageFiles([brand.logoPath, brand.logoWebpPath, brand.logoThumbPath, brand.logoThumbWebpPath]);
  return getBrand(id);
}
