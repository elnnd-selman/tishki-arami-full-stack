import { PrismaClient, Locale, CategoryType, PublishStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  PERMISSION_DEFINITIONS,
  PERMISSIONS,
  type PermissionCode,
} from '../src/config/permissions.js';
import { processImage } from '../src/services/image.service.js';
import { nextImage } from './seed-images.js';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function localeOf(key: string): Locale {
  return key === 'ar' ? Locale.AR : key === 'ku' ? Locale.KU : Locale.EN;
}

type Tr = { name: string; shortDescription?: string; description?: string };
type Trs = Record<'en' | 'ar' | 'ku', Tr>;

// Build the four embedded-image columns for entities that carry a single image
// (Category / Service use the `image*` columns, Blog uses the `cover*` columns).
async function buildEmbeddedImage(
  query: string,
  subdir: string,
  prefix: 'image' | 'cover',
): Promise<Record<string, string>> {
  const buf = await nextImage(query);
  if (!buf) return {};
  const img = await processImage(buf, subdir);
  if (prefix === 'cover') {
    return {
      coverPath: img.path,
      coverWebpPath: img.webpPath,
      coverThumbPath: img.thumbnailPath,
      coverThumbWebpPath: img.thumbnailWebpPath,
    };
  }
  return {
    imagePath: img.path,
    imageWebpPath: img.webpPath,
    imageThumbPath: img.thumbnailPath,
    imageThumbWebpPath: img.thumbnailWebpPath,
  };
}

// Build a gallery image row (Product / Project) from a fetched photo.
async function buildGalleryRow(
  query: string,
  subdir: string,
  isCover: boolean,
  sortOrder: number,
  altText: string,
) {
  const buf = await nextImage(query);
  if (!buf) return null;
  const img = await processImage(buf, subdir);
  return {
    path: img.path,
    webpPath: img.webpPath,
    thumbnailPath: img.thumbnailPath,
    thumbnailWebpPath: img.thumbnailWebpPath,
    mimeType: img.mimeType,
    sizeBytes: img.sizeBytes,
    width: img.width,
    height: img.height,
    isCover,
    sortOrder,
    altText,
  };
}

// ---------------------------------------------------------------------------
// RBAC seed (unchanged)
// ---------------------------------------------------------------------------

async function seedPermissions() {
  for (const def of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { code: def.code },
      update: { group: def.group, description: def.description },
      create: { code: def.code, group: def.group, description: def.description },
    });
  }
  return prisma.permission.findMany();
}

async function seedRole(
  name: string,
  description: string,
  codes: PermissionCode[],
  isSystem: boolean,
) {
  const role = await prisma.role.upsert({
    where: { name },
    update: { description, isSystem },
    create: { name, description, isSystem },
  });
  const permissions = await prisma.permission.findMany({ where: { code: { in: codes } } });
  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
  await prisma.rolePermission.createMany({
    data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
    skipDuplicates: true,
  });
  return role;
}

async function seedUser(email: string, fullName: string, password: string, roleId: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { fullName, roleId },
    create: { email, fullName, passwordHash, roleId, isActive: true },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding permissions...');
  await seedPermissions();
  const allCodes = PERMISSION_DEFINITIONS.map((p) => p.code);

  console.log('Seeding roles...');
  const superAdmin = await seedRole('Super Admin', 'Full access to everything', allCodes, true);

  const editorCodes: PermissionCode[] = [
    PERMISSIONS.PRODUCT_VIEW, PERMISSIONS.PRODUCT_CREATE, PERMISSIONS.PRODUCT_UPDATE, PERMISSIONS.PRODUCT_UPLOAD,
    PERMISSIONS.CATEGORY_VIEW, PERMISSIONS.CATEGORY_CREATE, PERMISSIONS.CATEGORY_UPDATE,
    PERMISSIONS.BRAND_VIEW, PERMISSIONS.BRAND_CREATE, PERMISSIONS.BRAND_UPDATE, PERMISSIONS.BRAND_UPLOAD,
    PERMISSIONS.PROJECT_VIEW, PERMISSIONS.PROJECT_CREATE, PERMISSIONS.PROJECT_UPDATE, PERMISSIONS.PROJECT_UPLOAD,
    PERMISSIONS.SERVICE_VIEW, PERMISSIONS.SERVICE_CREATE, PERMISSIONS.SERVICE_UPDATE,
    PERMISSIONS.BLOG_VIEW, PERMISSIONS.BLOG_CREATE, PERMISSIONS.BLOG_UPDATE,
  ];
  await seedRole('Editor', 'Manage catalog content but cannot delete or manage users', editorCodes, true);
  const viewerCodes: PermissionCode[] = allCodes.filter((c) => c.endsWith('.view'));
  await seedRole('Viewer', 'Read-only access', viewerCodes, true);

  console.log('Seeding users...');
  const admin = await seedUser('admin@tishkiarami.com', 'Site Administrator', 'Admin@12345', superAdmin.id);
  const editorRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Editor' } });
  const viewerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Viewer' } });
  await seedUser('editor@tishkiarami.com', 'Content Editor', 'Editor@12345', editorRole.id);
  await seedUser('viewer@tishkiarami.com', 'Read Only', 'Viewer@12345', viewerRole.id);

  console.log('Seeding categories + brands...');
  const { categoryIds, brandIds } = await seedCatalogTaxonomy();

  console.log('Seeding products (with photos)...');
  await seedProducts(categoryIds, brandIds);

  console.log('Seeding services (with photos)...');
  await seedServices();

  console.log('Seeding projects (with photos)...');
  await seedProjects();

  console.log('Seeding blog posts (with photos)...');
  await seedBlogs(admin.id);

  console.log('\nSeed complete. Demo accounts:');
  console.table([
    { email: 'admin@tishkiarami.com', password: 'Admin@12345', role: 'Super Admin' },
    { email: 'editor@tishkiarami.com', password: 'Editor@12345', role: 'Editor' },
    { email: 'viewer@tishkiarami.com', password: 'Viewer@12345', role: 'Viewer' },
  ]);
}

// ---------------------------------------------------------------------------
// Categories + Brands
// ---------------------------------------------------------------------------

const PRODUCT_CATEGORIES: Array<{
  slug: string;
  imageQuery: string;
  tr: Record<'en' | 'ar' | 'ku', { name: string; description: string }>;
}> = [
  {
    slug: 'fire-extinguishers', imageQuery: 'fire extinguisher',
    tr: {
      en: { name: 'Fire Extinguishers', description: 'Portable and wheeled extinguishers for every fire class — dry powder, CO2, foam and wet chemical.' },
      ar: { name: 'طفايات الحريق', description: 'طفايات محمولة ومتنقلة لكل فئات الحريق — بودرة جافة، ثاني أكسيد الكربون، رغوة ومواد كيميائية.' },
      ku: { name: 'دەزگای کوژاندنەوەی ئاگر', description: 'دەزگای هەڵگیراو و چەرخدار بۆ هەموو پۆلێنەکانی ئاگر — پۆودەری وشک، CO2، کەف و کیمیایی.' },
    },
  },
  {
    slug: 'smoke-heat-detectors', imageQuery: 'smoke detector',
    tr: {
      en: { name: 'Smoke & Heat Detectors', description: 'Optical, ionisation and heat detectors that give the earliest possible warning of fire.' },
      ar: { name: 'كواشف الدخان والحرارة', description: 'كواشف بصرية وتأينية وحرارية تمنح أبكر إنذار ممكن بالحريق.' },
      ku: { name: 'دۆزەرەوەی دووکەڵ و گەرما', description: 'دۆزەرەوەی ئۆپتیکی و ئایۆنی و گەرما کە زووترین ئاگاداری ئاگر دەدەن.' },
    },
  },
  {
    slug: 'fire-alarm-systems', imageQuery: 'fire alarm',
    tr: {
      en: { name: 'Fire Alarm Systems', description: 'Addressable and conventional control panels, call points, sounders and beacons.' },
      ar: { name: 'أنظمة إنذار الحريق', description: 'لوحات تحكم عنونة وتقليدية، نقاط نداء، أجراس وأضواء تنبيه.' },
      ku: { name: 'سیستەمی ئاگادارکردنەوەی ئاگر', description: 'پانێڵی کۆنترۆڵی ناونیشاندار و ئاسایی، خاڵی بانگکردن، دەنگدەر و چرا.' },
    },
  },
  {
    slug: 'sprinkler-systems', imageQuery: 'fire sprinkler',
    tr: {
      en: { name: 'Sprinkler Systems', description: 'Automatic sprinkler heads, valves and pipework for reliable fire control.' },
      ar: { name: 'أنظمة الرشاشات', description: 'رؤوس رش أوتوماتيكية وصمامات وأنابيب للسيطرة الموثوقة على الحريق.' },
      ku: { name: 'سیستەمی پرژێنەر', description: 'سەری پرژێنەری ئۆتۆماتیک و ڤاڵف و بۆری بۆ کۆنترۆڵی متمانەپێکراوی ئاگر.' },
    },
  },
  {
    slug: 'hoses-hydrants', imageQuery: 'fire hose',
    tr: {
      en: { name: 'Hoses & Hydrants', description: 'Hose reels, landing valves, hydrants and couplings for first-response firefighting.' },
      ar: { name: 'الخراطيم وفوهات الحريق', description: 'بكرات خراطيم، صمامات، فوهات حريق ووصلات للاستجابة الأولى للحريق.' },
      ku: { name: 'لوولە و هایدرانت', description: 'لوولەی پێچراو، ڤاڵف، هایدرانت و پەیوەندی بۆ بەرپەرچدانەوەی یەکەمی ئاگر.' },
    },
  },
  {
    slug: 'emergency-lighting-signage', imageQuery: 'emergency exit sign',
    tr: {
      en: { name: 'Emergency Lighting & Signage', description: 'Maintained exit signs and emergency luminaires that keep escape routes visible.' },
      ar: { name: 'إضاءة ولافتات الطوارئ', description: 'لافتات خروج وإضاءة طوارئ تبقي مسارات الهروب واضحة.' },
      ku: { name: 'ڕووناکی و نیشانەی فریاگوزاری', description: 'نیشانەی دەرچوون و ڕووناکی فریاگوزاری کە ڕێگای دەرچوون ڕوون دەکاتەوە.' },
    },
  },
  {
    slug: 'suppression-systems', imageQuery: 'fire safety equipment',
    tr: {
      en: { name: 'Suppression Systems', description: 'Clean-agent (FM-200), kitchen and gas suppression systems for high-value spaces.' },
      ar: { name: 'أنظمة الإخماد', description: 'أنظمة إخماد بالغاز النظيف (FM-200) وأنظمة المطابخ للمساحات عالية القيمة.' },
      ku: { name: 'سیستەمی کوژاندنەوە', description: 'سیستەمی گازی پاک (FM-200) و چێشتخانە بۆ شوێنە بەنرخەکان.' },
    },
  },
  {
    slug: 'safety-equipment-ppe', imageQuery: 'firefighter helmet',
    tr: {
      en: { name: 'Safety Equipment & PPE', description: 'Helmets, fire blankets, protective clothing and rescue gear for crews and sites.' },
      ar: { name: 'معدات السلامة والوقاية', description: 'خوذ وبطانيات حريق وملابس واقية ومعدات إنقاذ للفرق والمواقع.' },
      ku: { name: 'ئامێری سەلامەتی و پاراستن', description: 'کڵاو، بەتانیی ئاگر، جلوبەرگی پاراستن و ئامێری ڕزگارکردن بۆ تیم و شوێنەکان.' },
    },
  },
];

