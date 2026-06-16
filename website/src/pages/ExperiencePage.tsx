import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Canvas } from '@react-three/fiber';
import { FireStoryScene } from '../components/FireStoryScene';
import { HandControl, type HandState } from '../components/HandControl';
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

/** Animated reveal: letter-by-letter for LTR, word-by-word for RTL (so Arabic /
 *  Kurdish letters stay joined). Re-mounts via `key` so it replays per chapter. */
function RevealText({ text, rtl }: { text: string; rtl: boolean }) {
  if (rtl) {
    const words = text.split(' ');
    return (
      <>
        {words.map((w, i) => (
          <span key={i} className="s3-word" style={{ animationDelay: `${i * 0.09}s` }}>
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </>
    );
  }
  return (
    <>
      {[...text].map((ch, i) => (
        <span key={i} className="s3-char" style={{ animationDelay: `${i * 0.028}s` }}>
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </>
  );
}

export function ExperiencePage() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const wrapRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const targetRef = useRef(0);
  const handModeRef = useRef(false);
  const [active, setActive] = useState(0);
  const [handMode, setHandMode] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      if (handModeRef.current) return; // hand gesture drives progress instead
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

  // While hand mode is on, smoothly ease progress toward the gesture target.
  useEffect(() => {
    handModeRef.current = handMode;
    if (!handMode) return;
    targetRef.current = progressRef.current;
    let raf = 0;
    const tick = () => {
      progressRef.current += (targetRef.current - progressRef.current) * 0.07;
      setActive(Math.round(progressRef.current * (STEPS.length - 1)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [handMode]);

  // open hand -> fire (mid), closed fist -> safe (end)
  const onHand = useCallback((s: HandState) => {
    if (s === 'open') targetRef.current = 0.5;
    else if (s === 'closed') targetRef.current = 1;
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

          {/* hand-gesture control */}
          <button
            type="button"
            className={`s3-handbtn ${handMode ? 'active' : ''}`}
            onClick={() => setHandMode((v) => !v)}
          >
            {handMode ? t('story.handStop', { defaultValue: 'Stop camera' }) : t('story.handStart', { defaultValue: 'Control with hand' })}
          </button>
          {handMode && <HandControl onState={onHand} />}

          {/* content panel */}
          <div className="s3-panel">
            <span className="s3-num" key={`n${active}`}>0{active + 1}</span>
            <div className="s3-body" key={`b${active}`}>
              <span className="s3-chapter">
                <ActiveIcon size={15} /> {t(STEPS[active].chapterKey)}
              </span>
              <h2 key={`h${active}`} className="s3-typed">
                <RevealText text={t(STEPS[active].titleKey)} rtl={rtl} />
              </h2>
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

          {/* chapter timeline */}
          <div className="s3-timeline">
            <div className="s3-tl-track">
              <div
                className="s3-tl-fill"
                style={{ width: `${(active / (STEPS.length - 1)) * 100}%` }}
              />
              {STEPS.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={t(s.chapterKey)}
                  className={`s3-tl-node ${active >= i ? 'reached' : ''} ${active === i ? 'active' : ''}`}
                  style={{ left: `${(i / (STEPS.length - 1)) * 100}%` }}
                  onClick={() => goTo(i)}
                >
                  <span className="s3-tl-label">{t(s.chapterKey)}</span>
                  <span className="s3-tl-dot" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
