import { z } from 'zod';

const translationFields = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const createBrandSchema = z.object({
  slug: z.string().trim().min(1).max(220).optional(),
  website: z.string().trim().url('Must be a valid URL').max(300).optional().nullable().or(z.literal('')),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  translations: z.object({
    en: translationFields,
    ar: translationFields.optional(),
    ku: translationFields.optional(),
  }),
});

export const updateBrandSchema = z.object({
  slug: z.string().trim().min(1).max(220).optional(),
  website: z.string().trim().url('Must be a valid URL').max(300).optional().nullable().or(z.literal('')),
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

export const listBrandsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  sortBy: z.enum(['createdAt', 'sortOrder', 'name']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
export type ListBrandsQuery = z.infer<typeof listBrandsSchema>;
