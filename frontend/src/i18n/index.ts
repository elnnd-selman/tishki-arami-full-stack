import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import ar from './locales/ar.json';
import ku from './locales/ku.json';
import type { LocaleKey } from '../types/api';

export const SUPPORTED_LOCALES: LocaleKey[] = ['en', 'ar', 'ku'];
export const RTL_LOCALES = new Set<LocaleKey>(['ar', 'ku']);

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      ku: { translation: ku },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LOCALES,
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

// Keep <html> dir/lang in sync with the active language so RTL renders correctly.
function applyDir(lng: string) {
  const isRtl = RTL_LOCALES.has(lng as LocaleKey);
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
}

applyDir(i18n.language);
i18n.on('languageChanged', applyDir);

export default i18n;
