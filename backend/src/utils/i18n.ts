import { Locale } from '@prisma/client';

export const LOCALES = ['en', 'ar', 'ku'] as const;
export type LocaleKey = (typeof LOCALES)[number];

// Right-to-left languages, used by the frontend to set text direction.
export const RTL_LOCALES = new Set<LocaleKey>(['ar', 'ku']);

export function toLocaleEnum(key: string): Locale {
  switch (key.toLowerCase()) {
    case 'ar':
      return Locale.AR;
    case 'ku':
      return Locale.KU;
    default:
      return Locale.EN;
  }
}

export function toLocaleKey(locale: Locale): LocaleKey {
  switch (locale) {
    case Locale.AR:
      return 'ar';
    case Locale.KU:
      return 'ku';
    default:
      return 'en';
  }
}

/**
 * Turns a flat translations array into a locale-keyed object for the admin UI,
 * e.g. [{locale:EN,name:'X'}] -> { en: { name: 'X' }, ar: null, ku: null }.
 * `fields` lists which columns to expose (ids/foreign keys are dropped).
 */
export function mapTranslations<T extends { locale: Locale }>(
  translations: T[],
  fields: Array<keyof T>,
): Record<LocaleKey, Record<string, unknown> | null> {
  const result: Record<LocaleKey, Record<string, unknown> | null> = {
    en: null,
    ar: null,
    ku: null,
  };
  for (const tr of translations) {
    const key = toLocaleKey(tr.locale);
    const obj: Record<string, unknown> = {};
    for (const f of fields) obj[f as string] = tr[f];
    result[key] = obj;
  }
  return result;
}
