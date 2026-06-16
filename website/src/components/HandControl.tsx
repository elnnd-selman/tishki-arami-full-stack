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
    let lastTs = -1;

    const makeLandmarker = async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM);
      const opts = {
        baseOptions: { modelAssetPath: MODEL },
        runningMode: 'VIDEO' as const,
        numHands: 1,
        minHandDetectionConfidence: 0.4,
        minHandPresenceConfidence: 0.4,
        minTrackingConfidence: 0.4,
      };
      try {
        return await HandLandmarker.createFromOptions(fileset, {
          ...opts,
          baseOptions: { ...opts.baseOptions, delegate: 'GPU' as const },
        });
      } catch {
        // Some machines/browsers can't init the GPU delegate — fall back to CPU.
        return await HandLandmarker.createFromOptions(fileset, {
          ...opts,
          baseOptions: { ...opts.baseOptions, delegate: 'CPU' as const },
        });
      }
    };

    (async () => {
      try {
        landmarker = await makeLandmarker();
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play();
        setStatus('Show your hand');

        const loop = () => {
          if (stopped) return;
          raf = requestAnimationFrame(loop); // schedule first so a frame error can't kill the loop
          const vid = videoRef.current;
          if (!landmarker || !vid || vid.readyState < 2) return;
          let ts = performance.now();
          if (ts <= lastTs) ts = lastTs + 1;
          lastTs = ts;
          try {
            const res = landmarker.detectForVideo(vid, ts);
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
          } catch {
            // occasional per-frame errors are non-fatal — keep looping
          }
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
      <span className="hand-cam-hint">Open palm = fire&nbsp;&nbsp;·&nbsp;&nbsp;Closed fist = safe</span>
    </div>
  );
}
