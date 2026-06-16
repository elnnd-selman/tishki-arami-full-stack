import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconArrowRight, IconShield, IconClock, IconCheck } from '../components/Icons';

/**
 * Immersive "scroll-story" page. The section is pinned to the viewport and the
 * three full-screen panels move horizontally as the user scrolls down; once the
 * last panel is reached the page releases and scrolls normally.
 *
 * On small screens / reduced-motion the panels simply stack vertically.
 */
const PANELS = [
  { img: '/story-1-firefighter.jpg', icon: IconClock, titleKey: 'story.step1Title', textKey: 'story.step1Text', tone: 'tone-amber' },
  { img: '/story-2-burning.jpg', icon: IconShield, titleKey: 'story.step2Title', textKey: 'story.step2Text', tone: 'tone-red' },
  { img: '/story-3-safe.jpg', icon: IconCheck, titleKey: 'story.step3Title', textKey: 'story.step3Text', tone: 'tone-blue' },
];

export function ExperiencePage() {
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    const mqMobile = window.matchMedia('(max-width: 860px)');
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;

    const update = () => {
      raf = 0;
      // Stacked mode: no horizontal transform.
      if (mqMobile.matches || mqMotion.matches) {
        track.style.transform = '';
        return;
      }
      const rect = wrap.getBoundingClientRect();
      const scrollable = wrap.offsetHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(Math.max(-rect.top / scrollable, 0), 1) : 0;
      const maxShift = (PANELS.length - 1) * 100; // in vw
      track.style.transform = `translate3d(-${progress * maxShift}vw, 0, 0)`;
      setActive(Math.round(progress * (PANELS.length - 1)));
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Jump to a panel when a progress dot is clicked.
  const goTo = (i: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const scrollable = wrap.offsetHeight - window.innerHeight;
    const target = wrap.offsetTop + (i / (PANELS.length - 1)) * scrollable;
    window.scrollTo({ top: target, behavior: 'smooth' });
  };

  return (
    <div className="story" ref={wrapRef} style={{ height: `${PANELS.length * 100}vh` }}>
      <div className="story-pin">
        <div className="story-track" ref={trackRef}>
          {PANELS.map((p, i) => {
            const Icon = p.icon;
            return (
              <section className={`story-panel ${p.tone} ${active === i ? 'is-active' : ''}`} key={i}>
                <div className="story-panel-bg" style={{ backgroundImage: `url(${p.img})` }} aria-hidden="true" />
                <div className="story-panel-scrim" aria-hidden="true" />
                <div className="story-panel-content">
                  <span className="story-step-no">0{i + 1} / 0{PANELS.length}</span>
                  <span className="story-icon"><Icon size={26} /></span>
                  <h2>{t(p.titleKey)}</h2>
                  <p>{t(p.textKey)}</p>
                  {i === PANELS.length - 1 && (
                    <div className="story-actions">
                      <Link to="/products" className="btn btn-primary btn-lg">
                        {t('story.browse')} <IconArrowRight size={18} />
                      </Link>
                      <Link to="/contact" className="btn btn-ghost-light btn-lg">
                        {t('story.contact')}
                      </Link>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        {/* Kicker + progress dots overlay */}
        <div className="story-hud">
          <span className="story-kicker">
            <span className="hero-badge-dot" /> {t('story.kicker')}
          </span>
          <div className="story-dots">
            {PANELS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Step ${i + 1}`}
                className={`story-dot ${active === i ? 'active' : ''}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
