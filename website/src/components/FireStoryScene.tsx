import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
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

// Daytime facade texture: light panels with blue-grey glass windows.
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
      ctx.fillStyle = rnd() > 0.5 ? '#5b7099' : '#8fa6c8';
      ctx.fillRect(m + col * (gw + m), m + r * (gh + m), gw, gh);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Street-grid ground: light plots with darker asphalt roads between blocks.
function makeGround() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#9aa6ba'; // asphalt
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#c3cedd'; // plot / sidewalk block
  ctx.fillRect(14, 14, 100, 100);
  ctx.fillStyle = '#cdd7e4';
  ctx.fillRect(20, 20, 88, 88);
  // lane markings
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

// A real city laid out on a block grid around a central plaza (the hero tower).
function City() {
  const base = useMemo(() => [makeFacade(7), makeFacade(19), makeFacade(31)], []);
  const buildings = useMemo(() => {
    const arr: {
      x: number; z: number; w: number; h: number; d: number; ti: number; rx: number; rz: number; glass: boolean;
    }[] = [];
    let n = 777;
    const rnd = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
    const R = 4; // grid half-extent -> 9x9 blocks
    const cell = 4.4;
    for (let gx = -R; gx <= R; gx++) {
      for (let gz = -R; gz <= R; gz++) {
        if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) continue; // central plaza for the hero tower
        const h = 2.5 + rnd() * 8.5;
        const w = 2.2 + rnd() * 1.3;
        const d = 2.2 + rnd() * 1.3;
        arr.push({
          x: gx * cell + (rnd() - 0.5) * 1.0,
          z: gz * cell + (rnd() - 0.5) * 1.0,
          w,
          h,
          d,
          ti: Math.floor(rnd() * base.length),
          rx: Math.max(1, Math.round(w)),
          rz: Math.max(1, Math.round(h / 1.6)),
          glass: rnd() > 0.45, // mix of glass towers and concrete blocks
        });
      }
    }
    return arr;
  }, [base.length]);

  // Per-building texture clone so window rows stay roughly square (independent repeat).
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
          {b.glass ? (
            <meshStandardMaterial map={texes[i]} color="#aebfd6" roughness={0.12} metalness={0.85} />
          ) : (
            <meshStandardMaterial map={texes[i]} color="#c2ccdb" roughness={0.85} metalness={0.1} />
          )}
        </mesh>
      ))}
    </group>
  );
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
    if (winMat.current) {
      // glass reflective by day; glows orange while burning
      const col = new THREE.Color().lerpColors(new THREE.Color('#9fb6db'), new THREE.Color('#ff6a2b'), fire);
      winMat.current.emissive = col;
      winMat.current.emissiveIntensity = 0.12 + fire * 2.0;
    }
    if (beaconRef.current) {
      beaconRef.current.emissiveIntensity = 0.6 + Math.abs(Math.sin(state.clock.elapsedTime * 2.2)) * 1.4;
    }
  });

  const towerMat = <meshStandardMaterial color="#a9bdd9" roughness={0.1} metalness={0.9} />;

  return (
    <group>
      <mesh position={[0, PODIUM.y, 0]} castShadow receiveShadow>
        <boxGeometry args={[PODIUM.w, PODIUM.h, PODIUM.d]} />
        <meshStandardMaterial color="#8ea2c0" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, LOWER.y, 0]} castShadow>
        <boxGeometry args={[LOWER.w, LOWER.h, LOWER.d]} />
        {towerMat}
      </mesh>
      <mesh position={[0, 0.7 + 4.6 + 0.04, 0]}>
        <boxGeometry args={[LOWER.w + 0.12, 0.16, LOWER.d + 0.12]} />
        <meshStandardMaterial color="#6c80a4" roughness={0.6} />
      </mesh>
      <mesh position={[0, UPPER.y, 0]} castShadow>
        <boxGeometry args={[UPPER.w, UPPER.h, UPPER.d]} />
        {towerMat}
      </mesh>
      <mesh position={[0, 0.7 + 4.6 + 2.2 + 0.1, 0]}>
        <boxGeometry args={[UPPER.w + 0.1, 0.2, UPPER.d + 0.1]} />
        <meshStandardMaterial color="#6c80a4" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.7 + 4.6 + 2.2 + 0.9, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 1.5, 8]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.7 + 4.6 + 2.2 + 1.7, 0]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial ref={beaconRef} color="#ef4444" emissive="#ef4444" emissiveIntensity={1} />
      </mesh>
      <instancedMesh ref={winRef} args={[undefined, undefined, windows.length]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial ref={winMat} color="#3f5680" emissive="#9fb6db" emissiveIntensity={0.12} roughness={0.15} metalness={0.5} />
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
      matRef.current.opacity = (kind === 'fire' ? 0.95 : 0.5) * fire;
      matRef.current.size = (kind === 'fire' ? 0.7 : 1.3) * (0.6 + fire * 0.6);
    }
    pts.visible = fire > 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      {/* NormalBlending so fire reads as solid orange/grey on a light sky */}
      <pointsMaterial
        ref={matRef}
        map={sprite}
        color={kind === 'fire' ? '#ff4d12' : '#8b93a3'}
        transparent
        depthWrite={false}
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
  const R = 3.9;

  useFrame((state, dt) => {
    const s = shieldAt(progressRef.current);
    const g = grp.current;
    if (!g) return;
    g.visible = s > 0.02;
    g.rotation.y += dt * 0.12;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.015;
    g.scale.set((0.9 + s * 0.1) * pulse, (0.9 + s * 0.1) * 1.55 * pulse, (0.9 + s * 0.1) * pulse);
    if (shell.current) shell.current.opacity = s * 0.16;
    if (wire.current) wire.current.opacity = s * 0.28;
    if (ring.current) ring.current.opacity = s * (0.6 + Math.sin(state.clock.elapsedTime * 2) * 0.2);
  });

  return (
    <group ref={grp} position={[0, 0.7, 0]}>
      <mesh>
        <sphereGeometry args={[R, 48, 28, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          ref={shell}
          color="#2563eb"
          emissive="#1d4ed8"
          emissiveIntensity={0.5}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[R + 0.02, 22, 11, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial ref={wire} color="#2563eb" wireframe transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <torusGeometry args={[R, 0.05, 10, 80]} />
        <meshBasicMaterial ref={ring} color="#1d4ed8" transparent opacity={0} />
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
    const radius = 21 - p * 2.5;
    camera.position.x = Math.sin(angle) * radius;
    camera.position.z = Math.cos(angle) * radius;
    camera.position.y = 9.5 + Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
    camera.lookAt(0, 3.8, 0);
    if (light.current) {
      light.current.intensity = fire * 6 * (0.7 + Math.sin(state.clock.elapsedTime * 25) * 0.3);
      light.current.color.set('#ff5a1f');
    }
  });
  return <pointLight ref={light} position={[0, 2.8, 0]} distance={22} color="#ff7a18" intensity={0} />;
}

function Ground() {
  const tex = useMemo(makeGround, []);
  tex.repeat.set(18, 18);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial map={tex} roughness={0.9} metalness={0.05} />
    </mesh>
  );
}

export function FireStoryScene({ progressRef }: { progressRef: ProgressRef }) {
  return (
    <>
      {/* daytime sky */}
      <color attach="background" args={['#dfe8f5']} />
      <fog attach="fog" args={['#dfe8f5', 26, 56]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[12, 18, 9]}
        intensity={1.7}
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
      <directionalLight position={[-8, 5, -6]} intensity={0.25} color="#93c5fd" />
      <hemisphereLight args={['#ffffff', '#c4d0e2', 0.5]} />
      {/* studio environment for realistic glass reflections (no network HDRI) */}
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={1.4} position={[0, 8, 0]} scale={[20, 20, 1]} color="#ffffff" />
        <Lightformer intensity={0.7} position={[10, 4, 10]} scale={[10, 10, 1]} color="#cfe0ff" />
        <Lightformer intensity={0.5} position={[-10, 3, -8]} scale={[10, 10, 1]} color="#dbe6f7" />
      </Environment>
      <Rig progressRef={progressRef} />
      <City />
      <Building progressRef={progressRef} />
      <Particles progressRef={progressRef} kind="fire" />
      <Particles progressRef={progressRef} kind="smoke" />
      <Shield progressRef={progressRef} />
      <Ground />
    </>
  );
}
