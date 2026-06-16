import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <section className="section">
      <div className="container">
        <div className="empty-state" style={{ padding: '100px 24px' }}>
          <div style={{ fontSize: 72, fontWeight: 900, color: 'var(--primary)' }}>404</div>
          <h3>{t('notFound.title')}</h3>
          <p style={{ marginBottom: 22 }}>{t('notFound.text')}</p>
          <Link to="/" className="btn btn-primary">
            {t('notFound.home')}
          </Link>
        </div>
      </div>
    </section>
  );
}
