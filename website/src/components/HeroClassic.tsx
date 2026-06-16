import { HeroContent, type HeroStats } from './HeroContent';

/**
 * Classic photo-background hero (kept as a backup / fallback option).
 * Swap it back into HomePage by rendering <HeroClassic /> instead of <Hero3D />.
 */
export function HeroClassic({ stats }: { stats: HeroStats }) {
  return (
    <section className="hero">
      <div className="hero-bg" aria-hidden="true" />
      <div className="hero-scrim" aria-hidden="true" />
      <HeroContent stats={stats} />
    </section>
  );
}
