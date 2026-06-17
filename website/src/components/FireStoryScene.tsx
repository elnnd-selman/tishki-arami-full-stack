import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, Sky, Cloud, Stars } from '@react-three/drei';
import * as THREE from 'three';

type ProgressRef = { current: number };

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const fireAt = (p: number) => clamp(1 - Math.abs(p - 0.5) / 0.5);
const shieldAt = (p: number) => clamp((p - 0.55) / 0.4);

// ---- day / night palettes -------------------------------------------------
interface Pal {
  bg: string;
  fog: [number, number];
  ground: string;
  amb: number;
  sun: number;
  sunColor: string;
  hemiSky: string;
  hemiGround: string;
  hemiInt: number;
  tower: string;
  towerMetal: number;
  towerRough: number;
  winBase: string;
  winEmissive: number;
  glass: string;
  concrete: string;
  cityEmissive: number;
  envInt: number;
  night: boolean;
}
const DAY: Pal = {
  bg: '#dfe8f5', fog: [30, 72], ground: '#c4d0e2',
  amb: 0.55, sun: 1.7, sunColor: '#ffffff', hemiSky: '#ffffff', hemiGround: '#c4d0e2', hemiInt: 0.5,
  tower: '#a9bdd9', towerMetal: 0.9, towerRough: 0.1, winBase: '#9fb6db', winEmissive: 0.12,
  glass: '#aebfd6', concrete: '#c2ccdb', cityEmissive: 0.0, envInt: 1.0, night: false,
};
const NIGHT: Pal = {
  bg: '#070b16', fog: [24, 74], ground: '#0a0f1c',
  amb: 0.22, sun: 0.45, sunColor: '#9fb4e6', hemiSky: '#1e3a8a', hemiGround: '#05080f', hemiInt: 0.4,
  tower: '#18213a', towerMetal: 0.85, towerRough: 0.2, winBase: '#cfe0ff', winEmissive: 1.0,
  glass: '#141d33', concrete: '#1a2438', cityEmissive: 0.9, envInt: 0.35, night: true,
};

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

function makeFacade(seed: number) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#cdd7e6';
  ctx.fillRect(0, 0, 64, 128);
  const cols = 4;
  const rows = 11;
  const m = 5;
  const gw = (64 - m * (cols + 1)) / cols;
  const gh = (128 - m * (rows + 1)) / rows;
  let n = seed * 9301 + 49297;
  const rnd = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      ctx.fillStyle = rnd() > 0.5 ? '#cfe0ff' : '#2a3957'; // lit vs dark window
      ctx.fillRect(m + col * (gw + m), m + r * (gh + m), gw, gh);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeGround() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#9aa6ba';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#c3cedd';
  ctx.fillRect(14, 14, 100, 100);
  ctx.fillStyle = '#cdd7e4';
  ctx.fillRect(20, 20, 88, 88);
  ctx.strokeStyle = '#e8edf4';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(7, 0); ctx.lineTo(7, 128);
  ctx.moveTo(0, 7); ctx.lineTo(128, 7);
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const CELL = 4.4;

