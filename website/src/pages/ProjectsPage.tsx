import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProjects } from '../hooks/usePublic';
import { pickName } from '../lib/api';
import { PageBanner } from '../components/PageBanner';
import { Pagination } from '../components/Pagination';
import { Loader } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { IconLayers } from '../components/Icons';

export function ProjectsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [page, setPage] = useState(1);
  const { data, isLoading } = useProjects(page);

  return (
    <>
      <PageBanner title={t('projects.title')} subtitle={t('projects.subtitle')} crumbs={[{ label: t('nav.projects') }]} />
      <section className="section">
        <div className="container">
          {isLoading ? (
            <Loader />
          ) : !data || data.data.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="grid grid-3">
                {data.data.map((p) => (
                  <Link key={p.id} to={`/projects/${p.slug}`} className="project-card">
                    {p.coverImage ? (
                      <img src={p.coverImage.thumbnailUrl ?? p.coverImage.url} alt="" loading="lazy" />
                    ) : (
                      <span className="project-empty">
                        <IconLayers size={40} />
                      </span>
                    )}
                    <div className="project-overlay">
                      <h3>{pickName(p.translations, lang, p.slug)}</h3>
                      <span className="meta">
                        {[p.clientName, p.location].filter(Boolean).join(' · ')}
                      </span>
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
