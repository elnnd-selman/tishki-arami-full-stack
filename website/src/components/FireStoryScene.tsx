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
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

function Building({ progressRef }: { progressRef: ProgressRef }) {
  const winRef = useRef<THREE.InstancedMesh>(null);
  const winMat = useRef<THREE.MeshStandardMaterial>(null);
  const floors = 9;
  const perRow = 3;

  const windows = useMemo(() => {
    const items: { pos: [number, number, number]; ry: number }[] = [];
    const sides: { n: [number, number, number]; ry: number }[] = [
      { n: [0, 0, 1], ry: 0 },
      { n: [0, 0, -1], ry: Math.PI },
      { n: [1, 0, 0], ry: Math.PI / 2 },
      { n: [-1, 0, 0], ry: -Math.PI / 2 },
    ];
    for (const s of sides) {
      for (let f = 0; f < floors; f++) {
        for (let c = 0; c < perRow; c++) {
          const y = 0.7 + f * 0.62;
          const off = (c - (perRow - 1) / 2) * 0.62;
          const x = s.n[0] !== 0 ? s.n[0] * 1.06 : off;
          const z = s.n[2] !== 0 ? s.n[2] * 1.06 : off;
          items.push({ pos: [x, y, z], ry: s.ry });
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
    const s = new THREE.Vector3(0.42, 0.46, 0.06);
    windows.forEach((w, i) => {
      e.set(0, w.ry, 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(...w.pos), q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [windows]);

  useFrame(() => {
    const p = progressRef.current;
    const fire = fireAt(p);
    const safe = shieldAt(p);
    if (winMat.current) {
      // Windows glow calm blue when safe, hot orange while burning.
      const col = new THREE.Color().lerpColors(
        new THREE.Color('#bfdbfe'),
        new THREE.Color('#ff6a2b'),
        fire,
      );
      winMat.current.emissive = col;
      winMat.current.emissiveIntensity = 0.25 + fire * 1.8 + safe * 0.7;
    }
  });

  return (
    <group>
      {/* tower */}
      <mesh castShadow position={[0, 3.0, 0]}>
        <boxGeometry args={[2.1, 6.0, 2.1]} />
        <meshStandardMaterial color="#27324a" roughness={0.7} metalness={0.2} />
      </mesh>
      {/* roof cap */}
      <mesh position={[0, 6.15, 0]}>
        <boxGeometry args={[2.3, 0.3, 2.3]} />
        <meshStandardMaterial color="#1b2336" roughness={0.8} />
      </mesh>
      {/* windows */}
      <instancedMesh ref={winRef} args={[undefined, undefined, windows.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial ref={winMat} color="#0b1220" emissive="#bfdbfe" emissiveIntensity={0.3} />
      </instancedMesh>
    </group>
  );
}

function Fire({ progressRef, kind }: { progressRef: ProgressRef; kind: 'fire' | 'smoke' }) {
  const ref = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);
  const sprite = useMemo(makeSprite, []);
  const COUNT = kind === 'fire' ? 600 : 300;

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2.2;
      positions[i * 3 + 1] = Math.random() * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2.2;
      speeds[i] = 0.8 + Math.random() * 1.6;
    }
    return { positions, speeds };
  }, [COUNT]);

  useFrame((_, dt) => {
    const pts = ref.current;
    if (!pts) return;
    const fire = fireAt(progressRef.current);
    const arr = pts.geometry.attributes.position.array as Float32Array;
    const top = kind === 'fire' ? 6.5 : 9;
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] += speeds[i] * dt * (kind === 'fire' ? 1.4 : 1.0);
      arr[i * 3] += Math.sin((arr[i * 3 + 1] + i) * 1.5) * dt * 0.15;
      if (arr[i * 3 + 1] > top) {
        arr[i * 3 + 1] = 0.2;
        arr[i * 3] = (Math.random() - 0.5) * 2.2;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 2.2;
      }
    }
    pts.geometry.attributes.position.needsUpdate = true;
    if (matRef.current) {
      matRef.current.opacity = (kind === 'fire' ? 0.9 : 0.4) * fire;
      matRef.current.size = (kind === 'fire' ? 0.7 : 1.2) * (0.6 + fire * 0.6);
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

function Shield({ progressRef }: { progressRef: ProgressRef }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((_, dt) => {
    const s = shieldAt(progressRef.current);
    const mesh = ref.current;
    if (!mesh) return;
    mesh.rotation.y += dt * 0.3;
    const scale = 3.4 * (0.6 + s * 0.4);
    mesh.scale.setScalar(scale);
    mesh.visible = s > 0.02;
    if (mat.current) mat.current.opacity = s * 0.35;
  });
  return (
    <mesh ref={ref} position={[0, 3, 0]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial
        ref={mat}
        color="#2563eb"
        emissive="#1d4ed8"
        emissiveIntensity={0.5}
        transparent
        opacity={0}
        wireframe
      />
    </mesh>
  );
}

function Rig({ progressRef }: { progressRef: ProgressRef }) {
  const { camera } = useThree();
  const light = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    const p = progressRef.current;
    const fire = fireAt(p);
    // Slow orbit driven by scroll + gentle idle drift.
    const angle = -0.6 + p * 1.6 + state.clock.elapsedTime * 0.04;
    const radius = 11 - p * 1.5;
    camera.position.x = Math.sin(angle) * radius;
    camera.position.z = Math.cos(angle) * radius;
    camera.position.y = 4.5 + Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    camera.lookAt(0, 3, 0);
    if (light.current) {
      light.current.intensity = 0.4 + fire * 6 * (0.7 + Math.sin(state.clock.elapsedTime * 25) * 0.3);
      light.current.color.set(fire > 0.5 ? '#ff5a1f' : '#ff8a3d');
    }
  });
  return <pointLight ref={light} position={[0, 2.5, 0]} distance={20} color="#ff7a18" intensity={0} />;
}

export function FireStoryScene({ progressRef }: { progressRef: ProgressRef }) {
  return (
    <>
      <color attach="background" args={['#0a0f1e']} />
      <fog attach="fog" args={['#0a0f1e', 14, 30]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[6, 10, 6]} intensity={1.1} castShadow />
      <hemisphereLight args={['#1e3a8a', '#0a0f1e', 0.5]} />
      <Rig progressRef={progressRef} />
      <Building progressRef={progressRef} />
      <Fire progressRef={progressRef} kind="fire" />
      <Fire progressRef={progressRef} kind="smoke" />
      <Shield progressRef={progressRef} />
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[16, 48]} />
        <meshStandardMaterial color="#0d1426" roughness={1} />
      </mesh>
    </>
  );
}
