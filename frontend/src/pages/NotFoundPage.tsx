import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="center-screen">
      <div className="empty">
        <div className="not-found-code">404</div>
        <div className="empty-title">{t('common.noResults')}</div>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 12 }}>
          {t('nav.dashboard')}
        </Link>
      </div>
    </div>
  );
}
