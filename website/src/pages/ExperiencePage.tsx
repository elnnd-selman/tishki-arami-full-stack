import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Canvas } from '@react-three/fiber';
import { FireStoryScene } from '../components/FireStoryScene';
import { IconArrowRight, IconClock, IconShield, IconCheck } from '../components/Icons';

/**
 * Real-time 3D scroll-story. A WebGL scene (procedural building) is pinned to the
 * viewport; scrolling drives a shared progressRef that the 3D scene reads each
 * frame — the building catches fire (step 2) then is protected by a shield (step 3).
 */
const STEPS = [
  { icon: IconClock, titleKey: 'story.step1Title', textKey: 'story.step1Text', chapterKey: 'story.ch1' },
  { icon: IconShield, titleKey: 'story.step2Title', textKey: 'story.step2Text', chapterKey: 'story.ch2' },
  { icon: IconCheck, titleKey: 'story.step3Title', textKey: 'story.step3Text', chapterKey: 'story.ch3' },
];

export function ExperiencePage() {
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = wrap.getBoundingClientRect();
      const scrollable = wrap.offsetHeight - window.innerHeight;
      const p = scrollable > 0 ? Math.min(Math.max(-rect.top / scrollable, 0), 1) : 0;
      progressRef.current = p;
      setActive(Math.round(p * (STEPS.length - 1)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const goTo = (i: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const scrollable = wrap.offsetHeight - window.innerHeight;
    window.scrollTo({ top: wrap.offsetTop + (i / (STEPS.length - 1)) * scrollable, behavior: 'smooth' });
  };

  const ActiveIcon = STEPS[active].icon;

  return (
    <div className="story3d" ref={wrapRef}>
      <div className="story3d-pin">
        <Canvas
          className="story3d-canvas"
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 4.5, 11], fov: 45 }}
        >
          <FireStoryScene progressRef={progressRef} />
        </Canvas>

        {/* Story UI overlay */}
        <div className="s3-overlay">
          {/* top brand line */}
          <div className="s3-top">
            <span className="s3-lead"><span className="hero-badge-dot" /> {t('story.lead')}</span>
            <span className="s3-kicker">{t('story.kicker')}</span>
          </div>

          {/* content panel */}
          <div className="s3-panel">
            <span className="s3-num" key={`n${active}`}>0{active + 1}</span>
            <div className="s3-body" key={`b${active}`}>
              <span className="s3-chapter">
                <ActiveIcon size={15} /> {t(STEPS[active].chapterKey)}
              </span>
              <h2>{t(STEPS[active].titleKey)}</h2>
              <p>{t(STEPS[active].textKey)}</p>
              {active === STEPS.length - 1 && (
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
          </div>

          {/* chapter rail */}
          <div className="s3-rail">
            {STEPS.map((s, i) => (
              <button
                key={i}
                type="button"
                className={`s3-chip ${active === i ? 'active' : ''} ${i < active ? 'done' : ''}`}
                onClick={() => goTo(i)}
              >
                <span className="s3-chip-no">0{i + 1}</span>
                <span className="s3-chip-label">{t(s.chapterKey)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