const BRANDS: Array<{ slug: string; website: string; tr: Record<'en' | 'ar' | 'ku', { name: string; description: string }> }> = [
  { slug: 'naffco', website: 'https://www.naffco.com', tr: {
    en: { name: 'NAFFCO', description: 'World-leading manufacturer of firefighting equipment and protection systems.' },
    ar: { name: 'نافكو', description: 'شركة رائدة عالمياً في تصنيع معدات مكافحة الحرائق وأنظمة الحماية.' },
    ku: { name: 'نافکۆ', description: 'یەکێک لە گەورەترین بەرهەمهێنەری ئامێری کوژاندنەوەی ئاگر لە جیهان.' } } },
  { slug: 'honeywell', website: 'https://www.honeywell.com', tr: {
    en: { name: 'Honeywell', description: 'Global leader in detection, alarm and life-safety technology.' },
    ar: { name: 'هانيويل', description: 'شركة عالمية رائدة في تقنيات الكشف والإنذار وسلامة الأرواح.' },
    ku: { name: 'هانیوێڵ', description: 'پێشەنگی جیهانی لە تەکنەلۆژیای دۆزینەوە و ئاگاداری و سەلامەتی ژیان.' } } },
  { slug: 'bosch', website: 'https://www.boschsecurity.com', tr: {
    en: { name: 'Bosch', description: 'Reliable detection and alarm solutions engineered in Germany.' },
    ar: { name: 'بوش', description: 'حلول كشف وإنذار موثوقة مصممة في ألمانيا.' },
    ku: { name: 'بۆش', description: 'چارەسەری دۆزینەوە و ئاگاداری متمانەپێکراو لە ئەڵمانیا.' } } },
  { slug: 'siemens', website: 'https://www.siemens.com', tr: {
    en: { name: 'Siemens', description: 'Smart fire-safety and building-protection systems.' },
    ar: { name: 'سيمنز', description: 'أنظمة ذكية للسلامة من الحريق وحماية المباني.' },
    ku: { name: 'سیمنز', description: 'سیستەمی زیرەکی سەلامەتی ئاگر و پاراستنی بینا.' } } },
  { slug: 'tyco', website: 'https://www.tyco.com', tr: {
    en: { name: 'Tyco', description: 'Sprinkler, suppression and special-hazard fire systems.' },
    ar: { name: 'تايكو', description: 'أنظمة رشاشات وإخماد وحماية من المخاطر الخاصة.' },
    ku: { name: 'تایکۆ', description: 'سیستەمی پرژێنەر و کوژاندنەوە و مەترسیی تایبەت.' } } },
  { slug: 'kidde', website: 'https://www.kidde.com', tr: {
    en: { name: 'Kidde', description: 'Trusted extinguishers and clean-agent suppression worldwide.' },
    ar: { name: 'كيد', description: 'طفايات موثوقة وأنظمة إخماد بالغاز النظيف عالمياً.' },
    ku: { name: 'کید', description: 'دەزگای کوژاندنەوە و سیستەمی گازی پاکی متمانەپێکراو لە جیهان.' } } },
  { slug: 'notifier', website: 'https://www.notifier.com', tr: {
    en: { name: 'Notifier', description: 'Intelligent addressable fire-alarm control systems.' },
    ar: { name: 'نوتيفاير', description: 'أنظمة تحكم ذكية لإنذار الحريق بالعنونة.' },
    ku: { name: 'نۆتیفایەر', description: 'سیستەمی زیرەکی کۆنترۆڵی ئاگاداری ئاگری ناونیشاندار.' } } },
  { slug: 'viking', website: 'https://www.vikinggroupinc.com', tr: {
    en: { name: 'Viking', description: 'Sprinkler heads, valves and water-based fire protection.' },
    ar: { name: 'فايكنغ', description: 'رؤوس رشاشات وصمامات وأنظمة حماية مائية من الحريق.' },
    ku: { name: 'ڤایکینگ', description: 'سەری پرژێنەر و ڤاڵف و پاراستنی ئاوی لە ئاگر.' } } },
];

async function seedCatalogTaxonomy() {
  const categoryIds: Record<string, string> = {};
  let cOrder = 0;
  for (const c of PRODUCT_CATEGORIES) {
    let cat = await prisma.category.findUnique({ where: { slug: c.slug } });
    if (!cat) {
      const imageFields = await buildEmbeddedImage(c.imageQuery, 'categories', 'image');
      cat = await prisma.category.create({
        data: { slug: c.slug, type: CategoryType.PRODUCT, isActive: true, sortOrder: cOrder, ...imageFields },
      });
    }
    cOrder++;
    categoryIds[c.slug] = cat.id;
    for (const [k, val] of Object.entries(c.tr)) {
      await prisma.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: cat.id, locale: localeOf(k) } },
        update: { name: val.name, description: val.description },
        create: { categoryId: cat.id, locale: localeOf(k), name: val.name, description: val.description },
      });
    }
  }

  const brandIds: Record<string, string> = {};
  let bOrder = 0;
  for (const b of BRANDS) {
    const brand = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: { website: b.website },
      create: { slug: b.slug, website: b.website, isActive: true, sortOrder: bOrder },
    });
    bOrder++;
    brandIds[b.slug] = brand.id;
    for (const [k, val] of Object.entries(b.tr)) {
      await prisma.brandTranslation.upsert({
        where: { brandId_locale: { brandId: brand.id, locale: localeOf(k) } },
        update: { name: val.name, description: val.description },
        create: { brandId: brand.id, locale: localeOf(k), name: val.name, description: val.description },
      });
    }
  }

  return { categoryIds, brandIds };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

type SeedProduct = {
  slug: string;
  sku: string;
  category: string;
  brand: string;
  featured?: boolean;
  imageQuery: string;
  images?: number;
  tr: Trs;
  variants?: Array<{ sku: string; attrs: Record<string, string> }>;
};

