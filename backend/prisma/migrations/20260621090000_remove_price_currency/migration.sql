-- Remove price and currency from products and variants
ALTER TABLE "Product" DROP COLUMN IF EXISTS "price";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "currency";
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "price";
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "currency";
