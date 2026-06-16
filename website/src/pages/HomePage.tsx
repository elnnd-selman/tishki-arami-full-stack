import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useHome } from '../hooks/usePublic';
import { pickName, pickField } from '../lib/api';
import { ProductCard } from '../components/ProductCard';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { useInView } from '../hooks/useInView';
import { Loader } from '../components/Spinner';
import {
  IconArrowRight,
  IconTag,
  IconBriefcase,
  IconImage,
  IconLayers,
  IconShield,
  IconCheck,
  IconHeadset,
} from '../components/Icons';

export function HomePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { data, isLoading } = useHome();

  const [statsRef, statsInView] = useInView<HTMLDivElement>(0.3);

  /* One global IntersectionObserver — fires when any .reveal enters viewport */
  useEffect(() => {
    if (!data) return;
    const els = document.querySelectorAll<HTMLElement>('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [data]);

  if (isLoading || !data) return <Loader />;

  return (
    <>
      {/* ── Hero — centered, full-bleed background with stats bar ── */}
      <section className="hero">
        <div className="hero-bg" aria-hidden="true" />
        <div className="hero-scrim" aria-hidden="true" />

        <div className="container hero-inner">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              {t('brand.tagline')}
            </div>
            <h1>
              {t('hero.title')}{' '}
              <span className="accent">{t('hero.titleAccent')}</span>
            </h1>
            <p className="hero-sub">{t('hero.subtitle')}</p>
            <div className="hero-actions">
              <Link to="/products" className="btn btn-primary btn-lg">
                {t('hero.browse')} <IconArrowRight size={18} />
              </Link>
              <Link to="/contact" className="btn btn-ghost-light btn-lg">
                {t('hero.contact')}
              </Link>
            </div>
            <ul className="hero-features">
              <li className="hero-feature"><IconShield size={18} /> {t('hero.f1')}</li>
              <li className="hero-feature"><IconCheck size={18} /> {t('hero.f2')}</li>
              <li className="hero-feature"><IconHeadset size={18} /> {t('hero.f3')}</li>
            </ul>
          </div>
        </div>

        {/* Full-width frosted stats bar */}
        <div className="hero-statsbar" ref={statsRef}>
          <div className="container hero-statsbar-inner">
            <div className="hero-stat">
              <div className="stat-num">
                <AnimatedCounter target={data.stats.products} inView={statsInView} suffix="+" />
              </div>
              <div className="stat-label">{t('stats.products')}</div>
            </div>
            <div className="hero-stat">
              <div className="stat-num">
                <AnimatedCounter target={data.stats.brands} inView={statsInView} suffix="+" />
              </div>
              <div className="stat-label">{t('stats.brands')}</div>
            </div>
            <div className="hero-stat">
              <div className="stat-num">
                <AnimatedCounter target={data.stats.categories} inView={statsInView} />
              </div>
              <div className="stat-label">{t('stats.categories')}</div>
            </div>
            <div className="hero-stat">
              <div className="stat-num">
                <AnimatedCounter target={data.stats.projects} inView={statsInView} suffix="+" />
              </div>
              <div className="stat-label">{t('stats.projects')}</div>
            </div>
          </div>
        </div>
      </section>

      <span id="main" />

      {/* ── Featured products — first after hero ── */}
      {data.featuredProducts.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div className="heading reveal">
                <span className="eyebrow">{t('home.featuredEyebrow')}</span>
                <h2>{t('home.featuredTitle')}</h2>
                <p>{t('home.featuredDesc')}</p>
              </div>
              <Link to="/products" className="btn btn-outline btn-sm">
                {t('common.viewAll')} <IconArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-4 stagger">
              {data.featuredProducts.slice(0, 8).map((p) => (
                <div key={p.id} className="reveal">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Categories ── */}
      {data.categories.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <div className="section-head">
              <div className="heading reveal">
                <span className="eyebrow">{t('home.categoriesEyebrow')}</span>
                <h2>{t('home.categoriesTitle')}</h2>
                <p>{t('home.categoriesDesc')}</p>
              </div>
              <Link to="/categories" className="btn btn-outline btn-sm">
                {t('common.viewAll')} <IconArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-3 stagger">
              {data.categories.slice(0, 6).map((c) => (
                <Link key={c.id} to={`/products?category=${c.slug}`} className="tile reveal">
                  <span className="tile-icon">
                    <IconTag size={24} />
                  </span>
                  <h3>{pickName(c.translations, lang, c.slug)}</h3>
                  <p>{pickField(c.translations, lang, 'description') || t('categories.subtitle')}</p>
                  <div className="tile-count">
                    {c.productCount} {t('categories.products')}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Services (dark band) ── */}
      {data.services.length > 0 && (
        <section className="section services-dark">
          <div className="container">
            <div className="heading heading-center reveal">
              <span className="eyebrow">{t('home.servicesEyebrow')}</span>
              <h2>{t('home.servicesTitle')}</h2>
              <p>{t('home.servicesDesc')}</p>
            </div>
            <div className="grid grid-3 stagger" style={{ marginTop: 44 }}>
              {data.services.slice(0, 6).map((s) => (
                <div key={s.id} className="tile reveal">
                  <span className="tile-icon accent">
                    <IconBriefcase size={24} />
                  </span>
                  <h3>{pickName(s.translations, lang, s.slug)}</h3>
                  <p>{pickField(s.translations, lang, 'description')}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Projects ── */}
      {data.projects.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <div className="section-head">
              <div className="heading reveal">
                <span className="eyebrow">{t('home.projectsEyebrow')}</span>
                <h2>{t('home.projectsTitle')}</h2>
                <p>{t('home.projectsDesc')}</p>
              </div>
              <Link to="/projects" className="btn btn-outline btn-sm">
                {t('common.viewAll')} <IconArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-3 stagger">
              {data.projects.slice(0, 3).map((p) => (
                <Link key={p.id} to={`/projects/${p.slug}`} className="project-card reveal">
                  {p.coverImage ? (
                    <img src={p.coverImage.thumbnailUrl ?? p.coverImage.url} alt="" loading="lazy" />
                  ) : (
                    <span className="project-empty">
                      <IconLayers size={40} />
                    </span>
                  )}
                  {p.completedAt && (
                    <span className="project-year-tag">
                      {new Date(p.completedAt).getFullYear()}
                    </span>
                  )}
                  <div className="project-overlay">
                    <h3>{pickName(p.translations, lang, p.slug)}</h3>
                    {p.location && <span className="meta">{p.location}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Brands ── */}
      {data.brands.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="heading heading-center reveal">
              <span className="eyebrow">{t('home.brandsEyebrow')}</span>
              <h2>{t('home.brandsTitle')}</h2>
            </div>
            <div className="grid grid-4 stagger" style={{ marginTop: 44 }}>
              {data.brands.slice(0, 8).map((b) => (
                <Link key={b.id} to={`/products?brand=${b.slug}`} className="brand-card reveal">
                  {b.logo ? (
                    <img src={b.logo.thumbnailUrl ?? b.logo.url} alt={pickName(b.translations, lang)} loading="lazy" />
                  ) : (
                    <span className="brand-text">{pickName(b.translations, lang, b.slug)}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Blog ── */}
      {data.blogs.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <div className="section-head">
              <div className="heading reveal">
                <span className="eyebrow">{t('home.blogEyebrow')}</span>
                <h2>{t('home.blogTitle')}</h2>
                <p>{t('home.blogDesc')}</p>
              </div>
              <Link to="/blog" className="btn btn-outline btn-sm">
                {t('common.viewAll')} <IconArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-3 stagger">
              {data.blogs.slice(0, 3).map((b) => (
                <Link key={b.id} to={`/blog/${b.slug}`} className="blog-card reveal">
                  <div className="blog-thumb">
                    {b.cover ? (
                      <img src={b.cover.thumbnailUrl ?? b.cover.url} alt="" loading="lazy" />
                    ) : (
                      <span className="thumb-empty" style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
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
                    <span className="blog-read">
                      {t('common.readMore')} <IconArrowRight size={14} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="section">
        <div className="container">
          <div className="cta reveal">
            <div className="cta-text">
              <h2>{t('cta.title')}</h2>
              <p>{t('cta.subtitle')}</p>
            </div>
            <Link to="/contact" className="btn btn-light">
              {t('cta.button')} <IconArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
