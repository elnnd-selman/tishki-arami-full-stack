import { Prisma, Locale } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, BadRequestError } from '../../lib/errors.js';
import { uniqueSlug } from '../../utils/slug.js';
import { buildPageMeta, parsePagination } from '../../utils/pagination.js';
import {
  processImage,
  deleteImageVariants,
  deleteImageFiles,
  type ProcessedImage,
} from '../../services/image.service.js';
import { productInclude, serializeProduct } from './product.serializer.js';
import type {
  CreateProductInput,
  UpdateProductInput,
  ListProductsQuery,
} from './product.schema.js';

const IMAGE_SUBDIR = 'products';

type TranslationInput = NonNullable<CreateProductInput['translations']['en']>;

// Build Prisma translation create rows from the locale-keyed input object.
function translationRows(translations: Record<string, TranslationInput | undefined>) {
  const rows: Array<{ locale: Locale } & TranslationInput> = [];
  if (translations.en) rows.push({ locale: Locale.EN, ...translations.en });
  if (translations.ar) rows.push({ locale: Locale.AR, ...translations.ar });
  if (translations.ku) rows.push({ locale: Locale.KU, ...translations.ku });
  return rows;
}

async function ensureCategoryExists(categoryId: string) {
  const cat = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!cat) throw new BadRequestError('The selected category does not exist');
}

async function ensureBrandExists(brandId: string) {
  const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } });
  if (!brand) throw new BadRequestError('The selected brand does not exist');
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function listProducts(query: ListProductsQuery) {
  const { page, pageSize, skip, take } = parsePagination(query);

  const filters: Prisma.ProductWhereInput[] = [];
  if (query.categoryId) filters.push({ categoryId: query.categoryId });
  if (query.brandId) filters.push({ brandId: query.brandId });
  if (query.status) filters.push({ status: query.status });
  if (query.isFeatured !== undefined) filters.push({ isFeatured: query.isFeatured });

  if (query.search) {
    const s = query.search;
    filters.push({
      OR: [
        { slug: { contains: s, mode: 'insensitive' } },
        { sku: { contains: s, mode: 'insensitive' } },
        // Matches translated name in ANY language.
        { translations: { some: { name: { contains: s, mode: 'insensitive' } } } },
        { translations: { some: { shortDescription: { contains: s, mode: 'insensitive' } } } },
      ],
    });
  }

  const where: Prisma.ProductWhereInput = filters.length ? { AND: filters } : {};

  const sortDir = query.sortDir ?? 'desc';
  let orderBy: Prisma.ProductOrderByWithRelationInput;
  switch (query.sortBy) {
    case 'price':
      orderBy = { price: sortDir };
      break;
    case 'sortOrder':
      orderBy = { sortOrder: sortDir };
      break;
    case 'updatedAt':
      orderBy = { updatedAt: sortDir };
      break;
    // Translated-name sort approximated by slug (slug derives from the English name).
    case 'name':
      orderBy = { slug: sortDir };
      break;
    default:
      orderBy = { createdAt: sortDir };
  }

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, include: productInclude, orderBy, skip, take }),
  ]);

  return {
    items: items.map(serializeProduct),
    meta: buildPageMeta(page, pageSize, total),
  };
}

export async function getProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id }, include: productInclude });
  if (!product) throw new NotFoundError('Product not found');
  return serializeProduct(product);
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({ where: { slug }, include: productInclude });
  if (!product) throw new NotFoundError('Product not found');
  return serializeProduct(product);
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export async function createProduct(input: CreateProductInput) {
  await ensureCategoryExists(input.categoryId);
  if (input.brandId) await ensureBrandExists(input.brandId);

  const slugBase = input.slug || input.translations.en.name;
  const slug = await uniqueSlug(prisma, 'product', slugBase);

  const product = await prisma.product.create({
    data: {
      slug,
      sku: input.sku ?? null,
      categoryId: input.categoryId,
      brandId: input.brandId ?? null,
      status: input.status,
      isFeatured: input.isFeatured ?? false,
      sortOrder: input.sortOrder ?? 0,
      price: input.price ?? null,
      currency: input.currency ?? 'USD',
      translations: { create: translationRows(input.translations) },
    },
    include: productInclude,
  });

  return serializeProduct(product);
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!existing) throw new NotFoundError('Product not found');

  if (input.categoryId) await ensureCategoryExists(input.categoryId);
  if (input.brandId) await ensureBrandExists(input.brandId);

  const data: Prisma.ProductUpdateInput = {};
  if (input.sku !== undefined) data.sku = input.sku;
  if (input.status !== undefined) data.status = input.status;
  if (input.isFeatured !== undefined) data.isFeatured = input.isFeatured;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.price !== undefined) data.price = input.price;
  if (input.currency !== undefined) data.currency = input.currency;
  if (input.categoryId !== undefined) data.category = { connect: { id: input.categoryId } };
  if (input.brandId !== undefined) {
    data.brand = input.brandId ? { connect: { id: input.brandId } } : { disconnect: true };
  }
  if (input.slug !== undefined && input.slug.trim()) {
    data.slug = await uniqueSlug(prisma, 'product', input.slug, id);
  }

  // Update scalar fields and upsert translations atomically.
  await prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data });

    if (input.translations) {
      for (const [key, fields] of Object.entries(input.translations)) {
        if (!fields) continue;
        const locale = key === 'ar' ? Locale.AR : key === 'ku' ? Locale.KU : Locale.EN;
        await tx.productTranslation.upsert({
          where: { productId_locale: { productId: id, locale } },
          update: fields,
          create: { productId: id, locale, ...(fields as TranslationInput) },
        });
      }
    }
  });

  return getProduct(id);
}

