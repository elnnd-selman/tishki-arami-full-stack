import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';

export type HandState = 'open' | 'closed' | null;

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm';
const MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

// Hand is "open" when at least 3 of the 4 fingers are extended (tip farther
// from the wrist than its middle joint).
function handIsOpen(lm: NormalizedLandmark[]): boolean {
  const wrist = lm[0];
  const d = (a: NormalizedLandmark, b: NormalizedLandmark) => Math.hypot(a.x - b.x, a.y - b.y);
  const fingers: [number, number][] = [
    [8, 6],
    [12, 10],
    [16, 14],
    [20, 18],
  ];
  let extended = 0;
  for (const [tip, pip] of fingers) {
    if (d(lm[tip], wrist) > d(lm[pip], wrist) * 1.08) extended++;
  }
  return extended >= 3;
}

export function HandControl({ onState }: { onState: (s: HandState) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState('Starting camera…');
  const [tone, setTone] = useState<'wait' | 'fire' | 'safe'>('wait');

  useEffect(() => {
    let landmarker: HandLandmarker | undefined;
    let stream: MediaStream | undefined;
    let raf = 0;
    let stopped = false;

    (async () => {
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM);
        landmarker = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numHands: 1,
        });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play();
        setStatus('Show your hand');

        const loop = () => {
          if (stopped || !landmarker || !videoRef.current) return;
          const vid = videoRef.current;
          if (vid.readyState >= 2) {
            const res = landmarker.detectForVideo(vid, performance.now());
            if (res.landmarks && res.landmarks.length > 0) {
              const open = handIsOpen(res.landmarks[0]);
              onState(open ? 'open' : 'closed');
              setStatus(open ? 'Open hand — FIRE' : 'Closed fist — SAFE');
              setTone(open ? 'fire' : 'safe');
            } else {
              onState(null);
              setStatus('Show your hand');
              setTone('wait');
            }
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch {
        setStatus('Camera unavailable — allow access');
        setTone('wait');
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
    };
  }, [onState]);

  return (
    <div className="hand-cam">
      <video ref={videoRef} muted playsInline className="hand-cam-video" />
      <span className={`hand-cam-status tone-${tone}`}>{status}</span>
    </div>
  );
}
