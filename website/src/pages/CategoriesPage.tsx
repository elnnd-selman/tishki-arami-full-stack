import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCategories } from '../hooks/usePublic';
import { pickName, pickField } from '../lib/api';
import { PageBanner } from '../components/PageBanner';
import { Loader } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { IconTag } from '../components/Icons';

export function CategoriesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { data, isLoading } = useCategories();

  return (
    <>
      <PageBanner title={t('categories.title')} subtitle={t('categories.subtitle')} crumbs={[{ label: t('nav.categories') }]} />
      <section className="section">
        <div className="container">
          {isLoading ? (
            <Loader />
          ) : !data || data.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-3">
              {data.map((c) => (
                <Link key={c.id} to={`/products?category=${c.slug}`} className="tile">
                  <span className="tile-icon">
                    {c.image ? (
                      <img src={c.image.thumbnailUrl ?? c.image.url} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
                    ) : (
                      <IconTag size={24} />
                    )}
                  </span>
                  <h3>{pickName(c.translations, lang, c.slug)}</h3>
                  <p>{pickField(c.translations, lang, 'description') || t('categories.subtitle')}</p>
                  <div className="tile-count">
                    {c.productCount} {t('categories.products')}
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
