import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBrands } from '../hooks/usePublic';
import { pickName } from '../lib/api';
import { PageBanner } from '../components/PageBanner';
import { Loader } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { IconStar } from '../components/Icons';

export function BrandsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { data, isLoading } = useBrands();

  return (
    <>
      <PageBanner title={t('brands.title')} subtitle={t('brands.subtitle')} crumbs={[{ label: t('nav.brands') }]} />
      <section className="section">
        <div className="container">
          {isLoading ? (
            <Loader />
          ) : !data || data.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-3">
              {data.map((b) => (
                <Link key={b.id} to={`/products?brand=${b.slug}`} className="tile" style={{ textAlign: 'center' }}>
                  <span className="tile-icon accent" style={{ margin: '0 auto 16px' }}>
                    {b.logo ? (
                      <img src={b.logo.thumbnailUrl ?? b.logo.url} alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} />
                    ) : (
                      <IconStar size={24} />
                    )}
                  </span>
                  <h3>{pickName(b.translations, lang, b.slug)}</h3>
                  <div className="tile-count">
                    {b.productCount} {t('brands.products')}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
