import { useRef, useState } from 'react';
import { useEditor } from '../store/editor-store';
import { seekToProgress, totalDuration } from '../utils/walkthrough-helpers';

/**
 * Horizontal joystick scrub track for walkthrough camera path.
 * - Drag / click anywhere on track to seek to position p in [0,1]
 * - Shows fill, ticks for each waypoint, draggable thumb
 * - Collision-aware via seekToProgress (same helper as player/export)
 * Supports inline (panel) and floating (viewport overlay) variants.
 */
export default function WalkScrubController({ inline = false }: { inline?: boolean }) {
  const { state, dispatch } = useEditor();
  const path = state.cameraPath;
  const hasPath = path.length >= 2;
  const progress = state.walkthroughProgress ?? 0;

  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // seek helper - updates store and drives viewer
  const seek = (next: number) => {
    const v = Math.max(0, Math.min(1, next));
    dispatch({ type: 'SET_WALKTHROUGH_PROGRESS', payload: v });
    if (state.walkthroughPlaying) dispatch({ type: 'SET_WALKTHROUGH_PLAYING', payload: false });
    seekToProgress(path, v, state.collisionPadding);
  };

  const seekFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const w = rect.width;
    seek(w <= 0 ? 0 : x / w);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!hasPath) return;
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setDragging(true);
    seekFromClientX(e.clientX);

    const onMove = (ev: PointerEvent) => seekFromClientX(ev.clientX);
    const onUp = (ev: PointerEvent) => {
      try {
        target.releasePointerCapture(ev.pointerId);
      } catch {
        // ignore
      }
      setDragging(false);
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
  const activeIdx = (() => {
    let cum = 0;
    for (let i = 1; i < path.length; i++) {
      cum += path[i].duration;
      if (abs <= cum + 1e-6) return i - 1;
      if (i === path.length - 1) return path.length - 2;
    }
    return 0;
  })();
  const label = path[activeIdx]?.label ?? `Point ${activeIdx + 1}`;
  const nextLabel = path[activeIdx + 1]?.label ?? 'End';
  const thumbLeftPct = progress * 100;

  if (inline) {
    return (
      <div className="w-full bg-white/55 backdrop-blur rounded-2xl border border-white/30 shadow p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-gray-700">Walk Path · Scrub</span>
          <span className="text-[10px] font-mono text-gray-500">
            {abs.toFixed(1)}s / {tDur.toFixed(1)}s
          </span>
        </div>

        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          className="relative h-8 rounded-full cursor-pointer select-none touch-none bg-gray-200 border border-gray-300"
          style={{ WebkitTapHighlightColor: 'transparent' }}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={progress}
          aria-label="Walkthrough position"
        >
          <div
            className="absolute top-1.5 bottom-1.5 left-1.5 rounded-full"
            style={{
              width: `calc(${thumbLeftPct}% - 6px)`,
              background: 'linear-gradient(90deg,#3b82f6,#06b6d4)',
              transition: dragging ? 'none' : 'width 120ms ease',
            }}
          />
          <div className="absolute inset-0 flex items-center">
            {path.map((wp) => {
              let cum = 0;
              const idx = path.indexOf(wp);
              for (let k = 1; k <= idx; k++) cum += path[k]?.duration || 0;
              const pos = tDur > 0 ? (cum / tDur) * 100 : 0;
              return (
                <span
                  key={wp.id}
                  className="absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 bg-gray-600/40"
                  style={{ left: `${pos}%` }}
                />
              );
            })}
          </div>
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 shadow-lg flex items-center justify-center bg-white border-blue-500"
            style={{
              left: `${thumbLeftPct}%`,
              width: 28,
              height: 28,
              transition: dragging ? 'none' : 'left 120ms ease',
              boxShadow: dragging ? '0 6px 20px rgba(0,0,0,.35), 0 0 0 8px rgba(59,130,246,.18)' : '0 2px 10px rgba(0,0,0,.2)',
            }}
          >
            <span className="flex gap-0.5">
              <i className="w-0.5 h-3 rounded-full bg-gray-400/70 block" />
              <i className="w-0.5 h-3 rounded-full bg-gray-400/70 block" />
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] truncate text-gray-600">
            {label} → {nextLabel}
          </span>
          <span className="text-[10px] text-gray-400">drag ◀ ▶ to select</span>
        </div>

        <div className="flex gap-1.5 mt-2 flex-wrap">
          {path.map((wp, i) => {
            let cum = 0;
            for (let k = 1; k <= i; k++) cum += path[k]?.duration || 0;
            const pos = tDur > 0 ? cum / tDur : 0;
            const active = i === activeIdx || (i === path.length - 1 && progress >= 0.999);
            return (
              <button
                key={wp.id}
                onClick={() => seek(pos)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/70 text-gray-700 border-gray-200 hover:bg-white'}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Floating overlay variant
  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-[88px] z-20 w-[min(360px,calc(100%-24px))] bg-black/55 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl p-3 pointer-events-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-white/90">Walk Path · Scrub</span>
        <span className="text-[10px] font-mono text-white/60">
          {abs.toFixed(1)}s / {tDur.toFixed(1)}s
        </span>
      </div>

      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        className="relative h-8 rounded-full cursor-pointer select-none touch-none bg-white/15 border border-white/20"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={progress}
        aria-label="Walkthrough position"
      >
        <div
          className="absolute top-1.5 bottom-1.5 left-1.5 rounded-full"
          style={{
            width: `calc(${thumbLeftPct}% - 6px)`,
            background: 'rgba(255,255,255,.9)',
            transition: dragging ? 'none' : 'width 120ms ease',
          }}
        />
        <div className="absolute inset-0 flex items-center">
          {path.map((wp) => {
            let cum = 0;
            const idx = path.indexOf(wp);
            for (let k = 1; k <= idx; k++) cum += path[k]?.duration || 0;
            const pos = tDur > 0 ? (cum / tDur) * 100 : 0;
            return (
              <span
                key={wp.id}
                className="absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 bg-white/40"
                style={{ left: `${pos}%` }}
              />
            );
          })}
        </div>
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 shadow-lg flex items-center justify-center bg-white border-white"
          style={{
            left: `${thumbLeftPct}%`,
            width: 28,
            height: 28,
            transition: dragging ? 'none' : 'left 120ms ease',
            boxShadow: dragging ? '0 6px 20px rgba(0,0,0,.35), 0 0 0 8px rgba(59,130,246,.18)' : '0 2px 10px rgba(0,0,0,.2)',
          }}
        >
          <span className="flex gap-0.5">
            <i className="w-0.5 h-3 rounded-full bg-gray-400/70 block" />
            <i className="w-0.5 h-3 rounded-full bg-gray-400/70 block" />
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] truncate text-white/70">
          {label} → {nextLabel}
        </span>
        <span className="text-[10px] text-white/40">drag ◀ ▶</span>
      </div>
    </div>
  );
}