function City({ pal }: { pal: Pal }) {
  const base = useMemo(() => [makeFacade(7), makeFacade(19), makeFacade(31)], []);
  const buildings = useMemo(() => {
    const arr: { x: number; z: number; w: number; h: number; d: number; ti: number; rx: number; rz: number; glass: boolean }[] = [];
    let n = 777;
    const rnd = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
    const R = 4;
    for (let gx = -R; gx <= R; gx++) {
      for (let gz = -R; gz <= R; gz++) {
        if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) continue;
        const h = 1.3 + rnd() * 3.3;
        const w = 1.7 + rnd() * 1.1;
        const d = 1.7 + rnd() * 1.1;
        arr.push({
          x: gx * CELL + (rnd() - 0.5) * 1.0,
          z: gz * CELL + (rnd() - 0.5) * 1.0,
          w, h, d,
          ti: Math.floor(rnd() * base.length),
          rx: Math.max(1, Math.round(w)),
          rz: Math.max(1, Math.round(h / 1.6)),
          glass: rnd() > 0.45,
        });
      }
    }
    return arr;
  }, [base.length]);

  const texes = useMemo(
    () =>
      buildings.map((b) => {
        const t = base[b.ti].clone();
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(b.rx, b.rz);
        t.needsUpdate = true;
        return t;
      }),
    [buildings, base],
  );

  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]} castShadow receiveShadow>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial
            map={texes[i]}
            emissiveMap={texes[i]}
            emissive="#fff4d6"
            emissiveIntensity={pal.cityEmissive}
            color={b.glass ? pal.glass : pal.concrete}
            roughness={b.glass ? 0.14 : 0.85}
            metalness={b.glass ? 0.85 : 0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

// Moving cars with headlights/taillights along the street grid.
function Cars({ pal }: { pal: Pal }) {
  const lanes = useMemo(() => {
    const arr: { axis: 'x' | 'z'; fixed: number; pos: number; speed: number; color: string }[] = [];
    let n = 2024;
    const rnd = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
    const colors = ['#dc2626', '#2563eb', '#e5e7eb', '#475569', '#f59e0b', '#cbd5e1'];
    for (let g = -4; g <= 3; g++) {
      const road = (g + 0.5) * CELL;
      for (let k = 0; k < 2; k++) {
        const dir = k === 0 ? 1 : -1;
        arr.push({ axis: 'z', fixed: road + dir * 0.8, pos: rnd() * 36 - 18, speed: (2.5 + rnd() * 3) * dir, color: colors[Math.floor(rnd() * colors.length)] });
        arr.push({ axis: 'x', fixed: road + dir * 0.8, pos: rnd() * 36 - 18, speed: (2.5 + rnd() * 3) * dir, color: colors[Math.floor(rnd() * colors.length)] });
      }
    }
    return arr;
  }, []);
  const refs = useRef<(THREE.Group | null)[]>([]);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    lanes.forEach((l, i) => {
      const m = refs.current[i];
      if (!m) return;
      l.pos += l.speed * d;
      if (l.pos > 18) l.pos = -18;
      if (l.pos < -18) l.pos = 18;
      if (l.axis === 'z') {
        m.position.set(l.fixed, 0.16, l.pos);
        m.rotation.y = l.speed > 0 ? 0 : Math.PI;
      } else {
        m.position.set(l.pos, 0.16, l.fixed);
        m.rotation.y = l.speed > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    });
  });

  return (
    <group>
      {lanes.map((l, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>
          <mesh castShadow position={[0, 0.12, 0]}>
            <boxGeometry args={[0.5, 0.22, 1.05]} />
            <meshStandardMaterial color={l.color} roughness={0.4} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.3, -0.05]}>
            <boxGeometry args={[0.44, 0.2, 0.5]} />
            <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.6} />
          </mesh>
          {/* headlights / taillights glow at night */}
          <mesh position={[0, 0.12, 0.54]}>
            <boxGeometry args={[0.42, 0.1, 0.04]} />
            <meshStandardMaterial color="#fff8e1" emissive="#fff3c4" emissiveIntensity={pal.night ? 3 : 0} />
          </mesh>
          <mesh position={[0, 0.12, -0.54]}>
            <boxGeometry args={[0.42, 0.1, 0.04]} />
            <meshStandardMaterial color="#7f1d1d" emissive="#ef4444" emissiveIntensity={pal.night ? 2 : 0} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const PODIUM = { w: 3.8, h: 1.0, d: 3.8 };
const LOWER = { w: 3.2, h: 7.0, d: 3.2 };
const UPPER = { w: 2.3, h: 4.2, d: 2.3 };
const PODIUM_Y = PODIUM.h / 2;
const LOWER_Y = PODIUM.h + LOWER.h / 2;
const UPPER_Y = PODIUM.h + LOWER.h + UPPER.h / 2;
const LOWER_TOP = PODIUM.h + LOWER.h;
const TOP = PODIUM.h + LOWER.h + UPPER.h;

interface WinItem { pos: [number, number, number]; ry: number; sx: number; sy: number }

function Building({ progressRef, pal }: { progressRef: ProgressRef; pal: Pal }) {
  const winRef = useRef<THREE.InstancedMesh>(null);
  const winMat = useRef<THREE.MeshStandardMaterial>(null);
  const beaconRef = useRef<THREE.MeshStandardMaterial>(null);

  const windows = useMemo<WinItem[]>(() => {
    const items: WinItem[] = [];
    const sections = [
      { y0: PODIUM.h + 0.5, floors: 11, sp: 0.55, cols: 4, hw: LOWER.w / 2 + 0.02, sx: 0.45, sy: 0.45, gap: 0.72 },
      { y0: LOWER_TOP + 0.5, floors: 5, sp: 0.55, cols: 3, hw: UPPER.w / 2 + 0.02, sx: 0.36, sy: 0.42, gap: 0.6 },
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
            const y = s.y0 + f * s.sp;
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
    const fire = fireAt(progressRef.current);
    if (winMat.current) {
      const col = new THREE.Color().lerpColors(new THREE.Color(pal.winBase), new THREE.Color('#ff6a2b'), fire);
      winMat.current.emissive = col;
      winMat.current.emissiveIntensity = pal.winEmissive + fire * 2.0;
    }
    if (beaconRef.current) {
      beaconRef.current.emissiveIntensity = 0.6 + Math.abs(Math.sin(state.clock.elapsedTime * 2.2)) * 1.4;
    }
  });

  const towerMat = <meshStandardMaterial color={pal.tower} roughness={pal.towerRough} metalness={pal.towerMetal} />;
  const trim = pal.night ? '#0f1727' : '#6c80a4';

  return (
    <group>
      <mesh position={[0, PODIUM_Y, 0]} castShadow receiveShadow>
        <boxGeometry args={[PODIUM.w, PODIUM.h, PODIUM.d]} />
        <meshStandardMaterial color={pal.night ? '#222d49' : '#8ea2c0'} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, LOWER_Y, 0]} castShadow>
        <boxGeometry args={[LOWER.w, LOWER.h, LOWER.d]} />
        {towerMat}
      </mesh>
      <mesh position={[0, LOWER_TOP + 0.08, 0]}>
        <boxGeometry args={[LOWER.w + 0.14, 0.2, LOWER.d + 0.14]} />
        <meshStandardMaterial color={trim} roughness={0.6} />
      </mesh>
      <mesh position={[0, UPPER_Y, 0]} castShadow>
        <boxGeometry args={[UPPER.w, UPPER.h, UPPER.d]} />
        {towerMat}
      </mesh>
      <mesh position={[0, TOP + 0.12, 0]}>
        <boxGeometry args={[UPPER.w + 0.12, 0.24, UPPER.d + 0.12]} />
        <meshStandardMaterial color={trim} roughness={0.6} />
      </mesh>
      <mesh position={[0, TOP + 1.2, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 2.0, 8]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, TOP + 2.3, 0]}>
        <sphereGeometry args={[0.11, 12, 12]} />
        <meshStandardMaterial ref={beaconRef} color="#ef4444" emissive="#ef4444" emissiveIntensity={1} />
      </mesh>
      <instancedMesh ref={winRef} args={[undefined, undefined, windows.length]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial ref={winMat} color={pal.night ? '#16203a' : '#3f5680'} emissive={pal.winBase} emissiveIntensity={pal.winEmissive} roughness={0.15} metalness={0.5} />
      </instancedMesh>
    </group>
  );
}

function Particles({ progressRef, kind, pal }: { progressRef: ProgressRef; kind: 'fire' | 'smoke'; pal: Pal }) {
  const ref = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);
  const sprite = useMemo(makeSprite, []);
  const COUNT = kind === 'fire' ? 650 : 320;

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 3.0;
      positions[i * 3 + 1] = Math.random() * 9;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3.0;
      speeds[i] = 1.0 + Math.random() * 2.2;
    }
    return { positions, speeds };
  }, [COUNT]);

  useFrame((_, dt) => {
    const pts = ref.current;
    if (!pts) return;
    const fire = fireAt(progressRef.current);
    const arr = pts.geometry.attributes.position.array as Float32Array;
    const top = kind === 'fire' ? 9.5 : 15;
    const d = Math.min(dt, 0.05);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] += speeds[i] * d * (kind === 'fire' ? 1.5 : 1.0);
      arr[i * 3] += Math.sin((arr[i * 3 + 1] + i) * 1.5) * d * 0.15;
      if (arr[i * 3 + 1] > top) {
        arr[i * 3 + 1] = 0.5;
        arr[i * 3] = (Math.random() - 0.5) * 3.0;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 3.0;
      }
    }
    pts.geometry.attributes.position.needsUpdate = true;
    if (matRef.current) {
      matRef.current.opacity = (kind === 'fire' ? 0.95 : 0.5) * fire;
      matRef.current.size = (kind === 'fire' ? 0.7 : 1.3) * (0.6 + fire * 0.6);
    }
    pts.visible = fire > 0.02;
  });

  // Fire glows (additive) at night; reads as solid orange (normal) by day.
  const blending = kind === 'fire' && pal.night ? THREE.AdditiveBlending : THREE.NormalBlending;

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        map={sprite}
        color={kind === 'fire' ? '#ff5a1f' : pal.night ? '#3a3f4a' : '#8b93a3'}
        transparent
        depthWrite={false}
        blending={blending}
        size={0.7}
        sizeAttenuation
      />
    </points>
  );
}

