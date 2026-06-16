/**
 * Removes all catalog CONTENT (products, brands, categories, services, projects,
 * blogs and their translations/images) while preserving users, roles and
 * permissions. Used to clear placeholder/demo data before re-seeding.
 *
 * This only deletes rows (cascades handle children) — it never drops the
 * database or touches the schema.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Children first where cascades don't cover everything; most are cascade-safe.
  await prisma.productImage.deleteMany();
  await prisma.projectImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.project.deleteMany();
  await prisma.blog.deleteMany();
  await prisma.service.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  console.log('Catalog content cleared (users/roles/permissions preserved).');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
