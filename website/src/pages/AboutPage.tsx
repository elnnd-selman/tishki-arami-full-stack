import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageBanner } from '../components/PageBanner';
import { SectionHeading } from '../components/SectionHeading';
import { IconShield, IconUsers, IconHeadset, IconGlobe, IconArrowRight } from '../components/Icons';

export function AboutPage() {
  const { t } = useTranslation();
  const values = [
    { icon: <IconShield size={24} />, title: t('about.v1Title'), desc: t('about.v1Desc') },
    { icon: <IconUsers size={24} />, title: t('about.v2Title'), desc: t('about.v2Desc') },
    { icon: <IconHeadset size={24} />, title: t('about.v3Title'), desc: t('about.v3Desc') },
    { icon: <IconGlobe size={24} />, title: t('about.v4Title'), desc: t('about.v4Desc') },
  ];

  return (
    <>
      <PageBanner title={t('about.title')} subtitle={t('about.subtitle')} crumbs={[{ label: t('nav.about') }]} />

      <section className="section">
        <div className="container">
          <div className="about-grid">
            <div>
              <span className="eyebrow">{t('nav.about')}</span>
              <h2 style={{ fontSize: 32, marginBottom: 16 }}>{t('about.storyTitle')}</h2>
              <p style={{ marginBottom: 16 }}>{t('about.story1')}</p>
              <p>{t('about.story2')}</p>
            </div>
            <div
              style={{
                background: 'var(--slate-900)',
                borderRadius: 'var(--radius-lg)',
                minHeight: 320,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <span className="brand-mark" style={{ width: 88, height: 88, fontSize: 30, borderRadius: 22 }}>
                TA
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <SectionHeading eyebrow={t('about.valuesTitle')} title={t('about.valuesTitle')} desc={t('about.valuesDesc')} center />
          <div className="grid grid-4">
            {values.map((v, i) => (
              <div key={i} className="value-card">
                <span className={`tile-icon ${i % 2 ? 'accent' : ''}`}>{v.icon}</span>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta">
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
