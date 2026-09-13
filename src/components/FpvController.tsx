import { useEffect, useRef, useState } from 'react';
import { useEditor } from '../store/editor-store';

const JOYSTICK_SIZE = 120;
const THUMB_SIZE = 44;
const DEAD_ZONE = 0.06;
const LOOK_SPEED = 0.7;
const KEY_SPEED = 1.2;
const VERTICAL_SPEED = 0.015;

function getViewer(): any | null {
  return document.querySelector('model-viewer') as any;
}
function parseOrbit(orbit: string) {
  const parts = orbit.trim().split(/\s+/);
  return {
    theta: parseFloat(parts[0]) || 0,
    phi: parseFloat(parts[1]) || 85,
    radius: parts[2] || 'auto',
  };
}
function parseTarget(target: string): [number, number, number] {
  const parts = target.trim().split(/\s+/);
  return [
    parseFloat(parts[0]) || 0,
    parseFloat(parts[1]) || 1,
    parseFloat(parts[2]) || 0,
  ];
}

/**
 * FPV controller: virtual joystick + WASD + collision padding.
 * FIX: joystick now holds its deflected position while pointer is down.
 * Previously the thumb could snap back to center mid-drag because
 * pointer events were bound only to the outer div and capture was set
 * on the inner thumb target. Now we use window-level listeners + correct
 * pointer capture so the thumb stays where you hold it until release.
 */
