import type { LocaleKey, TranslationMap } from '../types/api';

// Picks the best available translated value for the active language,
// falling back to English, then any other available locale.
export function localizedName(
  translations: TranslationMap | undefined,
  lang: string,
  fallback = '-',
): string {
  if (!translations) return fallback;
  const key = (lang?.slice(0, 2) as LocaleKey) || 'en';
  const order: LocaleKey[] = [key, 'en', 'ar', 'ku'];
  for (const l of order) {
    const name = translations[l]?.name;
    if (name) return name;
  }
  return fallback;
}
