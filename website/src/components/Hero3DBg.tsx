import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { FireStoryScene } from './FireStoryScene';

/**
 * Calm 3D building backdrop for the homepage hero (progress fixed at 0 — glowing
 * windows, slow camera drift, no fire). Loaded lazily so three.js stays out of
 * the main bundle.
 */
export function Hero3DBg() {
  const progressRef = useRef(0);
  return (
    <Canvas className="hero-canvas" shadows dpr={[1, 2]} camera={{ position: [0, 4.5, 11], fov: 45 }}>
      <FireStoryScene progressRef={progressRef} />
    </Canvas>
  );
}
