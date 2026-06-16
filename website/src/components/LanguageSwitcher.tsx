import { useTranslation } from 'react-i18next';
import { SUPPORTED, LABELS } from '../i18n';
import type { LocaleKey } from '../types';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const current = (i18n.language?.slice(0, 2) as LocaleKey) || 'en';
  return (
    <div className="lang" role="group" aria-label={t('lang.label')}>
      {SUPPORTED.map((l) => (
        <button
          key={l}
          type="button"
          className={current === l ? 'active' : ''}
          onClick={() => void i18n.changeLanguage(l)}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
