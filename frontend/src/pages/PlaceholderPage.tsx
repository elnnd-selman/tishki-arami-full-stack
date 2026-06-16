import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/ui/PageHeader';
import { IconLayers } from '../components/ui/Icons';

// Shown for modules that follow the Products template but are not built yet.
export function PlaceholderPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return (
    <div className="stack">
      <PageHeader title={t(titleKey)} />
      <div className="card">
        <div className="empty">
          <span className="empty-icon">
            <IconLayers size={40} />
          </span>
          <div className="empty-title">{t(titleKey)}</div>
          <p>{t('common.comingSoon')}</p>
        </div>
      </div>
    </div>
  );
}
