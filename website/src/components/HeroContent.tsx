import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatedCounter } from './AnimatedCounter';
import { useInView } from '../hooks/useInView';
import { IconArrowRight, IconShield, IconCheck, IconHeadset } from './Icons';

export interface HeroStats {
  products: number;
  brands: number;
  categories: number;
  projects: number;
}

/** Shared hero copy + stats bar, used by both the classic and 3D hero shells. */
export function HeroContent({ stats }: { stats: HeroStats }) {
  const { t } = useTranslation();
  const [statsRef, statsInView] = useInView<HTMLDivElement>(0.3);

  return (
    <>
      <div className="container hero-inner">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            {t('brand.tagline')}
          </div>
          <h1>
            {t('hero.title')} <span className="accent">{t('hero.titleAccent')}</span>
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

      <div className="hero-statsbar" ref={statsRef}>
        <div className="container hero-statsbar-inner">
          <div className="hero-stat">
            <div className="stat-num"><AnimatedCounter target={stats.products} inView={statsInView} suffix="+" /></div>
            <div className="stat-label">{t('stats.products')}</div>
          </div>
          <div className="hero-stat">
            <div className="stat-num"><AnimatedCounter target={stats.brands} inView={statsInView} suffix="+" /></div>
            <div className="stat-label">{t('stats.brands')}</div>
          </div>
          <div className="hero-stat">
            <div className="stat-num"><AnimatedCounter target={stats.categories} inView={statsInView} /></div>
            <div className="stat-label">{t('stats.categories')}</div>
          </div>
          <div className="hero-stat">
            <div className="stat-num"><AnimatedCounter target={stats.projects} inView={statsInView} suffix="+" /></div>
            <div className="stat-label">{t('stats.projects')}</div>
          </div>
        </div>
      </div>
    </>
  );
}
