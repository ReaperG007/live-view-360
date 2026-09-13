import { useRef, useState } from 'react';
import { useEditor } from '../store/editor-store';
import { seekToProgress, totalDuration } from '../utils/walkthrough-helpers';

const JOY_SIZE = 130;
const THUMB_SIZE = 42;

/**
 * Circular joystick for walking through the camera path.
 * Drag left/right to scrub through waypoints.
 * Drag up/down for fine-grained speed control (optional visual).
 * Shows a progress ring around the joystick, waypoint dots, and segment info.
 */
export default function WalkJoystick() {
  const { state, dispatch } = useEditor();
  const path = state.cameraPath;
  const hasPath = path.length >= 2;
  const progress = state.walkthroughProgress ?? 0;

  const [dragging, setDragging] = useState(false);
  const [thumbPos, setThumbPos] = useState({ x: 0, y: 0 });
  const thumbRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);

  const maxOffset = (JOY_SIZE - THUMB_SIZE) / 2;

  const seek = (p: number) => {
    const v = Math.max(0, Math.min(1, p));
    dispatch({ type: 'SET_WALKTHROUGH_PROGRESS', payload: v });
    if (state.walkthroughPlaying) dispatch({ type: 'SET_WALKTHROUGH_PLAYING', payload: false });
    seekToProgress(path, v, state.collisionPadding);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!hasPath) return;
    e.preventDefault();
    e.stopPropagation();
    const target = baseRef.current ?? (e.currentTarget as HTMLElement);
    try { target.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    draggingRef.current = true;
    startRef.current = { x: e.clientX, y: e.clientY };
    setDragging(true);

    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const dx = ev.clientX - startRef.current.x;
      const dist = Math.abs(dx);
      const clamped = Math.min(dist, maxOffset);
      const nx = dx < 0 ? -clamped / maxOffset : clamped / maxOffset;
      thumbRef.current = { x: nx, y: 0 };
      setThumbPos({ x: nx, y: 0 });
      // Horizontal drag maps to progress: left = backward, right = forward
      // Use dx as a velocity-like scrub: move proportionally along the path
      const tDur = totalDuration(path);
      if (tDur <= 0) return;
      const pixelsPerSecond = 80; // drag sensitivity
      const deltaProgress = dx / (pixelsPerSecond * path.length);
      seek(progress + deltaProgress);
    };

    const onUp = (ev: PointerEvent) => {
      draggingRef.current = false;
      thumbRef.current = { x: 0, y: 0 };
      setThumbPos({ x: 0, y: 0 });
      setDragging(false);
      try { target.releasePointerCapture(ev.pointerId); } catch { /* ignore */ }
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  if (!hasPath) return null;

  const tDur = totalDuration(path);
  const abs = progress * tDur;

  // Find active segment
  let cum = 0;
  let activeIdx = 0;
  for (let i = 1; i < path.length; i++) {
    cum += path[i].duration;
    if (abs <= cum + 1e-6) { activeIdx = i - 1; break; }
    if (i === path.length - 1) activeIdx = path.length - 2;
  }
  const label = path[activeIdx]?.label ?? `Point ${activeIdx + 1}`;
  const nextLabel = path[activeIdx + 1]?.label ?? 'End';

  // SVG progress ring
  const r = (JOY_SIZE / 2) - 4;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-[88px] z-20 flex flex-col items-center gap-2 pointer-events-auto">
      {/* Waypoint dots row */}
      <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10">
        {path.map((wp, i) => {
          const wpCum = (() => { let c = 0; for (let k = 1; k <= i; k++) c += path[k]?.duration || 0; return c; })();
          const wpPos = tDur > 0 ? wpCum / tDur : 0;
          const active = i === activeIdx;
          return (
            <button
              key={wp.id}
              onClick={() => seek(wpPos)}
              className={`relative w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${active ? 'bg-blue-500 text-white scale-110 shadow-lg shadow-blue-500/30' : 'bg-white/15 text-white/60 hover:bg-white/25'}`}
              title={wp.label}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Joystick with progress ring */}
      <div className="relative" style={{ width: JOY_SIZE + 16, height: JOY_SIZE + 16 }}>
        {/* Progress ring */}
        <svg
          className="absolute inset-0"
          width={JOY_SIZE + 16}
          height={JOY_SIZE + 16}
          viewBox={`0 0 ${JOY_SIZE + 16} ${JOY_SIZE + 16}`}
        >
          {/* Background ring */}
          <circle
            cx={(JOY_SIZE + 16) / 2}
            cy={(JOY_SIZE + 16) / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="3"
          />
          {/* Progress arc */}
          <circle
            cx={(JOY_SIZE + 16) / 2}
            cy={(JOY_SIZE + 16) / 2}
            r={r}
            fill="none"
            stroke="url(#walkGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${(JOY_SIZE + 16) / 2} ${(JOY_SIZE + 16) / 2})`}
            style={{ transition: dragging ? 'none' : 'stroke-dashoffset 150ms ease' }}
          />
          <defs>
            <linearGradient id="walkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </svg>

        {/* Joystick base */}
        <div
          ref={baseRef}
          className="absolute select-none touch-none"
          style={{
            width: JOY_SIZE,
            height: JOY_SIZE,
            left: 8,
            top: 8,
            borderRadius: '50%',
          }}
          onPointerDown={handlePointerDown}
        >
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-white/20 bg-black/30 backdrop-blur-md shadow-xl pointer-events-none" />
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 pointer-events-none" />
          {/* Thumb */}
          <div
            className="absolute rounded-full bg-white/90 border border-white shadow-xl flex items-center justify-center pointer-events-none"
            style={{
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              left: `calc(50% - ${THUMB_SIZE / 2}px + ${thumbPos.x * maxOffset}px)`,
              top: `calc(50% - ${THUMB_SIZE / 2}px + ${thumbPos.y * maxOffset}px)`,
              boxShadow: dragging
                ? '0 6px 24px rgba(0,0,0,0.35), 0 0 0 8px rgba(59,130,246,0.2)'
                : '0 3px 12px rgba(0,0,0,0.2)',
              transition: dragging ? 'none' : 'left 150ms ease, top 150ms ease',
            }}
          >
            <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="6 3 20 12 6 21 6 3" />
            </svg>
          </div>
          {/* Direction arrows */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-white/30 text-[10px] pointer-events-none">◀ ▶</div>
        </div>
      </div>

      {/* Info bar */}
      <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-3 py-1 border border-white/10">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
        <span className="text-[11px] text-white/70">
          {label} → {nextLabel}
        </span>
        <span className="text-[10px] font-mono text-white/40">
          {abs.toFixed(1)}s / {tDur.toFixed(1)}s
        </span>
        <span className="text-[10px] text-white/30">drag ◀▶</span>
      </div>
    </div>
  );
}
