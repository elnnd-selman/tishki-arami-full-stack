import { Suspense, lazy } from 'react';
import { HeroContent, type HeroStats } from './HeroContent';

// three.js loads on demand; until then the photo background shows.
const Hero3DBg = lazy(() => import('./Hero3DBg').then((m) => ({ default: m.Hero3DBg })));

/** Homepage hero with a live 3D building backdrop. */
export function Hero3D({ stats }: { stats: HeroStats }) {
  return (
    <section className="hero hero--3d">
      <Suspense fallback={<div className="hero-bg" aria-hidden="true" />}>
        <Hero3DBg />
      </Suspense>
      <div className="hero-scrim" aria-hidden="true" />
      <HeroContent stats={stats} />
    </section>
  );
}
