import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBlogs } from '../hooks/usePublic';
import { pickName, pickField } from '../lib/api';
import { PageBanner } from '../components/PageBanner';
import { Pagination } from '../components/Pagination';
import { Loader } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { IconImage } from '../components/Icons';

export function BlogPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [page, setPage] = useState(1);
  const { data, isLoading } = useBlogs(page);

  return (
    <>
      <PageBanner title={t('blog.title')} subtitle={t('blog.subtitle')} crumbs={[{ label: t('nav.blog') }]} />
      <section className="section">
        <div className="container">
          {isLoading ? (
            <Loader />
          ) : !data || data.data.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="grid grid-3">
                {data.data.map((b) => (
                  <Link key={b.id} to={`/blog/${b.slug}`} className="blog-card">
                    <div className="blog-thumb">
                      {b.cover ? (
                        <img src={b.cover.thumbnailUrl ?? b.cover.url} alt="" loading="lazy" />
                      ) : (
                        <span className="thumb-empty" style={{ height: '100%' }}>
                          <IconImage size={36} />
                        </span>
                      )}
                    </div>
                    <div className="blog-body">
                      <span className="blog-meta">
                        {b.publishedAt ? new Date(b.publishedAt).toLocaleDateString() : ''}
                      </span>
                      <h3>{pickName(b.translations, lang, b.slug)}</h3>
                      <span className="blog-excerpt">{pickField(b.translations, lang, 'excerpt')}</span>
                    </div>
                  </Link>
                ))}
              </div>
              <Pagination meta={data.meta} onChange={setPage} />
            </>
          )}
        </div>
      </section>
    </>
  );
}
