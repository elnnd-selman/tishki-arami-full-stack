import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useServices } from '../hooks/usePublic';
import { pickName, pickField } from '../lib/api';
import { PageBanner } from '../components/PageBanner';
import { Loader } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { IconBriefcase, IconArrowRight } from '../components/Icons';

export function ServicesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { data, isLoading } = useServices();

  return (
    <>
      <PageBanner title={t('services.title')} subtitle={t('services.subtitle')} crumbs={[{ label: t('nav.services') }]} />
      <section className="section">
        <div className="container">
          {isLoading ? (
            <Loader />
          ) : !data || data.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-3">
              {data.map((s) => (
                <div key={s.id} className="tile">
                  <span className="tile-icon accent">
                    {s.image ? (
                      <img src={s.image.thumbnailUrl ?? s.image.url} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
                    ) : (
                      <IconBriefcase size={24} />
                    )}
                  </span>
                  <h3>{pickName(s.translations, lang, s.slug)}</h3>
                  <p>{pickField(s.translations, lang, 'description')}</p>
                </div>
              ))}
            </div>
          )}
          <div className="cta" style={{ marginTop: 48 }}>
            <div>
              <h2>{t('cta.title')}</h2>
              <p>{t('cta.subtitle')}</p>
            </div>
            <Link to="/contact" className="btn btn-light">
              {t('cta.button')}
              <IconArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
