import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

type ProgressRef = { current: number };

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/** Fire intensity peaks in the middle of the scroll (step 2). */
function fireAt(p: number) {
  return clamp(1 - Math.abs(p - 0.5) / 0.5);
}
/** Shield ramps in over the second half (step 3). */
function shieldAt(p: number) {
  return clamp((p - 0.55) / 0.4);
}

// Soft round particle sprite generated once.
function makeSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// Tower geometry constants (a two-tier modern skyscraper).
const PODIUM = { w: 3.0, h: 0.7, d: 3.0, y: 0.35 };
const LOWER = { w: 2.4, h: 4.6, d: 2.4, y: 0.7 + 2.3 };
const UPPER = { w: 1.7, h: 2.2, d: 1.7, y: 0.7 + 4.6 + 1.1 };

interface WinItem {
  pos: [number, number, number];
  ry: number;
  sx: number;
  sy: number;
}

function Building({ progressRef }: { progressRef: ProgressRef }) {
  const winRef = useRef<THREE.InstancedMesh>(null);
  const winMat = useRef<THREE.MeshStandardMaterial>(null);
  const beaconRef = useRef<THREE.MeshStandardMaterial>(null);

  const windows = useMemo<WinItem[]>(() => {
    const items: WinItem[] = [];
    const sections = [
      { y0: 1.05, floors: 8, cols: 3, hw: LOWER.w / 2 + 0.02, sx: 0.42, sy: 0.42, gap: 0.56 },
      { y0: 5.55, floors: 3, cols: 2, hw: UPPER.w / 2 + 0.02, sx: 0.34, sy: 0.4, gap: 0.5 },
    ];
    const sides: { ry: number; axis: 'x' | 'z'; sign: number }[] = [
      { ry: 0, axis: 'z', sign: 1 },
      { ry: Math.PI, axis: 'z', sign: -1 },
      { ry: Math.PI / 2, axis: 'x', sign: 1 },
      { ry: -Math.PI / 2, axis: 'x', sign: -1 },
    ];
    for (const s of sections) {
      for (const side of sides) {
        for (let f = 0; f < s.floors; f++) {
          for (let c = 0; c < s.cols; c++) {
            const y = s.y0 + f * 0.5;
            const off = (c - (s.cols - 1) / 2) * s.gap;
            const x = side.axis === 'x' ? side.sign * s.hw : off;
            const z = side.axis === 'z' ? side.sign * s.hw : off;
            items.push({ pos: [x, y, z], ry: side.ry, sx: s.sx, sy: s.sy });
          }
        }
      }
    }
    return items;
  }, []);

  useEffect(() => {
    const mesh = winRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    windows.forEach((w, i) => {
      e.set(0, w.ry, 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(...w.pos), q, new THREE.Vector3(w.sx, w.sy, 0.06));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [windows]);

  useFrame((state) => {
    const p = progressRef.current;
    const fire = fireAt(p);
    const safe = shieldAt(p);
    if (winMat.current) {
      const col = new THREE.Color().lerpColors(
        new THREE.Color('#cfe0ff'),
        new THREE.Color('#ff6a2b'),
        fire,
      );
      // tint slightly blue when protected
      col.lerp(new THREE.Color('#93c5fd'), safe * 0.5);
      winMat.current.emissive = col;
      winMat.current.emissiveIntensity = 0.5 + fire * 1.9 + safe * 0.6;
    }
    if (beaconRef.current) {
      beaconRef.current.emissiveIntensity = 0.5 + Math.abs(Math.sin(state.clock.elapsedTime * 2.2)) * 1.5;
    }
  });

  const towerMat = (
    <meshStandardMaterial color="#1b2740" roughness={0.38} metalness={0.55} />
  );

  return (
    <group>
      {/* podium */}
      <mesh position={[0, PODIUM.y, 0]} castShadow receiveShadow>
        <boxGeometry args={[PODIUM.w, PODIUM.h, PODIUM.d]} />
        <meshStandardMaterial color="#141d31" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* lower tower */}
      <mesh position={[0, LOWER.y, 0]} castShadow>
        <boxGeometry args={[LOWER.w, LOWER.h, LOWER.d]} />
        {towerMat}
      </mesh>
      {/* setback floor slab */}
      <mesh position={[0, 0.7 + 4.6 + 0.04, 0]}>
        <boxGeometry args={[LOWER.w + 0.12, 0.16, LOWER.d + 0.12]} />
        <meshStandardMaterial color="#0f1727" roughness={0.7} />
      </mesh>
      {/* upper tower */}
      <mesh position={[0, UPPER.y, 0]} castShadow>
        <boxGeometry args={[UPPER.w, UPPER.h, UPPER.d]} />
        {towerMat}
      </mesh>
      {/* roof cap */}
      <mesh position={[0, 0.7 + 4.6 + 2.2 + 0.1, 0]}>
        <boxGeometry args={[UPPER.w + 0.1, 0.2, UPPER.d + 0.1]} />
        <meshStandardMaterial color="#0f1727" roughness={0.7} />
      </mesh>
      {/* antenna mast */}
      <mesh position={[0, 0.7 + 4.6 + 2.2 + 0.9, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 1.5, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* red rooftop beacon */}
      <mesh position={[0, 0.7 + 4.6 + 2.2 + 1.7, 0]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial ref={beaconRef} color="#ef4444" emissive="#ef4444" emissiveIntensity={1} />
      </mesh>
      {/* windows */}
      <instancedMesh ref={winRef} args={[undefined, undefined, windows.length]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial ref={winMat} color="#0b1220" emissive="#cfe0ff" emissiveIntensity={0.6} roughness={0.25} metalness={0.4} />
      </instancedMesh>
    </group>
  );
}

function Particles({ progressRef, kind }: { progressRef: ProgressRef; kind: 'fire' | 'smoke' }) {
  const ref = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);
  const sprite = useMemo(makeSprite, []);
  const COUNT = kind === 'fire' ? 650 : 320;

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2.4;
      positions[i * 3 + 1] = Math.random() * 7;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2.4;
      speeds[i] = 0.8 + Math.random() * 1.7;
    }
    return { positions, speeds };
  }, [COUNT]);

  useFrame((_, dt) => {
    const pts = ref.current;
    if (!pts) return;
    const fire = fireAt(progressRef.current);
    const arr = pts.geometry.attributes.position.array as Float32Array;
    const top = kind === 'fire' ? 7.2 : 10;
    const d = Math.min(dt, 0.05);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] += speeds[i] * d * (kind === 'fire' ? 1.5 : 1.0);
      arr[i * 3] += Math.sin((arr[i * 3 + 1] + i) * 1.5) * d * 0.15;
      if (arr[i * 3 + 1] > top) {
        arr[i * 3 + 1] = 0.4;
        arr[i * 3] = (Math.random() - 0.5) * 2.4;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 2.4;
      }
    }
    pts.geometry.attributes.position.needsUpdate = true;
    if (matRef.current) {
      matRef.current.opacity = (kind === 'fire' ? 0.9 : 0.4) * fire;
      matRef.current.size = (kind === 'fire' ? 0.7 : 1.3) * (0.6 + fire * 0.6);
    }
    pts.visible = fire > 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        map={sprite}
        color={kind === 'fire' ? '#ff7a18' : '#9ca3af'}
        transparent
        depthWrite={false}
        blending={kind === 'fire' ? THREE.AdditiveBlending : THREE.NormalBlending}
        size={0.7}
        sizeAttenuation
      />
    </points>
  );
}