function Shield({ progressRef }: { progressRef: ProgressRef }) {
  const grp = useRef<THREE.Group>(null);
  const shell = useRef<THREE.MeshStandardMaterial>(null);
  const wire = useRef<THREE.MeshBasicMaterial>(null);
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  const R = 4.6;

  useFrame((state, dt) => {
    const s = shieldAt(progressRef.current);
    const g = grp.current;
    if (!g) return;
    g.visible = s > 0.02;
    g.rotation.y += dt * 0.12;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.015;
    g.scale.set((0.9 + s * 0.1) * pulse, (0.9 + s * 0.1) * 2.9 * pulse, (0.9 + s * 0.1) * pulse);
    if (shell.current) shell.current.opacity = s * 0.16;
    if (wire.current) wire.current.opacity = s * 0.28;
    if (ring.current) ring.current.opacity = s * (0.6 + Math.sin(state.clock.elapsedTime * 2) * 0.2);
  });

  return (
    <group ref={grp} position={[0, 0.5, 0]}>
      <mesh>
        <sphereGeometry args={[R, 48, 28, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial ref={shell} color="#2563eb" emissive="#1d4ed8" emissiveIntensity={0.6} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
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
    const angle = -0.6 + p * 1.4 + state.clock.elapsedTime * 0.03;
    const radius = 26 - p * 3;
    camera.position.x = Math.sin(angle) * radius;
    camera.position.z = Math.cos(angle) * radius;
    camera.position.y = 12 + Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
    camera.lookAt(0, 5.5, 0);
    if (light.current) {
      light.current.intensity = fire * 6 * (0.7 + Math.sin(state.clock.elapsedTime * 25) * 0.3);
    }
  });
  return <pointLight ref={light} position={[0, 6, 0]} distance={26} color="#ff7a18" intensity={0} />;
}

function Ground({ pal }: { pal: Pal }) {
  const tex = useMemo(makeGround, []);
  tex.repeat.set(18, 18);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial map={tex} color={pal.night ? '#33405e' : '#ffffff'} roughness={0.9} metalness={0.05} />
    </mesh>
  );
}

