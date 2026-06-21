import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProducts, useCategories, useBrands } from '../hooks/usePublic';
import { pickName } from '../lib/api';
import { PageBanner } from '../components/PageBanner';
import { ProductCard } from '../components/ProductCard';
import { Pagination } from '../components/Pagination';
import { EmptyState } from '../components/EmptyState';
import { Spinner } from '../components/Spinner';
import { IconSearch } from '../components/Icons';

export function ProductsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [params, setParams] = useSearchParams();

  const categorySlug = params.get('category') ?? '';
  const brandSlug = params.get('brand') ?? '';
  const page = Number(params.get('page') ?? '1');
  const sort = params.get('sort') ?? 'newest';
  const search = params.get('q') ?? '';
  const [searchInput, setSearchInput] = useState(search);

  // Keep searchInput in sync when URL changes externally (e.g. browser back/forward).
  useEffect(() => {
    setSearchInput(params.get('q') ?? '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('q')]);

  // Debounce: push search to URL after 350ms; reset page.
  useEffect(() => {
    const id = setTimeout(() => {
      const p = new URLSearchParams(params);
      if (searchInput) p.set('q', searchInput); else p.delete('q');
      p.delete('page');
      setParams(p, { replace: true });
    }, 350);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const categories = useCategories();
  const brands = useBrands();
  const { data, isLoading } = useProducts({ page, categorySlug, brandSlug, search, sortBy: sort, pageSize: 12 });

  function update(next: Record<string, string | null>) {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    p.delete('page'); // reset to first page on any filter change
    setParams(p);
  }

  function goPage(pg: number) {
    const p = new URLSearchParams(params);
    p.set('page', String(pg));
    setParams(p);
  }

  const hasFilters = categorySlug || brandSlug || search;

  return (
    <>
      <PageBanner title={t('catalog.title')} subtitle={t('catalog.subtitle')} crumbs={[{ label: t('nav.products') }]} />

      <section className="section">
        <div className="container">
          <div className="catalog">
            {/* Filters */}
            <aside className="filters">
              <div className="filter-group">
                <h4>{t('catalog.categories')}</h4>
                <button type="button" className={`filter-opt ${!categorySlug ? 'active' : ''}`} onClick={() => update({ category: null })}>
                  {t('catalog.allCategories')}
                </button>
                {categories.data?.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`filter-opt ${categorySlug === c.slug ? 'active' : ''}`}
                    onClick={() => update({ category: c.slug })}
                  >
                    {pickName(c.translations, lang, c.slug)}
                  </button>
                ))}
              </div>
              <div className="filter-group">
                <h4>{t('catalog.brands')}</h4>
                <button type="button" className={`filter-opt ${!brandSlug ? 'active' : ''}`} onClick={() => update({ brand: null })}>
                  {t('catalog.allBrands')}
                </button>
                {brands.data?.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`filter-opt ${brandSlug === b.slug ? 'active' : ''}`}
                    onClick={() => update({ brand: b.slug })}
                  >
                    {pickName(b.translations, lang, b.slug)}
                  </button>
                ))}
              </div>
              {hasFilters && (
                <div className="filter-group">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ width: '100%' }}
                    onClick={() => {
                      setSearchInput('');
                      setParams(new URLSearchParams());
                    }}
                  >
                    {t('catalog.clear')}
                  </button>
                </div>
              )}
            </aside>

            {/* Results */}
            <div>
              <div className="catalog-toolbar">
                <div className="search-field">
                  <IconSearch size={18} />
                  <input
                    type="search"
                    placeholder={t('common.searchPlaceholder')}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
                <select
                  className="select"
                  value={sort}
                  onChange={(e) => update({ sort: e.target.value })}
                >
                  <option value="newest">{t('catalog.sortNewest')}</option>
                  <option value="oldest">{t('catalog.sortOldest')}</option>
                  <option value="name">{t('catalog.sortNameAsc')}</option>
                </select>
                {data && <span className="result-count">{t('common.results', { count: data.meta.total })}</span>}
              </div>

              {isLoading ? (
                <div className="loader" style={{ minHeight: 280 }}>
                  <Spinner lg />
                </div>
              ) : !data || data.data.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  <div className="grid grid-3">
                    {data.data.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                  <Pagination meta={data.meta} onChange={goPage} />
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