const PRODUCTS: SeedProduct[] = [
  {
    slug: 'abc-dry-powder-extinguisher-6kg', sku: 'EXT-ABC-6', category: 'fire-extinguishers', brand: 'naffco',
 featured: true, imageQuery: 'fire extinguisher', images: 3,
    tr: {
      en: { name: 'ABC Dry Powder Extinguisher 6kg', shortDescription: 'Multi-purpose powder extinguisher for Class A, B and C fires.', description: 'A versatile 6kg ABC dry powder extinguisher suitable for solid, liquid and gas fires. Corrosion-resistant cylinder, squeeze-grip operation and a pressure gauge for at-a-glance readiness. CE marked and rated for commercial and industrial use.' },
      ar: { name: 'طفاية بودرة جافة ABC وزن 6 كغ', shortDescription: 'طفاية بودرة متعددة الأغراض لحرائق الفئات A وB وC.', description: 'طفاية بودرة جافة ABC وزن 6 كغ مناسبة لحرائق المواد الصلبة والسائلة والغازية. أسطوانة مقاومة للتآكل ومقياس ضغط للجاهزية الفورية. تحمل علامة CE للاستخدام التجاري والصناعي.' },
      ku: { name: 'دەزگای پۆودەری وشک ABC ٦ کگ', shortDescription: 'دەزگای پۆودەری فرەمەبەست بۆ ئاگری پۆلی A، B و C.', description: 'دەزگایەکی پۆودەری وشکی ABC ی ٦ کگ گونجاو بۆ ئاگری ماددەی ڕەق و شل و گاز. سیلندری بەرگری لە ژەنگ و پێوەری گوشار بۆ ئامادەیی خێرا. نیشانەی CE ی هەیە بۆ بەکارهێنانی بازرگانی و پیشەسازی.' },
    },
    variants: [
      { sku: 'EXT-ABC-2', attrs: { Capacity: '2 kg', 'Fire Rating': '8A 34B C' } },
      { sku: 'EXT-ABC-6', attrs: { Capacity: '6 kg', 'Fire Rating': '27A 183B C' } },
      { sku: 'EXT-ABC-9', attrs: { Capacity: '9 kg', 'Fire Rating': '43A 233B C' } },
    ],
  },
  {
    slug: 'co2-extinguisher-5kg', sku: 'EXT-CO2-5', category: 'fire-extinguishers', brand: 'kidde',
 featured: true, imageQuery: 'fire extinguisher', images: 2,
    tr: {
      en: { name: 'CO2 Fire Extinguisher 5kg', shortDescription: 'Clean, residue-free extinguisher for electrical and Class B fires.', description: 'A 5kg carbon-dioxide extinguisher ideal for server rooms, switchgear and flammable liquids. Leaves no residue, with a frost-free horn and ergonomic handle for safe discharge.' },
      ar: { name: 'طفاية ثاني أكسيد الكربون 5 كغ', shortDescription: 'طفاية نظيفة بدون بقايا للحرائق الكهربائية والفئة B.', description: 'طفاية ثاني أكسيد الكربون 5 كغ مثالية لغرف الخوادم ولوحات الكهرباء والسوائل القابلة للاشتعال. لا تترك بقايا، مع بوق مضاد للصقيع ومقبض مريح.' },
      ku: { name: 'دەزگای CO2 ی ٥ کگ', shortDescription: 'دەزگای پاک و بێ پاشماوە بۆ ئاگری کارەبایی و پۆلی B.', description: 'دەزگای دووکسیدی کاربۆنی ٥ کگ نایاب بۆ ژووری سێرڤەر و کارەبا و شلەی ئاگرگرتوو. هیچ پاشماوەیەک ناهێڵێتەوە، لەگەڵ بۆڕی دژە سەهۆڵ و دەسکی ئاسوودە.' },
    },
  },
  {
    slug: 'foam-extinguisher-9l', sku: 'EXT-FOAM-9', category: 'fire-extinguishers', brand: 'naffco',
 imageQuery: 'fire extinguisher', images: 2,
    tr: {
      en: { name: 'AFFF Foam Extinguisher 9L', shortDescription: 'Aqueous film-forming foam for Class A and B fires.', description: 'A 9-litre AFFF foam extinguisher that smothers flames and seals flammable-liquid surfaces to prevent re-ignition. Excellent for warehouses, garages and fuel stores.' },
      ar: { name: 'طفاية رغوة AFFF سعة 9 لتر', shortDescription: 'رغوة مائية للحرائق من الفئتين A وB.', description: 'طفاية رغوة AFFF سعة 9 لتر تخمد اللهب وتغلق أسطح السوائل القابلة للاشتعال لمنع إعادة الاشتعال. ممتازة للمستودعات والكراجات ومخازن الوقود.' },
      ku: { name: 'دەزگای کەفی AFFF ٩ لیتر', shortDescription: 'کەفی ئاوی بۆ ئاگری پۆلی A و B.', description: 'دەزگای کەفی AFFF ی ٩ لیتری کە گڕ دەکوژێنێتەوە و ڕووی شلە ئاگرگرەکان دادەخات بۆ ڕێگریکردن لە دووبارە گڕگرتنەوە. باشە بۆ کۆگا و گاراج و کۆگای سووتەمەنی.' },
    },
  },
  {
    slug: 'wet-chemical-extinguisher-6l', sku: 'EXT-WET-6', category: 'fire-extinguishers', brand: 'tyco',
 imageQuery: 'fire extinguisher', images: 2,
    tr: {
      en: { name: 'Wet Chemical Extinguisher 6L', shortDescription: 'Class F protection for cooking-oil and fat fires.', description: 'A 6-litre wet chemical extinguisher engineered for commercial kitchens. Cools and seals burning oils and fats, with a long lance for safe application from distance.' },
      ar: { name: 'طفاية كيميائية رطبة 6 لتر', shortDescription: 'حماية من الفئة F لحرائق زيوت الطهي والدهون.', description: 'طفاية كيميائية رطبة سعة 6 لتر مصممة للمطابخ التجارية. تبرّد وتغلق الزيوت والدهون المشتعلة، مع أنبوب طويل للتطبيق الآمن من مسافة.' },
      ku: { name: 'دەزگای کیمیایی تەڕ ٦ لیتر', shortDescription: 'پاراستنی پۆلی F بۆ ئاگری ڕۆن و چەوری چێشتلێنان.', description: 'دەزگای کیمیایی تەڕی ٦ لیتری بۆ چێشتخانەی بازرگانی. ڕۆن و چەوری ئاگرگرتوو سارد دەکاتەوە و دایدەخات، لەگەڵ لوولەیەکی درێژ بۆ بەکارهێنانی سەلامەت لە دوورەوە.' },
    },
  },
  {
    slug: 'optical-smoke-detector', sku: 'DET-OPT-1', category: 'smoke-heat-detectors', brand: 'honeywell',
 featured: true, imageQuery: 'smoke detector', images: 2,
    tr: {
      en: { name: 'Optical Smoke Detector', shortDescription: 'Photoelectric detector with fast response to smouldering fires.', description: 'A photoelectric optical smoke detector that responds quickly to slow, smouldering fires common in homes and offices. Low-profile design, drift compensation and a clear status LED.' },
      ar: { name: 'كاشف دخان بصري', shortDescription: 'كاشف ضوئي باستجابة سريعة للحرائق المشتعلة ببطء.', description: 'كاشف دخان بصري كهروضوئي يستجيب بسرعة للحرائق البطيئة الشائعة في المنازل والمكاتب. تصميم منخفض وتعويض الانحراف ومؤشر LED واضح.' },
      ku: { name: 'دۆزەرەوەی دووکەڵی ئۆپتیکی', shortDescription: 'دۆزەرەوەی ڕووناکی بە وەڵامدانەوەی خێرا بۆ ئاگری هێواش.', description: 'دۆزەرەوەی دووکەڵی ئۆپتیکی کە بە خێرایی وەڵامی ئاگری هێواش دەداتەوە کە لە ماڵ و ئۆفیس باوە. دیزاینی نزم و پاکسازی لادان و LED ی ڕوون.' },
    },
  },
  {
    slug: 'rate-of-rise-heat-detector', sku: 'DET-HEAT-1', category: 'smoke-heat-detectors', brand: 'bosch',
 imageQuery: 'smoke detector', images: 1,
    tr: {
      en: { name: 'Rate-of-Rise Heat Detector', shortDescription: 'Reliable detection where smoke detectors are unsuitable.', description: 'A rate-of-rise heat detector for kitchens, garages and dusty areas where smoke detectors would false-alarm. Triggers on rapid temperature increase or a fixed threshold.' },
      ar: { name: 'كاشف حرارة بمعدل الارتفاع', shortDescription: 'كشف موثوق حيث لا تصلح كواشف الدخان.', description: 'كاشف حرارة بمعدل الارتفاع للمطابخ والكراجات والمناطق المغبرّة حيث تطلق كواشف الدخان إنذارات كاذبة. يعمل عند الارتفاع السريع للحرارة أو عتبة ثابتة.' },
      ku: { name: 'دۆزەرەوەی گەرمای بەرزبوونەوە', shortDescription: 'دۆزینەوەی متمانەپێکراو لەو شوێنانەی دۆزەرەوەی دووکەڵ ناگونجێ.', description: 'دۆزەرەوەی گەرمای بەرزبوونەوە بۆ چێشتخانە و گاراج و ناوچە تۆزاوییەکان. کاردەکات لە بەرزبوونەوەی خێرای پلەی گەرمی یان سنوورێکی جێگیر.' },
    },
  },
  {
    slug: 'multi-sensor-detector', sku: 'DET-MULTI-1', category: 'smoke-heat-detectors', brand: 'siemens',
 featured: true, imageQuery: 'smoke detector', images: 2,
    tr: {
      en: { name: 'Combined Smoke & Heat Detector', shortDescription: 'Multi-sensor head for accurate detection with fewer false alarms.', description: 'A combined optical and heat multi-sensor detector that intelligently weighs both signals to detect real fires faster while rejecting steam, dust and cooking fumes.' },
      ar: { name: 'كاشف دخان وحرارة مدمج', shortDescription: 'رأس متعدد المستشعرات لكشف دقيق وإنذارات كاذبة أقل.', description: 'كاشف متعدد المستشعرات يجمع بين البصري والحراري ويوازن الإشارتين بذكاء لاكتشاف الحرائق الحقيقية بأسرع وقت مع تجاهل البخار والغبار وأبخرة الطهي.' },
      ku: { name: 'دۆزەرەوەی تێکەڵی دووکەڵ و گەرما', shortDescription: 'سەری فرە-هەستەوەر بۆ دۆزینەوەی ورد و ئاگاداری هەڵەی کەمتر.', description: 'دۆزەرەوەیەکی فرە-هەستەوەری ئۆپتیکی و گەرما کە بە زیرەکی هەردوو ئاماژە هەڵدەسەنگێنێ بۆ دۆزینەوەی خێراتری ئاگری ڕاستەقینە و ڕەتکردنەوەی هەڵم و تۆز و دووکەڵی چێشتلێنان.' },
    },
  },
  {
    slug: 'addressable-control-panel', sku: 'PNL-ADR-2', category: 'fire-alarm-systems', brand: 'notifier',
 featured: true, imageQuery: 'fire alarm panel', images: 2,
    tr: {
      en: { name: 'Addressable Fire Alarm Panel', shortDescription: '2-loop intelligent panel addressing up to 318 devices.', description: 'A 2-loop addressable fire alarm control panel supporting up to 318 devices with pinpoint location reporting, cause-and-effect programming and a backlit display. The backbone of any modern fire system.' },
      ar: { name: 'لوحة إنذار حريق بالعنونة', shortDescription: 'لوحة ذكية بحلقتين تدعم حتى 318 جهازاً.', description: 'لوحة تحكم إنذار حريق بالعنونة بحلقتين تدعم حتى 318 جهازاً مع تحديد دقيق للموقع وبرمجة السبب والأثر وشاشة مضيئة. العمود الفقري لأي نظام حريق حديث.' },
      ku: { name: 'پانێڵی ناونیشانداری ئاگادارکردنەوە', shortDescription: 'پانێڵی زیرەکی ٢-لووپ بۆ ٣١٨ ئامێر.', description: 'پانێڵی کۆنترۆڵی ئاگادارکردنەوەی ناونیشانداری ٢-لووپ کە پشتگیری ٣١٨ ئامێر دەکات لەگەڵ ڕاپۆرتی وردی شوێن و پڕۆگرامسازی هۆ-و-کاریگەری و پیشاندەری ڕووناک.' },
    },
  },
  {
    slug: 'conventional-8-zone-panel', sku: 'PNL-CONV-8', category: 'fire-alarm-systems', brand: 'honeywell',
 imageQuery: 'fire alarm panel', images: 1,
    tr: {
      en: { name: 'Conventional 8-Zone Panel', shortDescription: 'Cost-effective panel for small and medium buildings.', description: 'An 8-zone conventional fire alarm panel with integrated battery charger, fault monitoring and simple commissioning — ideal for shops, clinics and small offices.' },
      ar: { name: 'لوحة تقليدية 8 مناطق', shortDescription: 'لوحة اقتصادية للمباني الصغيرة والمتوسطة.', description: 'لوحة إنذار حريق تقليدية بـ 8 مناطق مع شاحن بطارية مدمج ومراقبة الأعطال وتشغيل بسيط — مثالية للمحلات والعيادات والمكاتب الصغيرة.' },
      ku: { name: 'پانێڵی ئاسایی ٨ ناوچە', shortDescription: 'پانێڵی کەم تێچوو بۆ بینای بچووک و مامناوەند.', description: 'پانێڵی ئاگادارکردنەوەی ئاسایی ٨ ناوچە لەگەڵ شارژەری باتری و چاودێری کێشە و دامەزراندنی سادە — نایاب بۆ دوکان و نەخۆشخانە و ئۆفیسی بچووک.' },
    },
  },
  {
    slug: 'manual-call-point', sku: 'MCP-BG-1', category: 'fire-alarm-systems', brand: 'bosch',
 imageQuery: 'fire alarm', images: 1,
    tr: {
      en: { name: 'Manual Call Point', shortDescription: 'Break-glass call point for instant manual alarm.', description: 'A resettable break-glass manual call point that lets occupants raise the alarm instantly. Weather-resistant variants available for outdoor and stairwell use.' },
      ar: { name: 'نقطة نداء يدوية', shortDescription: 'نقطة نداء بكسر الزجاج للإنذار اليدوي الفوري.', description: 'نقطة نداء يدوية قابلة لإعادة الضبط بكسر الزجاج تتيح للأشخاص إطلاق الإنذار فوراً. تتوفر إصدارات مقاومة للطقس للاستخدام الخارجي وفي السلالم.' },
      ku: { name: 'خاڵی بانگکردنی دەستی', shortDescription: 'خاڵی شکاندنی شووشە بۆ ئاگاداری دەستیی خێرا.', description: 'خاڵی بانگکردنی دەستی شکاندنی شووشە کە ڕێگە بە خەڵک دەدات یەکسەر ئاگاداری بدەن. جۆری بەرگری لە کەشوهەوا بەردەستە بۆ دەرەوە و قاتەکان.' },
    },
  },
  {
    slug: 'sounder-beacon', sku: 'SND-BCN-1', category: 'fire-alarm-systems', brand: 'siemens',
 imageQuery: 'fire alarm', images: 1,
    tr: {
      en: { name: 'Combined Sounder & Beacon', shortDescription: '100dB sounder with high-intensity strobe.', description: 'A combined sounder and beacon delivering a 100dB alarm tone with a bright synchronised strobe for clear notification in noisy or hearing-impaired environments.' },
      ar: { name: 'جرس وضوء تنبيه مدمج', shortDescription: 'جرس 100 ديسيبل مع ضوء وامض عالي الشدة.', description: 'جرس وضوء تنبيه مدمج يصدر نغمة إنذار 100 ديسيبل مع ضوء وامض متزامن للتنبيه الواضح في البيئات الصاخبة أو لضعاف السمع.' },
      ku: { name: 'دەنگدەر و چرای تێکەڵ', shortDescription: 'دەنگدەری ١٠٠ دیسیبڵ لەگەڵ چرای بەهێز.', description: 'دەنگدەر و چرای تێکەڵ کە دەنگی ئاگاداری ١٠٠ دیسیبڵ دەردەکات لەگەڵ چرایەکی ڕووناکی هاوکات بۆ ئاگاداری ڕوون لە ژینگەی دەنگدار.' },
    },
  },
  {
    slug: 'pendent-sprinkler-head', sku: 'SPK-PEN-1', category: 'sprinkler-systems', brand: 'viking',
 featured: true, imageQuery: 'fire sprinkler', images: 2,
    tr: {
      en: { name: 'Pendent Sprinkler Head', shortDescription: 'Quick-response glass-bulb sprinkler, 68°C.', description: 'A quick-response pendent sprinkler head with a 68°C glass bulb and chrome finish. Factory-tested for reliable activation and even water distribution across the protected area.' },
      ar: { name: 'رأس رشاش معلق', shortDescription: 'رشاش سريع الاستجابة بأنبوب زجاجي، 68 درجة مئوية.', description: 'رأس رشاش معلق سريع الاستجابة بأنبوب زجاجي 68 درجة مئوية وطلاء كروم. مُختبر مصنعياً لتفعيل موثوق وتوزيع متساوٍ للماء على المنطقة المحمية.' },
      ku: { name: 'سەری پرژێنەری هەڵواسراو', shortDescription: 'پرژێنەری وەڵامدانەوەی خێرا بە گڵۆپی شووشە، ٦٨°س.', description: 'سەری پرژێنەری هەڵواسراوی وەڵامدانەوەی خێرا لەگەڵ گڵۆپی شووشەی ٦٨°س و ڕەنگی کرۆم. لە کارگە تاقیکراوەتەوە بۆ چالاکبوونی متمانەپێکراو و دابەشکردنی یەکسانی ئاو.' },
    },
  },
  {
    slug: 'wet-riser-valve', sku: 'SPK-WRV-1', category: 'sprinkler-systems', brand: 'tyco',
 imageQuery: 'fire sprinkler', images: 1,
    tr: {
      en: { name: 'Wet Riser Alarm Valve', shortDescription: 'Flanged alarm valve for wet sprinkler systems.', description: 'A flanged wet alarm valve that holds water under pressure and triggers a water-motor alarm on flow. Includes trim set and retard chamber for false-alarm prevention.' },
      ar: { name: 'صمام إنذار للأنابيب الرطبة', shortDescription: 'صمام إنذار بشفة لأنظمة الرشاشات الرطبة.', description: 'صمام إنذار رطب بشفة يحفظ الماء تحت الضغط ويشغّل إنذاراً مائياً عند التدفق. يتضمن مجموعة تركيب وغرفة تأخير لمنع الإنذارات الكاذبة.' },
      ku: { name: 'ڤاڵفی ئاگاداری بۆری تەڕ', shortDescription: 'ڤاڵفی ئاگاداری فلانجدار بۆ سیستەمی پرژێنەری تەڕ.', description: 'ڤاڵفی ئاگاداری تەڕی فلانجدار کە ئاو لەژێر گوشاردا دەپارێزێ و ئاگاداری ئاوی هەڵدەستێنێ کاتی ڕۆیشتن. کۆمەڵە تریم و ژووری دواخستن لەخۆدەگرێ.' },
    },
  },
  {
    slug: 'fire-hose-reel-30m', sku: 'HOSE-RL-30', category: 'hoses-hydrants', brand: 'naffco',
 featured: true, imageQuery: 'fire hose reel', images: 2,
    tr: {
      en: { name: 'Fire Hose Reel 30m', shortDescription: 'Swinging hose reel with 30m of 19mm hose.', description: 'A wall-mounted swinging fire hose reel with 30 metres of 19mm rubber hose and an adjustable jet/spray nozzle. Powder-coated steel drum for years of dependable service.' },
      ar: { name: 'بكرة خرطوم حريق 30 م', shortDescription: 'بكرة خرطوم متأرجحة بطول 30 م وقطر 19 مم.', description: 'بكرة خرطوم حريق متأرجحة مثبتة على الجدار بطول 30 متراً وخرطوم مطاطي 19 مم وفوهة قابلة للتعديل. أسطوانة فولاذية مطلية للخدمة الموثوقة لسنوات.' },
      ku: { name: 'لوولەپێچی ئاگر ٣٠م', shortDescription: 'لوولەپێچی جوڵاو بە ٣٠م لوولەی ١٩مم.', description: 'لوولەپێچی ئاگری جوڵاوی دیوار-هەڵواسراو لەگەڵ ٣٠ مەتر لوولەی لاستیکی ١٩مم و لوولەسەری گۆڕانکار. ئەسپێنی پۆڵای ڕەنگکراو بۆ خزمەتی متمانەپێکراوی ساڵان.' },
    },
  },
  {
    slug: 'landing-valve-hydrant', sku: 'HYD-LV-1', category: 'hoses-hydrants', brand: 'naffco',
 imageQuery: 'fire hydrant', images: 1,
    tr: {
      en: { name: 'Landing Valve & Hydrant', shortDescription: 'Oblique landing valve for wet and dry risers.', description: 'A 2.5-inch oblique landing valve with instantaneous outlet for fire-brigade connection on wet and dry rising mains. Gunmetal body and cap with chain.' },
      ar: { name: 'صمام إنزال وفوهة حريق', shortDescription: 'صمام إنزال مائل للأنابيب الرطبة والجافة.', description: 'صمام إنزال مائل 2.5 بوصة بمخرج فوري لتوصيل فرق الإطفاء على الأنابيب الصاعدة الرطبة والجافة. جسم وغطاء من المعدن مع سلسلة.' },
      ku: { name: 'ڤاڵفی داگرتن و هایدرانت', shortDescription: 'ڤاڵفی داگرتنی لار بۆ بۆری تەڕ و وشک.', description: 'ڤاڵفی داگرتنی لاری ٢.٥ ئینچ لەگەڵ دەرچوونی خێرا بۆ پەیوەندی تیمی ئاگرکوژێنەوە. لەشی گەنمەتاڵ و سەرپۆش لەگەڵ زنجیر.' },
    },
  },
  {
    slug: 'led-emergency-exit-sign', sku: 'EML-EXIT-1', category: 'emergency-lighting-signage', brand: 'honeywell',
 imageQuery: 'emergency exit sign', images: 2,
    tr: {
      en: { name: 'LED Emergency Exit Sign', shortDescription: 'Maintained running-man exit sign, 3-hour backup.', description: 'A slim LED running-man exit sign with maintained/non-maintained operation and a 3-hour battery backup. Double-sided blades and pictograms included for any mounting position.' },
      ar: { name: 'لافتة خروج طوارئ LED', shortDescription: 'لافتة خروج مضيئة مع احتياطي 3 ساعات.', description: 'لافتة خروج LED نحيفة بتشغيل دائم/غير دائم واحتياطي بطارية 3 ساعات. تتضمن شفرات مزدوجة الجوانب ورموزاً لأي وضع تركيب.' },
      ku: { name: 'نیشانەی دەرچوونی فریاگوزاری LED', shortDescription: 'نیشانەی دەرچوونی ڕووناک، یەدەکی ٣ کاتژمێر.', description: 'نیشانەی دەرچوونی LED ی باریک لەگەڵ کارکردنی بەردەوام/نا-بەردەوام و یەدەکی باتری ٣ کاتژمێر. تەختەی دوولایەن و وێنۆچکە لەخۆدەگرێ بۆ هەر شوێنێکی دانان.' },
    },
  },
  {
    slug: 'emergency-bulkhead-light', sku: 'EML-BLK-1', category: 'emergency-lighting-signage', brand: 'bosch',
 imageQuery: 'emergency light', images: 1,
    tr: {
      en: { name: 'Emergency Bulkhead Light', shortDescription: 'IP65 maintained luminaire for escape routes.', description: 'A robust IP65-rated emergency bulkhead luminaire for corridors, stairwells and external escape routes. Self-test versions available to automate compliance checks.' },
      ar: { name: 'إضاءة طوارئ محصّنة', shortDescription: 'وحدة إضاءة IP65 لمسارات الهروب.', description: 'وحدة إضاءة طوارئ محصّنة بتصنيف IP65 للممرات والسلالم ومسارات الهروب الخارجية. تتوفر نسخ ذاتية الاختبار لأتمتة فحوص الامتثال.' },
      ku: { name: 'ڕووناکی فریاگوزاری بەرگریکراو', shortDescription: 'ڕووناکی IP65 بۆ ڕێگای دەرچوون.', description: 'ڕووناکی فریاگوزاری بەهێزی پۆلی IP65 بۆ ڕێڕەو و قات و ڕێگای دەرچوونی دەرەوە. وەشانی خۆ-تاقیکردنەوە بەردەستە بۆ ئۆتۆماتیککردنی پشکنینی پابەندبوون.' },
    },
  },
  {
    slug: 'fm200-clean-agent-system', sku: 'SUP-FM200-1', category: 'suppression-systems', brand: 'kidde',
 featured: true, imageQuery: 'fire suppression system', images: 2,
    tr: {
      en: { name: 'FM-200 Clean Agent System', shortDescription: 'Waterless gas suppression for critical rooms.', description: 'A complete FM-200 (HFC-227ea) clean-agent suppression system that extinguishes fire in seconds without water or residue. Ideal for data centres, archives and electrical rooms.' },
      ar: { name: 'نظام إخماد بالغاز النظيف FM-200', shortDescription: 'إخماد غازي بدون ماء للغرف الحرجة.', description: 'نظام إخماد كامل بالغاز النظيف FM-200 (HFC-227ea) يخمد الحريق في ثوانٍ دون ماء أو بقايا. مثالي لمراكز البيانات والأرشيف والغرف الكهربائية.' },
      ku: { name: 'سیستەمی گازی پاکی FM-200', shortDescription: 'کوژاندنەوەی گازی بێ ئاو بۆ ژووری گرنگ.', description: 'سیستەمێکی تەواوی کوژاندنەوەی گازی پاکی FM-200 (HFC-227ea) کە ئاگر لە چەند چرکەیەکدا دەکوژێنێتەوە بەبێ ئاو یان پاشماوە. نایاب بۆ سەنتەری داتا و ئەرشیف و ژووری کارەبا.' },
    },
  },
  {
    slug: 'kitchen-suppression-system', sku: 'SUP-KIT-1', category: 'suppression-systems', brand: 'tyco',
 imageQuery: 'commercial kitchen', images: 1,
    tr: {
      en: { name: 'Kitchen Suppression System', shortDescription: 'Wet-chemical system for commercial cooking lines.', description: 'A pre-engineered wet-chemical suppression system protecting hoods, ducts and cooking appliances. Automatic detection with manual pull-station and gas shut-off interface.' },
      ar: { name: 'نظام إخماد المطابخ', shortDescription: 'نظام كيميائي رطب لخطوط الطهي التجارية.', description: 'نظام إخماد كيميائي رطب مُهندس مسبقاً يحمي الشفاطات والمجاري وأجهزة الطهي. كشف أوتوماتيكي مع محطة سحب يدوية وواجهة لقطع الغاز.' },
      ku: { name: 'سیستەمی کوژاندنەوەی چێشتخانە', shortDescription: 'سیستەمی کیمیایی تەڕ بۆ هێڵی چێشتلێنانی بازرگانی.', description: 'سیستەمی کوژاندنەوەی کیمیایی تەڕی پێش-ئەندازیاریکراو کە پارێزگاری لە سەرپۆش و کەناڵ و ئامێری چێشتلێنان دەکات. دۆزینەوەی ئۆتۆماتیک لەگەڵ ستەیشنی دەستی و ڕووکاری کوژاندنەوەی گاز.' },
    },
  },
  {
    slug: 'firefighter-ppe-kit', sku: 'PPE-KIT-1', category: 'safety-equipment-ppe', brand: 'naffco',
 featured: true, imageQuery: 'firefighter helmet', images: 3,
    tr: {
      en: { name: 'Firefighter PPE Kit', shortDescription: 'Helmet, gloves, hood and turnout coat set.', description: 'A complete firefighter personal protective equipment kit including an EN-certified helmet, flash hood, structural gloves and a flame-resistant turnout coat. Sized for professional and volunteer crews.' },
      ar: { name: 'طقم معدات وقاية لرجل الإطفاء', shortDescription: 'خوذة وقفازات وغطاء رأس وسترة إطفاء.', description: 'طقم كامل من معدات الوقاية الشخصية لرجل الإطفاء يشمل خوذة معتمدة EN وغطاء رأس وقفازات هيكلية وسترة إطفاء مقاومة للهب. بمقاسات للفرق المحترفة والمتطوعة.' },
      ku: { name: 'کیتی پاراستنی ئاگرکوژێنەوە', shortDescription: 'کڵاو و دەستکێش و سەرپۆش و کۆتی ئاگرکوژێنەوە.', description: 'کیتێکی تەواوی ئامێری پاراستنی کەسی ئاگرکوژێنەوە کە کڵاوی پەسەندکراوی EN و سەرپۆش و دەستکێشی پێکهاتەیی و کۆتی بەرگری لە گڕ لەخۆدەگرێ. بە قەبارەی جیاواز بۆ تیمی پیشەیی و خۆبەخش.' },
    },
  },
];

