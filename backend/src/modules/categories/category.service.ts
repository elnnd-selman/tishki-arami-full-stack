import { Prisma, Locale } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, BadRequestError, ConflictError } from '../../lib/errors.js';
import { uniqueSlug } from '../../utils/slug.js';
import { buildPageMeta, parsePagination } from '../../utils/pagination.js';
import { processImage, deleteImageFiles } from '../../services/image.service.js';
import { categoryInclude, serializeCategory } from './category.serializer.js';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  ListCategoriesQuery,
} from './category.schema.js';

const IMAGE_SUBDIR = 'categories';

type TranslationInput = NonNullable<CreateCategoryInput['translations']['en']>;

function translationRows(translations: Record<string, TranslationInput | undefined>) {
  const rows: Array<{ locale: Locale } & TranslationInput> = [];
  if (translations.en) rows.push({ locale: Locale.EN, ...translations.en });
  if (translations.ar) rows.push({ locale: Locale.AR, ...translations.ar });
  if (translations.ku) rows.push({ locale: Locale.KU, ...translations.ku });
  return rows;
}

export async function listCategories(query: ListCategoriesQuery) {
  const { page, pageSize, skip, take } = parsePagination(query);

  const filters: Prisma.CategoryWhereInput[] = [];
  if (query.type) filters.push({ type: query.type });
  if (query.isActive !== undefined) filters.push({ isActive: query.isActive });
  if (query.search) {
    const s = query.search;
    filters.push({
      OR: [
        { slug: { contains: s, mode: 'insensitive' } },
        { translations: { some: { name: { contains: s, mode: 'insensitive' } } } },
      ],
    });
  }
  const where: Prisma.CategoryWhereInput = filters.length ? { AND: filters } : {};

  const sortDir = query.sortDir ?? 'asc';
  const orderBy: Prisma.CategoryOrderByWithRelationInput =
    query.sortBy === 'createdAt'
      ? { createdAt: sortDir }
      : query.sortBy === 'name'
        ? { slug: sortDir }
        : { sortOrder: sortDir };

  const [total, items] = await Promise.all([
    prisma.category.count({ where }),
    prisma.category.findMany({ where, include: categoryInclude, orderBy, skip, take }),
  ]);

  return { items: items.map(serializeCategory), meta: buildPageMeta(page, pageSize, total) };
}

export async function getCategory(id: string) {
  const cat = await prisma.category.findUnique({ where: { id }, include: categoryInclude });
  if (!cat) throw new NotFoundError('Category not found');
  return serializeCategory(cat);
}

async function assertValidParent(parentId: string, selfId?: string) {
  if (selfId && parentId === selfId) throw new BadRequestError('A category cannot be its own parent');
  const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { id: true } });
  if (!parent) throw new BadRequestError('The selected parent category does not exist');
}

export async function createCategory(input: CreateCategoryInput) {
  if (input.parentId) await assertValidParent(input.parentId);
  const slug = await uniqueSlug(prisma, 'category', input.slug || input.translations.en.name);

  const cat = await prisma.category.create({
    data: {
      slug,
      type: input.type,
      parentId: input.parentId ?? null,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
      translations: { create: translationRows(input.translations) },
    },
    include: categoryInclude,
  });
  return serializeCategory(cat);
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const existing = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new NotFoundError('Category not found');
  if (input.parentId) await assertValidParent(input.parentId, id);

  const data: Prisma.CategoryUpdateInput = {};
  if (input.type !== undefined) data.type = input.type;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.parentId !== undefined) {
    data.parent = input.parentId ? { connect: { id: input.parentId } } : { disconnect: true };
  }
  if (input.slug !== undefined && input.slug.trim()) {
    data.slug = await uniqueSlug(prisma, 'category', input.slug, id);
  }

  await prisma.$transaction(async (tx) => {
    await tx.category.update({ where: { id }, data });
    if (input.translations) {
      for (const [key, fields] of Object.entries(input.translations)) {
        if (!fields) continue;
        const locale = key === 'ar' ? Locale.AR : key === 'ku' ? Locale.KU : Locale.EN;
        await tx.categoryTranslation.upsert({
          where: { categoryId_locale: { categoryId: id, locale } },
          update: fields,
          create: { categoryId: id, locale, ...(fields as TranslationInput) },
        });
      }
    }
  });

  return getCategory(id);
}

export async function deleteCategory(id: string) {
  const cat = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true, services: true, blogs: true } } },
  });
  if (!cat) throw new NotFoundError('Category not found');

  // Block deletion while content still references it, to avoid orphaning data.
  const linked = cat._count.products + cat._count.services + cat._count.blogs;
  if (linked > 0) {
    throw new ConflictError(`Cannot delete: ${linked} item(s) still use this category`);
  }

  await prisma.category.delete({ where: { id } });
  await deleteImageFiles([cat.imagePath, cat.imageWebpPath, cat.imageThumbPath, cat.imageThumbWebpPath]);
  return { id };
}

// ---- Single image ----
export async function setCategoryImage(id: string, file: Express.Multer.File) {
  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat) throw new NotFoundError('Category not found');

  const processed = await processImage(file.buffer, IMAGE_SUBDIR, file.mimetype);
  const oldPaths = [cat.imagePath, cat.imageWebpPath, cat.imageThumbPath, cat.imageThumbWebpPath];

  try {
    await prisma.category.update({
      where: { id },
      data: {
        imagePath: processed.path,
        imageWebpPath: processed.webpPath,
        imageThumbPath: processed.thumbnailPath,
        imageThumbWebpPath: processed.thumbnailWebpPath,
      },
    });
  } catch (err) {
    await deleteImageFiles([processed.path, processed.webpPath, processed.thumbnailPath, processed.thumbnailWebpPath]);
    throw err;
  }

  await deleteImageFiles(oldPaths); // remove the replaced image from disk
  return getCategory(id);
}

export async function deleteCategoryImage(id: string) {
  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat) throw new NotFoundError('Category not found');
  if (!cat.imagePath) return getCategory(id);

  await prisma.category.update({
    where: { id },
    data: { imagePath: null, imageWebpPath: null, imageThumbPath: null, imageThumbWebpPath: null },
  });
  await deleteImageFiles([cat.imagePath, cat.imageWebpPath, cat.imageThumbPath, cat.imageThumbWebpPath]);
  return getCategory(id);
}
