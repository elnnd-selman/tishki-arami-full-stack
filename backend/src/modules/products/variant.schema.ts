import { z } from 'zod';

const attributeSchema = z.object({
  key: z.string().trim().min(1, 'Attribute key is required').max(80),
  value: z.string().trim().min(1, 'Attribute value is required').max(300),
});

// Ensures attribute keys are unique within a single variant.
function uniqueKeys(attrs: { key: string }[], ctx: z.RefinementCtx) {
  const seen = new Set<string>();
  attrs.forEach((a, i) => {
    const k = a.key.trim().toLowerCase();
    if (seen.has(k)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate attribute key: ${a.key}`,
        path: [i, 'key'],
      });
    }
    seen.add(k);
  });
}

export const createVariantSchema = z.object({
  sku: z.string().trim().max(80).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  attributes: z.array(attributeSchema).max(50).superRefine(uniqueKeys).optional(),
});

export const updateVariantSchema = z.object({
  sku: z.string().trim().max(80).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  // When provided, the attribute set is REPLACED with this list.
  attributes: z.array(attributeSchema).max(50).superRefine(uniqueKeys).optional(),
});

export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
