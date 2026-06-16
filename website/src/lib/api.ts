import axios from 'axios';
import type { TranslationMap } from '../types';

// Public storefront client. No auth needed - all endpoints are read-only.
export const api = axios.create({ baseURL: '/api/v1/public' });

type LangArg = string | undefined;

function resolve(translations: TranslationMap | undefined, lang: LangArg): Record<string, unknown> | null {
  if (!translations) return null;
  const key = (lang?.slice(0, 2) as 'en' | 'ar' | 'ku') || 'en';
  const order: Array<'en' | 'ar' | 'ku'> = [key, 'en', 'ar', 'ku'];
  for (const l of order) {
    if (translations[l]) return translations[l] as unknown as Record<string, unknown>;
  }
  return null;
}

// Localized name/title with fallback to English then any available language.
export function pickName(translations: TranslationMap | undefined, lang: LangArg, fallback = ''): string {
  if (!translations) return fallback;
  const key = (lang?.slice(0, 2) as 'en' | 'ar' | 'ku') || 'en';
  const order: Array<'en' | 'ar' | 'ku'> = [key, 'en', 'ar', 'ku'];
  for (const l of order) {
    const v = translations[l]?.name ?? translations[l]?.title;
    if (v) return v;
  }
  return fallback;
}

// Localized arbitrary field (description, excerpt, content, ...).
export function pickField(translations: TranslationMap | undefined, lang: LangArg, field: string, fallback = ''): string {
  const t = resolve(translations, lang);
  const v = t?.[field];
  return v ? String(v) : fallback;
}