export function FireStoryScene({ progressRef, night = false }: { progressRef: ProgressRef; night?: boolean }) {
  const pal = night ? NIGHT : DAY;
  return (
    <>
      <color attach="background" args={[pal.bg]} />
      <fog attach="fog" args={[pal.bg, pal.fog[0], pal.fog[1]]} />
      <ambientLight intensity={pal.amb} />
      <directionalLight
        position={[12, 18, 9]}
        intensity={pal.sun}
        color={pal.sunColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
        shadow-bias={-0.0004}
      />
      <hemisphereLight args={[pal.hemiSky, pal.hemiGround, pal.hemiInt]} />
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={1.4 * pal.envInt} position={[0, 8, 0]} scale={[20, 20, 1]} color="#ffffff" />
        <Lightformer intensity={0.7 * pal.envInt} position={[10, 4, 10]} scale={[10, 10, 1]} color="#cfe0ff" />
        <Lightformer intensity={0.5 * pal.envInt} position={[-10, 3, -8]} scale={[10, 10, 1]} color="#dbe6f7" />
      </Environment>

      {night ? (
        <Stars radius={80} depth={40} count={2500} factor={4} saturation={0} fade speed={0.6} />
      ) : (
        <>
          <Sky sunPosition={[12, 18, 9]} turbidity={6} rayleigh={1.2} />
          <Cloud position={[-14, 20, -10]} speed={0.2} opacity={0.5} bounds={[10, 2, 6]} />
          <Cloud position={[16, 22, -6]} speed={0.2} opacity={0.4} bounds={[12, 2, 6]} />
        </>
      )}

      <Rig progressRef={progressRef} />
      <City pal={pal} />
      <Cars pal={pal} />
      <Building progressRef={progressRef} pal={pal} />
      <Particles progressRef={progressRef} kind="fire" pal={pal} />
      <Particles progressRef={progressRef} kind="smoke" pal={pal} />
      <Shield progressRef={progressRef} />
      <Ground pal={pal} />
    </>
  );
}
