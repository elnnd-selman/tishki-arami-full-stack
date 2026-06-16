import { useTranslation } from 'react-i18next';
import { IconGlobe } from './Icons';
import { SUPPORTED_LOCALES } from '../../i18n';
import type { LocaleKey } from '../../types/api';

const LABELS: Record<LocaleKey, string> = { en: 'EN', ar: 'عربي', ku: 'کوردی' };

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const current = (i18n.language?.slice(0, 2) as LocaleKey) || 'en';

  return (
    <div className="lang-switch" role="group" aria-label={t('lang.label')}>
      <IconGlobe size={16} />
      {SUPPORTED_LOCALES.map((lng) => (
        <button
          key={lng}
          type="button"
          className={`lang-btn ${current === lng ? 'active' : ''}`}
          onClick={() => void i18n.changeLanguage(lng)}
        >
          {LABELS[lng]}
        </button>
      ))}
    </div>
  );
}