// Extra variants keyed by product slug, so most products show a variant selector.
const EXTRA_VARIANTS: Record<string, Array<{ sku: string; attrs: Record<string, string> }>> = {
  'co2-extinguisher-5kg': [
    { sku: 'EXT-CO2-2', attrs: { Capacity: '2 kg', 'Fire Rating': '34B' } },
    { sku: 'EXT-CO2-5', attrs: { Capacity: '5 kg', 'Fire Rating': '89B' } },
  ],
  'foam-extinguisher-9l': [
    { sku: 'EXT-FOAM-6', attrs: { Capacity: '6 L', 'Fire Rating': '21A 144B' } },
    { sku: 'EXT-FOAM-9', attrs: { Capacity: '9 L', 'Fire Rating': '27A 183B' } },
  ],
  'wet-chemical-extinguisher-6l': [
    { sku: 'EXT-WET-3', attrs: { Capacity: '3 L', 'Fire Rating': '13A 40F' } },
    { sku: 'EXT-WET-6', attrs: { Capacity: '6 L', 'Fire Rating': '25A 75F' } },
  ],
  'optical-smoke-detector': [
    { sku: 'DET-OPT-CONV', attrs: { Type: 'Conventional', Mount: 'Ceiling' } },
    { sku: 'DET-OPT-ADR', attrs: { Type: 'Addressable', Mount: 'Ceiling' } },
  ],
  'pendent-sprinkler-head': [
    { sku: 'SPK-PEN-57', attrs: { Temperature: '57 °C', Finish: 'Chrome' } },
    { sku: 'SPK-PEN-68', attrs: { Temperature: '68 °C', Finish: 'Chrome' } },
    { sku: 'SPK-PEN-93', attrs: { Temperature: '93 °C', Finish: 'Brass' } },
  ],
  'fire-hose-reel-30m': [
    { sku: 'HOSE-RL-20', attrs: { Length: '20 m', Diameter: '19 mm' } },
    { sku: 'HOSE-RL-30', attrs: { Length: '30 m', Diameter: '19 mm' } },
  ],
  'led-emergency-exit-sign': [
    { sku: 'EML-EXIT-S', attrs: { Type: 'Single-sided', Backup: '3 hour' } },
    { sku: 'EML-EXIT-D', attrs: { Type: 'Double-sided', Backup: '3 hour' } },
  ],
  'firefighter-ppe-kit': [
    { sku: 'PPE-KIT-M', attrs: { Size: 'Medium' } },
    { sku: 'PPE-KIT-L', attrs: { Size: 'Large' } },
    { sku: 'PPE-KIT-XL', attrs: { Size: 'X-Large' } },
  ],
};