// Clean energy dome (smooth shell + neat lat/long wireframe + glowing base ring).
function Shield({ progressRef }: { progressRef: ProgressRef }) {
  const grp = useRef<THREE.Group>(null);
  const shell = useRef<THREE.MeshStandardMaterial>(null);
  const wire = useRef<THREE.MeshBasicMaterial>(null);
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  const R = 4.4;

  useFrame((state, dt) => {
    const s = shieldAt(progressRef.current);
    const g = grp.current;
    if (!g) return;
    g.visible = s > 0.02;
    g.rotation.y += dt * 0.12;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.015;
    g.scale.set((0.9 + s * 0.1) * pulse, (0.9 + s * 0.1) * 1.7 * pulse, (0.9 + s * 0.1) * pulse);
    if (shell.current) shell.current.opacity = s * 0.12;
    if (wire.current) wire.current.opacity = s * 0.18;
    if (ring.current) ring.current.opacity = s * (0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2);
  });

  return (
    <group ref={grp} position={[0, 0.7, 0]}>
      <mesh>
        <sphereGeometry args={[R, 48, 28, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          ref={shell}
          color="#2563eb"
          emissive="#1d4ed8"
          emissiveIntensity={0.7}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[R + 0.02, 22, 11, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial ref={wire} color="#60a5fa" wireframe transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <torusGeometry args={[R, 0.05, 10, 80]} />
        <meshBasicMaterial ref={ring} color="#3b82f6" transparent opacity={0} />
      </mesh>
    </group>
  );
}

function Rig({ progressRef }: { progressRef: ProgressRef }) {
  const { camera } = useThree();
  const light = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    const p = progressRef.current;
    const fire = fireAt(p);
    const angle = -0.6 + p * 1.5 + state.clock.elapsedTime * 0.035;
    const radius = 12 - p * 1.5;
    camera.position.x = Math.sin(angle) * radius;
    camera.position.z = Math.cos(angle) * radius;
    camera.position.y = 5 + Math.sin(state.clock.elapsedTime * 0.5) * 0.25;
    camera.lookAt(0, 3.6, 0);
    if (light.current) {
      light.current.intensity = 0.3 + fire * 7 * (0.7 + Math.sin(state.clock.elapsedTime * 25) * 0.3);
      light.current.color.set(fire > 0.5 ? '#ff5a1f' : '#ff8a3d');
    }
  });
  return <pointLight ref={light} position={[0, 2.8, 0]} distance={22} color="#ff7a18" intensity={0} />;
}

export function FireStoryScene({ progressRef }: { progressRef: ProgressRef }) {
  return (
    <>
      <color attach="background" args={['#0a0f1e']} />
      <fog attach="fog" args={['#0a0f1e', 16, 34]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[7, 12, 6]} intensity={1.2} castShadow />
      <directionalLight position={[-8, 4, -6]} intensity={0.4} color="#3b82f6" />
      <hemisphereLight args={['#1e3a8a', '#0a0f1e', 0.55]} />
      <Rig progressRef={progressRef} />
      <Building progressRef={progressRef} />
      <Particles progressRef={progressRef} kind="fire" />
      <Particles progressRef={progressRef} kind="smoke" />
      <Shield progressRef={progressRef} />
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[18, 56]} />
        <meshStandardMaterial color="#0c1322" roughness={1} metalness={0.1} />
      </mesh>
    </>
  );
}