export default function FpvController() {
  const { state } = useEditor();
  const [thumbPos, setThumbPos] = useState({ x: 0, y: 0 });
  const thumbRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const azimuthRef = useRef(0);
  const phiRef = useRef(85);
  const radiusRef = useRef<string>('auto');
  const targetRef = useRef<[number, number, number]>([0, 1, 0]);
  const keysRef = useRef<Set<string>>(new Set());

  const maxOffset = (JOYSTICK_SIZE - THUMB_SIZE) / 2;

  useEffect(() => {
    if (state.cameraMode !== 'fpv') return;
    const v = getViewer();
    if (!v?.getCameraOrbit) return;
    try {
      const o = parseOrbit(v.getCameraOrbit().toString());
      azimuthRef.current = o.theta;
      phiRef.current = o.phi;
      radiusRef.current = o.radius;
      targetRef.current = parseTarget(v.getCameraTarget?.().toString() ?? state.cameraTarget);
    } catch { /* ignore */ }
  }, [state.cameraMode]); // only re-seed when entering FPV mode, not during operation

  useEffect(() => {
    if (state.cameraMode !== 'fpv') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', '+', '-', '='].includes(k)) {
        if (k.startsWith('arrow')) e.preventDefault();
        keysRef.current.add(k);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      keysRef.current.clear();
    };
  }, [state.cameraMode]);

  // Main tick
  useEffect(() => {
    if (state.cameraMode !== 'fpv' || !state.showFpvControls) return;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const v = getViewer();
      if (!v) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      let thetaDelta = 0;
      let phiDelta = 0;
      let targetYDelta = 0;
      let zoomDelta = 0;

      if (draggingRef.current) {
        const jx = thumbRef.current.x;
        const jy = thumbRef.current.y;
        const mag = Math.sqrt(jx * jx + jy * jy);
        if (mag > DEAD_ZONE) {
          thetaDelta -= jx * LOOK_SPEED;
          phiDelta += jy * LOOK_SPEED;
        }
      }

      const keys = keysRef.current;
      if (keys.has('a') || keys.has('arrowleft')) thetaDelta += KEY_SPEED;
      if (keys.has('d') || keys.has('arrowright')) thetaDelta -= KEY_SPEED;
      if (keys.has('w') || keys.has('arrowup')) phiDelta -= KEY_SPEED * 0.7;
      if (keys.has('s') || keys.has('arrowdown')) phiDelta += KEY_SPEED * 0.7;
      if (keys.has('q')) targetYDelta += VERTICAL_SPEED;
      if (keys.has('e')) targetYDelta -= VERTICAL_SPEED;
      if (keys.has('+') || keys.has('=') || keys.has('shift')) zoomDelta -= 0.02;
      if (keys.has('-') || keys.has('_')) zoomDelta += 0.02;

      const hasInput = thetaDelta !== 0 || phiDelta !== 0 || targetYDelta !== 0 || zoomDelta !== 0;
      if (hasInput) {
        azimuthRef.current += thetaDelta;
        phiRef.current = Math.max(10, Math.min(170, phiRef.current + phiDelta));
        targetRef.current[1] = Math.max(0.1, Math.min(4, targetRef.current[1] + targetYDelta));

        let minRadius = state.collisionPadding;
        try {
          const dims = v.getDimensions?.();
          if (dims) {
            const r = Math.sqrt(dims.x * dims.x + dims.y * dims.y + dims.z * dims.z) / 2;
            minRadius = r * 0.35 + state.collisionPadding;
          }
        } catch { /* ignore */ }

        let nextRadius = radiusRef.current;
        if (nextRadius !== 'auto') {
          const num = parseFloat(nextRadius as string);
          if (!isNaN(num)) {
            let n = num + zoomDelta;
            n = Math.max(minRadius, n);
            nextRadius = `${n.toFixed(2)}m`;
            radiusRef.current = nextRadius;
          }
        } else if (zoomDelta !== 0) {
          try {
            const cur = v.getCameraOrbit?.().radius;
            const curNum = typeof cur === 'number' ? cur : parseFloat(String(cur));
            if (!isNaN(curNum)) {
              const n = Math.max(minRadius, curNum + zoomDelta);
              nextRadius = `${n.toFixed(2)}m`;
              radiusRef.current = nextRadius;
            }
          } catch { /* ignore */ }
        }
        if (nextRadius !== 'auto') {
          const n = parseFloat(String(nextRadius));
          if (!isNaN(n) && n < minRadius) {
            nextRadius = `${minRadius.toFixed(2)}m`;
            radiusRef.current = nextRadius;
          }
        }

        v.cameraOrbit = `${azimuthRef.current.toFixed(1)}deg ${phiRef.current.toFixed(1)}deg ${nextRadius}`;
        v.cameraTarget = `${targetRef.current[0].toFixed(2)} ${targetRef.current[1].toFixed(2)} ${targetRef.current[2].toFixed(2)}`;
        if (minRadius > 0) {
          try { v.setAttribute('min-camera-orbit', `auto auto ${minRadius.toFixed(2)}m`); } catch { /* ignore */ }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [state.cameraMode, state.showFpvControls, state.collisionPadding]);

  if (state.cameraMode !== 'fpv' || !state.showFpvControls) return null;

  // --- Joystick handlers: window-level drag so it never snaps back mid-hold ---
  const handlePointerDown = (e: React.PointerEvent) => {
    // Use currentTarget so capture is always on the base, not inner thumb
    e.preventDefault();
    e.stopPropagation();
    const target = baseRef.current ?? (e.currentTarget as HTMLElement);
    try { target.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    draggingRef.current = true;
    startRef.current = { x: e.clientX, y: e.clientY };
    // Seed from live viewer so we don't jump back to stale state
    try {
      const v = getViewer();
      const o = parseOrbit(v.getCameraOrbit().toString());
      azimuthRef.current = o.theta;
      phiRef.current = o.phi;
      radiusRef.current = o.radius;
      targetRef.current = parseTarget(v.getCameraTarget?.().toString() ?? state.cameraTarget);
    } catch { /* ignore */ }

    // Window listeners guarantee we keep receiving moves even if pointer leaves the ring
    const onWindowMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const dx = ev.clientX - startRef.current.x;
      const dy = ev.clientY - startRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clamped = Math.min(dist, maxOffset);
      const angle = Math.atan2(dy, dx);
      const cx = clamped * Math.cos(angle);
      const cy = clamped * Math.sin(angle);
      const nx = clamped === 0 ? 0 : cx / maxOffset;
      const ny = clamped === 0 ? 0 : cy / maxOffset;
      thumbRef.current = { x: nx, y: ny };
      setThumbPos({ x: nx, y: ny });
    };
    const onWindowUp = (ev: PointerEvent) => {
      draggingRef.current = false;
      thumbRef.current = { x: 0, y: 0 };
      setThumbPos({ x: 0, y: 0 });
      try { target.releasePointerCapture(ev.pointerId); } catch { /* ignore */ }
      window.removeEventListener('pointermove', onWindowMove);
      window.removeEventListener('pointerup', onWindowUp);
      window.removeEventListener('pointercancel', onWindowUp);
    };
    window.addEventListener('pointermove', onWindowMove);
    window.addEventListener('pointerup', onWindowUp);
    window.addEventListener('pointercancel', onWindowUp);
  };

  return (
    <>
      <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
        <div className="relative w-6 h-6">
          <div className="absolute top-1/2 left-0 w-full h-px bg-white/60 -translate-y-1/2" />
          <div className="absolute left-1/2 top-0 h-full w-px bg-white/60 -translate-x-1/2" />
          <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-white/90 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
        </div>
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none hidden md:flex items-center gap-1 text-[10px] leading-none text-white/50 bg-black/30 backdrop-blur px-2 py-1 rounded-full border border-white/10">
          <span className="hidden lg:inline">Hold joystick to look</span>
          <span className="lg:hidden">Hold joystick</span>
          <span className="opacity-40">·</span>
          <span>WASD/QE/±</span>
        </div>
      </div>

      <div
        ref={baseRef}
        className="absolute bottom-6 left-6 z-30 select-none touch-none"
        style={{ width: JOYSTICK_SIZE, height: JOYSTICK_SIZE }}
        onPointerDown={handlePointerDown}
      >
        <div className="absolute inset-0 rounded-full border-2 border-white/25 bg-black/25 backdrop-blur-md shadow-lg pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-white/10 pointer-events-none" />
        <div
          className="absolute rounded-full bg-white/85 border border-white/80 shadow-xl flex items-center justify-center pointer-events-none"
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            left: `calc(50% - ${THUMB_SIZE / 2}px + ${thumbPos.x * maxOffset}px)`,
            top: `calc(50% - ${THUMB_SIZE / 2}px + ${thumbPos.y * maxOffset}px)`,
            boxShadow: draggingRef.current ? '0 4px 20px rgba(0,0,0,0.3), 0 0 0 6px rgba(59,130,246,0.2)' : '0 2px 10px rgba(0,0,0,0.2)',
            transition: draggingRef.current ? 'none' : 'left 120ms ease, top 120ms ease',
          }}
        >
          <div className="flex items-center gap-0.5">
            <div className="w-0.5 h-3 rounded-full bg-gray-400/70" />
            <div className="w-0.5 h-3 rounded-full bg-gray-400/70" />
            <div className="w-0.5 h-3 rounded-full bg-gray-400/70" />
          </div>
        </div>
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-white/35 text-[10px] pointer-events-none">▲</div>
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-white/35 text-[10px] pointer-events-none">▼</div>
        <div className="absolute top-1/2 -left-5 -translate-y-1/2 text-white/35 text-[10px] pointer-events-none">◀</div>
        <div className="absolute top-1/2 -right-5 -translate-y-1/2 text-white/35 text-[10px] pointer-events-none">▶</div>
      </div>

      <div className="absolute bottom-6 right-20 z-20 pointer-events-none hidden sm:flex items-center gap-2 text-[11px] text-white/70 bg-black/25 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15">
        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
        FPV · hold joystick or WASD
      </div>
    </>
  );
}
