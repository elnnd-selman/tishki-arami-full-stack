import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProject } from '../hooks/usePublic';
import { pickName, pickField } from '../lib/api';
import { PageBanner } from '../components/PageBanner';
import { Loader } from '../components/Spinner';
import { IconImage, IconMapPin, IconUsers, IconClock } from '../components/Icons';

export function ProjectDetailPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { slug } = useParams<{ slug: string }>();
  const { data: project, isLoading } = useProject(slug);
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [slug]);

  if (isLoading || !project) return <Loader />;

  const title = pickName(project.translations, lang, project.slug);
  const desc = pickField(project.translations, lang, 'description');
  const images = project.images;
  const main = images[active] ?? project.coverImage ?? null;

  return (
    <>
      <PageBanner title={title} crumbs={[{ label: t('nav.projects'), to: '/projects' }, { label: title }]} />
      <section className="section">
        <div className="container">
          <div className="pdp">
            <div>
              <div className="gallery-main" style={{ aspectRatio: '4 / 3' }}>
                {main ? (
                  <img src={main.url} alt={title} style={{ objectFit: 'cover' }} />
                ) : (
                  <span className="thumb-empty">
                    <IconImage size={56} />
                  </span>
                )}
              </div>
              {images.length > 1 && (
                <div className="gallery-thumbs">
                  {images.map((img, i) => (
                    <button key={img.id} type="button" className={`gallery-thumb ${i === active ? 'active' : ''}`} onClick={() => setActive(i)}>
                      <img src={img.thumbnailUrl ?? img.url} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pdp-info">
              <h1>{title}</h1>
              <div className="spec-list" style={{ marginTop: 18 }}>
                {project.clientName && (
                  <div className="spec-row">
                    <span className="k">
                      <IconUsers size={15} style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />
                      {t('projects.client')}
                    </span>
                    <span className="v">{project.clientName}</span>
                  </div>
                )}
                {project.location && (
                  <div className="spec-row">
                    <span className="k">
                      <IconMapPin size={15} style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />
                      {t('projects.location')}
                    </span>
                    <span className="v">{project.location}</span>
                  </div>
                )}
                {project.completedAt && (
                  <div className="spec-row">
                    <span className="k">
                      <IconClock size={15} style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />
                      {t('projects.completed')}
                    </span>
                    <span className="v">{new Date(project.completedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              {desc && (
                <div className="pdp-section">
                  <p className="pdp-desc">{desc}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