export async function deleteProduct(id: string) {
  // Capture image paths BEFORE deleting, because the cascade will remove the rows.
  const product = await prisma.product.findUnique({
    where: { id },
    include: { images: true },
  });
  if (!product) throw new NotFoundError('Product not found');

  // Delete the DB record first (cascade removes translations + image rows).
  await prisma.product.delete({ where: { id } });

  // Then remove every physical file so no orphan files remain on disk.
  await Promise.all(product.images.map((img) => deleteImageVariants(img)));

  return { id };
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

export async function addProductImages(
  productId: string,
  files: Express.Multer.File[],
) {
  if (!files || files.length === 0) throw new BadRequestError('No image files were provided');

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { images: { select: { id: true, isCover: true } } },
  });
  if (!product) throw new NotFoundError('Product not found');

  // Process every file first (validates + writes variants to disk).
  const processed: ProcessedImage[] = [];
  try {
    for (const file of files) {
      processed.push(await processImage(file.buffer, IMAGE_SUBDIR, file.mimetype));
    }
  } catch (err) {
    // Roll back any files already written before the failure.
    await Promise.all(processed.map((p) => deleteImageVariants(p)));
    throw err;
  }

  const hasCover = product.images.some((i) => i.isCover);
  const startOrder = product.images.length;

  try {
    await prisma.productImage.createMany({
      data: processed.map((p, idx) => ({
        productId,
        path: p.path,
        webpPath: p.webpPath,
        thumbnailPath: p.thumbnailPath,
        thumbnailWebpPath: p.thumbnailWebpPath,
        mimeType: p.mimeType,
        sizeBytes: p.sizeBytes,
        width: p.width,
        height: p.height,
        sortOrder: startOrder + idx,
        // First image of a product with no cover becomes the cover automatically.
        isCover: !hasCover && idx === 0,
      })),
    });
  } catch (err) {
    await Promise.all(processed.map((p) => deleteImageVariants(p)));
    throw err;
  }

  return getProduct(productId);
}

export async function replaceProductImage(
  productId: string,
  imageId: string,
  file: Express.Multer.File,
) {
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!image) throw new NotFoundError('Image not found for this product');

  const next = await processImage(file.buffer, IMAGE_SUBDIR, file.mimetype);

  try {
    await prisma.productImage.update({
      where: { id: imageId },
      data: {
        path: next.path,
        webpPath: next.webpPath,
        thumbnailPath: next.thumbnailPath,
        thumbnailWebpPath: next.thumbnailWebpPath,
        mimeType: next.mimeType,
        sizeBytes: next.sizeBytes,
        width: next.width,
        height: next.height,
      },
    });
  } catch (err) {
    await deleteImageVariants(next); // undo newly written files on failure
    throw err;
  }

  // Old files are now unreferenced - remove them from disk.
  await deleteImageVariants(image);

  return getProduct(productId);
}

export async function deleteProductImage(productId: string, imageId: string) {
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!image) throw new NotFoundError('Image not found for this product');

  await prisma.productImage.delete({ where: { id: imageId } });
  await deleteImageVariants(image);

  // If we removed the cover, promote the next image so a cover always exists.
  if (image.isCover) {
    const next = await prisma.productImage.findFirst({
      where: { productId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    if (next) {
      await prisma.productImage.update({ where: { id: next.id }, data: { isCover: true } });
    }
  }

  return getProduct(productId);
}

export async function setCoverImage(productId: string, imageId: string) {
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!image) throw new NotFoundError('Image not found for this product');

  await prisma.$transaction([
    prisma.productImage.updateMany({ where: { productId }, data: { isCover: false } }),
    prisma.productImage.update({ where: { id: imageId }, data: { isCover: true } }),
  ]);

  return getProduct(productId);
}

export async function updateImageAlt(productId: string, imageId: string, altText: string | null) {
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!image) throw new NotFoundError('Image not found for this product');
  await prisma.productImage.update({ where: { id: imageId }, data: { altText } });
  return getProduct(productId);
}

// Exposed for tests / cleanup tooling.
export { deleteImageFiles };
