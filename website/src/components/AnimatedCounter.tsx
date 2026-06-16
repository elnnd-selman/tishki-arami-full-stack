import { useEffect, useRef } from 'react';

interface Props {
  target: number;
  inView: boolean;
  suffix?: string;
  duration?: number;
}

export function AnimatedCounter({ target, inView, suffix = '', duration = 1800 }: Props) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const el = spanRef.current;
    if (!el) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(eased * target) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, suffix, duration]);

  return <span ref={spanRef}>0{suffix}</span>;
}