async function seedProducts(categoryIds: Record<string, string>, brandIds: Record<string, string>) {
  let order = 0;
  for (const p of PRODUCTS) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    let productId: string;

    if (!existing) {
      const count = p.images ?? 1;
      const imageRows = [];
      for (let i = 0; i < count; i++) {
        const row = await buildGalleryRow(p.imageQuery, 'products', i === 0, i, `${p.tr.en.name} photo ${i + 1}`);
        if (row) imageRows.push(row);
      }
      const product = await prisma.product.create({
        data: {
          slug: p.slug,
          sku: p.sku,
          categoryId: categoryIds[p.category],
          brandId: brandIds[p.brand],
          status: PublishStatus.PUBLISHED,
          isFeatured: Boolean(p.featured),
          sortOrder: order,
          images: imageRows.length ? { create: imageRows } : undefined,
        },
      });
      productId = product.id;

      // Variants (created once, with the product).
      const variants = p.variants ?? EXTRA_VARIANTS[p.slug] ?? [];
      if (variants.length) {
        for (let vi = 0; vi < variants.length; vi++) {
          const v = variants[vi];
          await prisma.productVariant.create({
            data: {
              productId,
              sku: v.sku,
              sortOrder: vi,
              attributes: {
                create: Object.entries(v.attrs).map(([key, value], ai) => ({ key, value, sortOrder: ai })),
              },
            },
          });
        }
      }
    } else {
      productId = existing.id;
    }
    order++;

    for (const [k, val] of Object.entries(p.tr)) {
      await prisma.productTranslation.upsert({
        where: { productId_locale: { productId, locale: localeOf(k) } },
        update: { name: val.name, shortDescription: val.shortDescription, description: val.description },
        create: {
          productId, locale: localeOf(k),
          name: val.name, shortDescription: val.shortDescription, description: val.description,
        },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

const SERVICES: Array<{ slug: string; imageQuery: string; tr: Record<'en' | 'ar' | 'ku', { name: string; description: string }> }> = [
  { slug: 'fire-risk-assessment', imageQuery: 'fire safety inspection', tr: {
    en: { name: 'Fire Risk Assessment', description: 'Certified assessors survey your premises, identify hazards and deliver a prioritised action plan that meets local and NFPA requirements.' },
    ar: { name: 'تقييم مخاطر الحريق', description: 'يقوم مقيّمون معتمدون بمسح منشأتك وتحديد المخاطر وتقديم خطة عمل ذات أولويات تلبي المتطلبات المحلية ومعايير NFPA.' },
    ku: { name: 'هەڵسەنگاندنی مەترسیی ئاگر', description: 'هەڵسەنگێنەری پەسەندکراو شوێنەکەت دەپشکنن، مەترسییەکان دەناسێننەوە و پلانی کارێکی پێشینەدار پێشکەش دەکەن.' } } },
  { slug: 'design-installation', imageQuery: 'fire sprinkler installation', tr: {
    en: { name: 'System Design & Installation', description: 'Turnkey design and installation of detection, alarm, sprinkler and suppression systems by trained engineers — fully commissioned and documented.' },
    ar: { name: 'تصميم وتركيب الأنظمة', description: 'تصميم وتركيب متكامل لأنظمة الكشف والإنذار والرشاشات والإخماد بواسطة مهندسين مدربين — مع التشغيل والتوثيق الكامل.' },
    ku: { name: 'دیزاین و دامەزراندنی سیستەم', description: 'دیزاین و دامەزراندنی تەواوی سیستەمی دۆزینەوە و ئاگاداری و پرژێنەر و کوژاندنەوە لەلایەن ئەندازیاری ڕاهێنراو.' } } },
  { slug: 'inspection-testing', imageQuery: 'fire alarm', tr: {
    en: { name: 'Inspection & Testing', description: 'Scheduled inspection and functional testing of all life-safety equipment, with certificates and compliance reports for insurers and authorities.' },
    ar: { name: 'الفحص والاختبار', description: 'فحص واختبار وظيفي مجدول لجميع معدات سلامة الأرواح، مع شهادات وتقارير امتثال للجهات المؤمّنة والسلطات.' },
    ku: { name: 'پشکنین و تاقیکردنەوە', description: 'پشکنین و تاقیکردنەوەی کاری هەموو ئامێرەکانی سەلامەتی ژیان، لەگەڵ بڕوانامە و ڕاپۆرتی پابەندبوون.' } } },
  { slug: 'maintenance-servicing', imageQuery: 'fire extinguisher service', tr: {
    en: { name: 'Maintenance & Servicing', description: 'Annual service contracts for extinguishers, alarms and sprinklers with rapid response, spare parts and 24/7 emergency call-out.' },
    ar: { name: 'الصيانة والخدمة', description: 'عقود صيانة سنوية للطفايات وأنظمة الإنذار والرشاشات مع استجابة سريعة وقطع غيار وخدمة طوارئ على مدار الساعة.' },
    ku: { name: 'چاککردنەوە و خزمەتگوزاری', description: 'گرێبەستی خزمەتی ساڵانە بۆ دەزگا و ئاگاداری و پرژێنەر لەگەڵ وەڵامدانەوەی خێرا و پارچەی یەدەک و خزمەتی فریاگوزاری ٢٤/٧.' } } },
  { slug: 'fire-safety-training', imageQuery: 'fire safety training', tr: {
    en: { name: 'Fire Safety Training', description: 'Practical staff training in extinguisher use, evacuation and fire-warden duties, delivered on-site in English, Arabic and Kurdish.' },
    ar: { name: 'التدريب على السلامة من الحريق', description: 'تدريب عملي للموظفين على استخدام الطفايات والإخلاء ومهام مراقب الحريق، يُقدَّم في الموقع بالعربية والإنجليزية والكردية.' },
    ku: { name: 'ڕاهێنانی سەلامەتی ئاگر', description: 'ڕاهێنانی پراکتیکی کارمەندان لە بەکارهێنانی دەزگا و کۆچپێکردن و ئەرکی چاودێری ئاگر، لە شوێن بە کوردی و عەرەبی و ئینگلیزی.' } } },
  { slug: 'emergency-evacuation-planning', imageQuery: 'emergency exit', tr: {
    en: { name: 'Evacuation Planning', description: 'Bespoke evacuation strategies, signage layouts and drills that keep occupants safe and your building compliant.' },
    ar: { name: 'تخطيط الإخلاء', description: 'استراتيجيات إخلاء مخصصة وتخطيط اللافتات وتمارين تبقي الأشخاص آمنين ومبناك ممتثلاً.' },
    ku: { name: 'پلانی کۆچپێکردن', description: 'ستراتیژی کۆچپێکردنی تایبەت و پلانی نیشانە و ڕاهێنان کە خەڵک بە سەلامەت و بیناکەت پابەند ڕادەگرێ.' } } },
];

async function seedServices() {
  // shared service category
  const serviceCat = await prisma.category.upsert({
    where: { slug: 'fire-safety-services' },
    update: {},
    create: { slug: 'fire-safety-services', type: CategoryType.SERVICE, isActive: true },
  });
  for (const [k, name] of Object.entries({ en: 'Fire Safety Services', ar: 'خدمات السلامة من الحريق', ku: 'خزمەتگوزاری سەلامەتی ئاگر' })) {
    await prisma.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: serviceCat.id, locale: localeOf(k) } },
      update: { name },
      create: { categoryId: serviceCat.id, locale: localeOf(k), name },
    });
  }

  let order = 0;
  for (const s of SERVICES) {
    let svc = await prisma.service.findUnique({ where: { slug: s.slug } });
    if (!svc) {
      const imageFields = await buildEmbeddedImage(s.imageQuery, 'services', 'image');
      svc = await prisma.service.create({
        data: { slug: s.slug, categoryId: serviceCat.id, isActive: true, sortOrder: order, ...imageFields },
      });
    }
    order++;
    for (const [k, val] of Object.entries(s.tr)) {
      await prisma.serviceTranslation.upsert({
        where: { serviceId_locale: { serviceId: svc.id, locale: localeOf(k) } },
        update: { name: val.name, description: val.description },
        create: { serviceId: svc.id, locale: localeOf(k), name: val.name, description: val.description },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

const PROJECTS: Array<{
  slug: string; clientName: string; location: string; completedAt: Date; featured?: boolean;
  imageQuery: string; tr: Record<'en' | 'ar' | 'ku', { title: string; description: string }>;
}> = [
  { slug: 'erbil-grand-mall', clientName: 'Erbil Grand Holdings', location: 'Erbil, Iraq', completedAt: new Date('2025-11-01'), featured: true, imageQuery: 'shopping mall interior', tr: {
    en: { title: 'Erbil Grand Mall Fire System', description: 'Full addressable fire-detection, sprinkler and suppression installation across 120,000 m² of retail and parking, delivered ahead of opening.' },
    ar: { title: 'نظام الحريق لمول أربيل الكبير', description: 'تركيب كامل لكشف الحريق بالعنونة والرشاشات والإخماد عبر 120,000 م² من التجزئة والمواقف، سُلّم قبل الافتتاح.' },
    ku: { title: 'سیستەمی ئاگری مۆڵی گەورەی هەولێر', description: 'دامەزراندنی تەواوی دۆزینەوەی ئاگری ناونیشاندار و پرژێنەر لە ١٢٠,٠٠٠ م² فرۆشگا و پارکینگ.' } } },
  { slug: 'basra-oil-refinery', clientName: 'South Refineries Co.', location: 'Basra, Iraq', completedAt: new Date('2025-07-15'), featured: true, imageQuery: 'oil refinery', tr: {
    en: { title: 'Basra Refinery Protection', description: 'High-hazard foam and deluge systems, hydrant network and gas detection protecting critical process units at a major refinery.' },
    ar: { title: 'حماية مصفاة البصرة', description: 'أنظمة رغوة وإغراق عالية المخاطر وشبكة فوهات وكشف غاز لحماية وحدات المعالجة الحرجة في مصفاة كبرى.' },
    ku: { title: 'پاراستنی پاڵاوگەی بەسرە', description: 'سیستەمی کەف و لافاوی مەترسیدار و تۆڕی هایدرانت و دۆزینەوەی گاز بۆ پاراستنی یەکەی گرنگی پاڵاوگەیەکی گەورە.' } } },
  { slug: 'baghdad-medical-city', clientName: 'Ministry of Health', location: 'Baghdad, Iraq', completedAt: new Date('2025-03-20'), imageQuery: 'modern hospital building', tr: {
    en: { title: 'Baghdad Medical City', description: 'Life-safety upgrade for a 600-bed hospital: addressable alarms, smoke control and a clean-agent system for imaging and server suites.' },
    ar: { title: 'مدينة بغداد الطبية', description: 'تحديث سلامة الأرواح لمستشفى 600 سرير: إنذارات بالعنونة والتحكم بالدخان ونظام غاز نظيف لأجنحة التصوير والخوادم.' },
    ku: { title: 'شاری پزیشکی بەغدا', description: 'بەرزکردنەوەی سەلامەتی ژیان بۆ نەخۆشخانەی ٦٠٠ قەرەوێڵە: ئاگاداری ناونیشاندار و کۆنترۆڵی دووکەڵ و سیستەمی گازی پاک.' } } },
  { slug: 'sulaymaniyah-tower', clientName: 'Sulaymaniyah Investments', location: 'Sulaymaniyah, Iraq', completedAt: new Date('2024-12-10'), featured: true, imageQuery: 'office tower skyscraper', tr: {
    en: { title: 'Sulaymaniyah Office Tower', description: 'A 28-storey commercial tower fitted with networked alarm panels, wet risers, stairwell pressurisation and emergency lighting throughout.' },
    ar: { title: 'برج مكاتب السليمانية', description: 'برج تجاري من 28 طابقاً مزود بلوحات إنذار مترابطة وأنابيب صاعدة رطبة وضغط السلالم وإضاءة طوارئ بالكامل.' },
    ku: { title: 'تاوەری ئۆفیسی سلێمانی', description: 'تاوەرێکی بازرگانی ٢٨ نهۆم بە پانێڵی ئاگاداری تۆڕاو و بۆری تەڕ و گوشاری قات و ڕووناکی فریاگوزاری.' } } },
  { slug: 'duhok-industrial-park', clientName: 'Duhok Industrial Zone', location: 'Duhok, Iraq', completedAt: new Date('2024-09-05'), imageQuery: 'factory industrial warehouse', tr: {
    en: { title: 'Duhok Industrial Park', description: 'Warehouse and factory fire protection: ESFR sprinklers, hydrant ring main and a 24/7 monitored alarm network across six units.' },
    ar: { title: 'مجمع دهوك الصناعي', description: 'حماية حريق للمستودعات والمصانع: رشاشات ESFR وشبكة فوهات وشبكة إنذار مراقبة على مدار الساعة عبر ست وحدات.' },
    ku: { title: 'پارکی پیشەسازی دهۆک', description: 'پاراستنی ئاگری کۆگا و کارگە: پرژێنەری ESFR و تۆڕی هایدرانت و تۆڕی ئاگاداری چاودێریکراوی ٢٤/٧ لە شەش یەکە.' } } },
  { slug: 'erbil-airport-terminal', clientName: 'Erbil International Airport', location: 'Erbil, Iraq', completedAt: new Date('2024-05-18'), imageQuery: 'airport terminal interior', tr: {
    en: { title: 'Erbil Airport Terminal', description: 'Voice-evacuation alarm, aspirating smoke detection and high-sensitivity protection for a busy international passenger terminal.' },
    ar: { title: 'صالة مطار أربيل', description: 'إنذار إخلاء صوتي وكشف دخان بالشفط وحماية عالية الحساسية لصالة ركاب دولية مزدحمة.' },
    ku: { title: 'تێرمیناڵی فڕۆکەخانەی هەولێر', description: 'ئاگاداری کۆچپێکردنی دەنگی و دۆزینەوەی دووکەڵی هەڵمژین و پاراستنی هەستیاری بەرز بۆ تێرمیناڵی نێودەوڵەتی قەرەباڵغ.' } } },
];

async function seedProjects() {
  let order = 0;
  for (const pr of PROJECTS) {
    const existing = await prisma.project.findUnique({ where: { slug: pr.slug } });
    let projectId: string;
    if (!existing) {
      const cover = await buildGalleryRow(pr.imageQuery, 'projects', true, 0, pr.tr.en.title);
      const project = await prisma.project.create({
        data: {
          slug: pr.slug, clientName: pr.clientName, location: pr.location, completedAt: pr.completedAt,
          status: PublishStatus.PUBLISHED, isFeatured: Boolean(pr.featured), sortOrder: order,
          images: cover ? { create: [cover] } : undefined,
        },
      });
      projectId = project.id;
    } else {
      projectId = existing.id;
    }
    order++;
    for (const [k, val] of Object.entries(pr.tr)) {
      await prisma.projectTranslation.upsert({
        where: { projectId_locale: { projectId, locale: localeOf(k) } },
        update: { title: val.title, description: val.description },
        create: { projectId, locale: localeOf(k), title: val.title, description: val.description },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Blogs
// ---------------------------------------------------------------------------

const BLOGS: Array<{
  slug: string; publishedAt: Date; imageQuery: string;
  tr: Record<'en' | 'ar' | 'ku', { title: string; excerpt: string; content: string }>;
}> = [
  { slug: 'choosing-the-right-fire-extinguisher', publishedAt: new Date('2026-05-12'), imageQuery: 'fire extinguisher', tr: {
    en: { title: 'How to Choose the Right Fire Extinguisher', excerpt: 'Match the extinguisher to the fire class — a practical guide for homes and businesses.', content: 'Choosing the right fire extinguisher starts with understanding fire classes. Class A covers wood and paper, Class B flammable liquids, Class C electrical equipment, and Class F cooking oils. ABC dry powder is the most versatile all-rounder, while CO2 is best for electronics and wet chemical for kitchens. Always size the unit to the risk, mount it on a clearly signed bracket near an exit, and have it serviced annually.' },
    ar: { title: 'كيف تختار طفاية الحريق المناسبة', excerpt: 'طابق الطفاية مع فئة الحريق — دليل عملي للمنازل والشركات.', content: 'يبدأ اختيار طفاية الحريق المناسبة بفهم فئات الحريق. الفئة A للخشب والورق، والفئة B للسوائل القابلة للاشتعال، والفئة C للمعدات الكهربائية، والفئة F لزيوت الطهي. بودرة ABC الجافة هي الأكثر تنوعاً، بينما ثاني أكسيد الكربون أفضل للإلكترونيات والكيميائية الرطبة للمطابخ. اختر الحجم المناسب للمخاطر وثبّتها قرب المخرج وافحصها سنوياً.' },
    ku: { title: 'چۆن دەزگای کوژاندنەوەی گونجاو هەڵبژێریت', excerpt: 'دەزگاکە لەگەڵ پۆلی ئاگر بگونجێنە — ڕێنمایەکی پراکتیکی.', content: 'هەڵبژاردنی دەزگای کوژاندنەوەی گونجاو بە تێگەیشتن لە پۆلەکانی ئاگر دەستپێدەکات. پۆلی A بۆ دار و کاغەز، پۆلی B بۆ شلە ئاگرگرەکان، پۆلی C بۆ ئامێری کارەبایی، و پۆلی F بۆ ڕۆنی چێشتلێنان. پۆودەری وشکی ABC فرەمەبەستترینە. هەمیشە قەبارەکە لەگەڵ مەترسی بگونجێنە و ساڵانە بیپشکنە.' } } },
  { slug: 'why-fire-alarm-maintenance-matters', publishedAt: new Date('2026-04-03'), imageQuery: 'fire alarm', tr: {
    en: { title: 'Why Fire Alarm Maintenance Matters', excerpt: 'Regular servicing keeps detection reliable and your building compliant.', content: 'A fire alarm system is only as good as its last test. Dust, ageing batteries and environmental drift gradually reduce sensitivity, while undetected faults can leave whole zones unprotected. Quarterly inspections, annual functional testing and prompt repair of faults keep the system dependable, reduce false alarms, and provide the documented compliance that insurers and authorities require.' },
    ar: { title: 'لماذا تهم صيانة إنذار الحريق', excerpt: 'الصيانة الدورية تبقي الكشف موثوقاً ومبناك ممتثلاً.', content: 'نظام إنذار الحريق جيد بقدر آخر اختبار له. الغبار والبطاريات القديمة والانحراف البيئي تقلل الحساسية تدريجياً، بينما تترك الأعطال غير المكتشفة مناطق كاملة دون حماية. الفحوص الفصلية والاختبار السنوي والإصلاح السريع تبقي النظام موثوقاً وتقلل الإنذارات الكاذبة.' },
    ku: { title: 'بۆچی چاککردنەوەی ئاگاداری ئاگر گرنگە', excerpt: 'خزمەتی بەردەوام دۆزینەوە متمانەپێکراو ڕادەگرێ.', content: 'سیستەمی ئاگاداری ئاگر تەنها بەقەد دوایین تاقیکردنەوەی باشە. تۆز و باتری کۆن و لادانی ژینگەیی بەرە بەرە هەستیاری کەم دەکەنەوە. پشکنینی هەر سێ مانگ جارێک و تاقیکردنەوەی ساڵانە و چاککردنەوەی خێرا سیستەمەکە متمانەپێکراو ڕادەگرێ.' } } },
  { slug: 'workplace-fire-safety-checklist', publishedAt: new Date('2026-02-21'), imageQuery: 'office building', tr: {
    en: { title: 'A Workplace Fire Safety Checklist', excerpt: 'Ten checks every business should run this quarter.', content: 'Good fire safety is routine, not luck. Check that escape routes are clear and signed, extinguishers are in place and in date, alarms test correctly, emergency lighting works, and fire doors close fully. Confirm staff know the evacuation plan, the assembly point is marked, and a fire warden is appointed per floor. Document each check — it is your evidence of due diligence.' },
    ar: { title: 'قائمة تحقق للسلامة من الحريق في العمل', excerpt: 'عشرة فحوص يجب على كل شركة إجراؤها هذا الربع.', content: 'السلامة الجيدة من الحريق روتين وليست حظاً. تأكد من أن مسارات الهروب واضحة وموسومة، والطفايات في مكانها وسارية، والإنذارات تعمل، وإضاءة الطوارئ تعمل، وأبواب الحريق تغلق بالكامل. تأكد من معرفة الموظفين لخطة الإخلاء وتعيين مراقب حريق لكل طابق ووثّق كل فحص.' },
    ku: { title: 'لیستی پشکنینی سەلامەتی ئاگر لە شوێنی کار', excerpt: 'دە پشکنین کە هەر بزنسێک پێویستە ئەم وەرزە بیکات.', content: 'سەلامەتی باشی ئاگر ڕووتینە، نەک بەخت. دڵنیابە لەوەی ڕێگای دەرچوون ڕوون و نیشانەدارە، دەزگاکان لە شوێنی خۆیانن، ئاگاداریەکان کاردەکەن، ڕووناکی فریاگوزاری کاردەکات، و دەرگاکانی ئاگر بە تەواوی دادەخرێن. هەر پشکنینێک تۆمار بکە.' } } },
  { slug: 'common-sprinkler-myths', publishedAt: new Date('2026-01-09'), imageQuery: 'fire sprinkler', tr: {
    en: { title: 'Common Sprinkler Myths, Busted', excerpt: 'No, they don’t all go off at once — and other facts worth knowing.', content: 'Sprinklers are among the most misunderstood life-safety devices. They do not all activate together; each head opens individually when the heat at that spot reaches its rating. Accidental discharge is extremely rare, and water damage from a single activated sprinkler is far less than from fire-brigade hoses. Properly maintained, sprinklers control or extinguish most fires before they spread.' },
    ar: { title: 'خرافات شائعة عن الرشاشات', excerpt: 'لا، لا تنطلق كلها دفعة واحدة — وحقائق أخرى تستحق المعرفة.', content: 'الرشاشات من أكثر أجهزة سلامة الأرواح سوء فهم. لا تنطلق كلها معاً؛ بل يفتح كل رأس بمفرده عندما تصل الحرارة عنده إلى تصنيفه. التفريغ العرضي نادر جداً، وأضرار المياه من رشاش واحد أقل بكثير من خراطيم الإطفاء. تتحكم الرشاشات الجيدة الصيانة في معظم الحرائق قبل انتشارها.' },
    ku: { title: 'ئەفسانە باوەکانی پرژێنەر', excerpt: 'نەخێر، هەموویان پێکەوە ناکرێنەوە — و ڕاستی تر.', content: 'پرژێنەرەکان لە هەستیارترین ئامێرەکانی سەلامەتی ژیانن کە زۆر بەهەڵە تێگەیشتراون. هەموویان پێکەوە چالاک نابن؛ هەر سەرێک بە تەنها دەکرێتەوە کاتێک گەرما لەو شوێنە دەگاتە ئاستی خۆی. تەقینەوەی هەڵە زۆر دەگمەنە.' } } },
  { slug: 'building-an-evacuation-plan', publishedAt: new Date('2025-11-28'), imageQuery: 'emergency exit', tr: {
    en: { title: 'Building an Evacuation Plan That Works', excerpt: 'Clear routes, named roles and regular drills save lives.', content: 'An evacuation plan is only effective if people can follow it under stress. Map at least two escape routes from every area, mark them with illuminated signage, and choose a safe assembly point clear of the building. Assign fire wardens, plan for visitors and people with reduced mobility, and rehearse with drills at least twice a year. Review the plan whenever the layout changes.' },
    ar: { title: 'بناء خطة إخلاء فعّالة', excerpt: 'مسارات واضحة وأدوار محددة وتمارين منتظمة تنقذ الأرواح.', content: 'خطة الإخلاء فعّالة فقط إذا أمكن اتباعها تحت الضغط. ارسم مسارين على الأقل من كل منطقة، وحدّدهما بلافتات مضيئة، واختر نقطة تجمع آمنة بعيدة عن المبنى. عيّن مراقبي حريق، وخطط للزوار وذوي الحركة المحدودة، ونفّذ تمارين مرتين سنوياً على الأقل.' },
    ku: { title: 'دروستکردنی پلانی کۆچپێکردنی کارا', excerpt: 'ڕێگای ڕوون و ئەرکی دیاریکراو و ڕاهێنانی بەردەوام ژیان دەپارێزن.', content: 'پلانی کۆچپێکردن تەنها کاتێک کاراییە کە خەڵک بتوانن لەژێر فشاردا پەیڕەوی بکەن. لانیکەم دوو ڕێگای دەرچوون لە هەر ناوچەیەک دیاری بکە، بە نیشانەی ڕووناک نیشانیان بکە، و خاڵێکی کۆبوونەوەی سەلامەت هەڵبژێرە. چاودێری ئاگر دیاری بکە و لانیکەم دوو جار لە ساڵدا ڕاهێنان بکە.' } } },
  { slug: 'understanding-nfpa-standards', publishedAt: new Date('2025-10-15'), imageQuery: 'firefighter', tr: {
    en: { title: 'Understanding NFPA Standards', excerpt: 'What the codes mean and why they shape every install we do.', content: 'NFPA standards are the global benchmark for fire protection. NFPA 10 governs portable extinguishers, NFPA 13 sprinkler systems, NFPA 72 alarm and signalling, and NFPA 101 the Life Safety Code for means of egress. Designing to these standards is not just box-ticking: it ensures equipment is correctly selected, spaced and maintained so that systems perform exactly when they are needed most.' },
    ar: { title: 'فهم معايير NFPA', excerpt: 'ماذا تعني الأكواد ولماذا تشكّل كل عملية تركيب نقوم بها.', content: 'معايير NFPA هي المرجع العالمي للحماية من الحريق. يحكم NFPA 10 الطفايات المحمولة، وNFPA 13 أنظمة الرشاشات، وNFPA 72 الإنذار والإشارات، وNFPA 101 قانون سلامة الأرواح لمسارات الخروج. التصميم وفق هذه المعايير يضمن اختيار المعدات وتوزيعها وصيانتها بشكل صحيح.' },
    ku: { title: 'تێگەیشتن لە ستانداردەکانی NFPA', excerpt: 'کۆدەکان چی مانا دەگەیەنن و بۆچی هەموو دامەزراندنێک شێوە دەدەن.', content: 'ستانداردەکانی NFPA پێوەری جیهانی پاراستنی ئاگرن. NFPA 10 دەزگای هەڵگیراو، NFPA 13 سیستەمی پرژێنەر، NFPA 72 ئاگاداری و ئاماژە، و NFPA 101 کۆدی سەلامەتی ژیان بۆ ڕێگای دەرچوون. دیزاینکردن بەپێی ئەم ستانداردانە دڵنیایی دەدات کە ئامێرەکان بەدروستی هەڵبژێردراون.' } } },
];

async function seedBlogs(authorId: string) {
  const blogCat = await prisma.category.upsert({
    where: { slug: 'fire-safety-insights' },
    update: {},
    create: { slug: 'fire-safety-insights', type: CategoryType.BLOG, isActive: true },
  });
  for (const [k, name] of Object.entries({ en: 'Insights', ar: 'مقالات', ku: 'تێڕوانین' })) {
    await prisma.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: blogCat.id, locale: localeOf(k) } },
      update: { name },
      create: { categoryId: blogCat.id, locale: localeOf(k), name },
    });
  }

  for (const bl of BLOGS) {
    const existing = await prisma.blog.findUnique({ where: { slug: bl.slug } });
    let blogId: string;
    if (!existing) {
      const coverFields = await buildEmbeddedImage(bl.imageQuery, 'blogs', 'cover');
      const blog = await prisma.blog.create({
        data: {
          slug: bl.slug, categoryId: blogCat.id, authorId,
          status: PublishStatus.PUBLISHED, publishedAt: bl.publishedAt, ...coverFields,
        },
      });
      blogId = blog.id;
    } else {
      blogId = existing.id;
    }
    for (const [k, val] of Object.entries(bl.tr)) {
      await prisma.blogTranslation.upsert({
        where: { blogId_locale: { blogId, locale: localeOf(k) } },
        update: { title: val.title, excerpt: val.excerpt, content: val.content },
        create: { blogId, locale: localeOf(k), title: val.title, excerpt: val.excerpt, content: val.content },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
