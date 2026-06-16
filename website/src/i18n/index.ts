import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import ar from './locales/ar.json';
import ku from './locales/ku.json';
import type { LocaleKey } from '../types';

export const SUPPORTED: LocaleKey[] = ['en', 'ar', 'ku'];
export const RTL = new Set<LocaleKey>(['ar', 'ku']);
export const LABELS: Record<LocaleKey, string> = { en: 'EN', ar: 'عربي', ku: 'کوردی' };

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, ar: { translation: ar }, ku: { translation: ku } },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED,
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

function applyDir(lng: string) {
  const isRtl = RTL.has(lng.slice(0, 2) as LocaleKey);
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  document.documentElement.lang = lng.slice(0, 2);
}
applyDir(i18n.language);
i18n.on('languageChanged', applyDir);

export default i18n;
