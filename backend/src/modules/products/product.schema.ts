import { z } from 'zod';
import { PublishStatus } from '@prisma/client';

// One locale's worth of translatable product fields.
const translationFields = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  shortDescription: z.string().trim().max(500).optional().nullable(),
  description: z.string().trim().max(20000).optional().nullable(),
  metaTitle: z.string().trim().max(200).optional().nullable(),
  metaDescription: z.string().trim().max(400).optional().nullable(),
});

const optionalId = z.string().trim().min(1).optional().nullable();

export const createProductSchema = z.object({
  slug: z.string().trim().min(1).max(220).optional(),
  sku: z.string().trim().max(80).optional().nullable(),
  categoryId: z.string().trim().min(1, 'Category is required'),
  brandId: optionalId,
  status: z.nativeEnum(PublishStatus).optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  price: z.coerce.number().nonnegative('Price cannot be negative').optional().nullable(),
  currency: z.string().trim().length(3).optional(),
  // English is mandatory; Arabic and Kurdish are optional but validated when present.
  translations: z.object({
    en: translationFields,
    ar: translationFields.optional(),
    ku: translationFields.optional(),
  }),
});

export const updateProductSchema = z.object({
  slug: z.string().trim().min(1).max(220).optional(),
  sku: z.string().trim().max(80).optional().nullable(),
  categoryId: z.string().trim().min(1).optional(),
  brandId: optionalId,
  status: z.nativeEnum(PublishStatus).optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  price: z.coerce.number().nonnegative().optional().nullable(),
  currency: z.string().trim().length(3).optional(),
  translations: z
    .object({
      en: translationFields.optional(),
      ar: translationFields.optional(),
      ku: translationFields.optional(),
    })
    .optional(),
});

// List query params - all coerced from strings.
export const listProductsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  brandId: z.string().trim().optional(),
  status: z.nativeEnum(PublishStatus).optional(),
  isFeatured: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'sortOrder', 'price', 'name']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  locale: z.enum(['en', 'ar', 'ku']).optional(),
});

export const imageAltSchema = z.object({
  altText: z.string().trim().max(300).optional().nullable(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsSchema>;
