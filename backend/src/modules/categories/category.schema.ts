import { z } from 'zod';
import { CategoryType } from '@prisma/client';

const translationFields = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const createCategorySchema = z.object({
  slug: z.string().trim().min(1).max(220).optional(),
  type: z.nativeEnum(CategoryType).optional(),
  parentId: z.string().trim().min(1).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  translations: z.object({
    en: translationFields,
    ar: translationFields.optional(),
    ku: translationFields.optional(),
  }),
});

export const updateCategorySchema = z.object({
  slug: z.string().trim().min(1).max(220).optional(),
  type: z.nativeEnum(CategoryType).optional(),
  parentId: z.string().trim().min(1).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  translations: z
    .object({
      en: translationFields.optional(),
      ar: translationFields.optional(),
      ku: translationFields.optional(),
    })
    .optional(),
});

export const listCategoriesSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
  type: z.nativeEnum(CategoryType).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  sortBy: z.enum(['createdAt', 'sortOrder', 'name']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesSchema>;
