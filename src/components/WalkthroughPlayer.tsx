import { useEffect, useRef, useState } from 'react';
import { useEditor } from '../store/editor-store';
import { getMinRadius, parseOrbit, parseTarget, parseFov, lerp, smooth, lerpAngle, totalDuration } from '../utils/walkthrough-helpers';

function getRadiusMeters(orbit: string, fallback: number): number {
  const r = parseOrbit(orbit).radius;
  if (r === 'auto') return fallback;
  const n = parseFloat(String(r));
  return isNaN(n) ? fallback : n;
}

/**
 * Totally decouples animation from model-viewer orbit controls by driving
 * cameraOrbit / cameraTarget / fieldOfView directly every frame.
 * Collision-aware: clamps radius to >= estimated model radius + collisionPadding
 * so the camera never enters the geometry. Path is simply the ordered waypoints.
 */
export default function WalkthroughPlayer() {
  const { state, dispatch } = useEditor();
  const [activeIdx, setActiveIdx] = useState(0);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const segRef = useRef(0);

  // During playback, keep walkthroughProgress in sync so scrub stays accurate
  useEffect(() => {
    if (!state.walkthroughPlaying || state.cameraPath.length < 2) return;

    const v = document.querySelector('model-viewer') as any;
    if (!v) return;

    segRef.current = 0;
    tRef.current = 0;
    setActiveIdx(0);
    let lastTime = performance.now();
    const minRadius = getMinRadius(state.collisionPadding);

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000 * state.walkthroughSpeed;
      lastTime = now;

      const path = state.cameraPath; // captured each frame from closure — but read state ref via query; close enough
      // To avoid stale closure for speed changes we read state via DOM ref trick: fetch live state
      // Instead we rely on the dependency array re-running the effect; while running, path won't change
      if (path.length < 2) return;

      const cur = path[segRef.current];
      const nxt = path[segRef.current + 1];
      if (!cur || !nxt) {
        // End of path
        if (state.walkthroughLoop) {
          segRef.current = 0;
          tRef.current = 0;
          setActiveIdx(0);
          rafRef.current = requestAnimationFrame(tick);
        } else {
          dispatch({ type: 'SET_WALKTHROUGH_PLAYING', payload: false });
        }
        return;
      }

      tRef.current += dt / nxt.duration;
      if (tRef.current >= 1) {
        tRef.current = 0;
        segRef.current += 1;
        setActiveIdx(segRef.current);
        if (segRef.current >= path.length - 1) {
          if (state.walkthroughLoop) {
            segRef.current = 0;
            setActiveIdx(0);
          } else {
            // Snap to final waypoint exactly
            try {
              v.cameraOrbit = nxt.orbit;
              v.cameraTarget = nxt.target;
              v.fieldOfView = nxt.fov;
            } catch { /* ignore */ }
            dispatch({ type: 'SET_WALKTHROUGH_PLAYING', payload: false });
            return;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const u = smooth(tRef.current);
      const cO = parseOrbit(cur.orbit);
      const nO = parseOrbit(nxt.orbit);
      const cT = parseTarget(cur.target);
      const nT = parseTarget(nxt.target);
      const cF = parseFov(cur.fov);
      const nF = parseFov(nxt.fov);

      const theta = lerpAngle(cO.theta, nO.theta, u);
      const phi = lerp(cO.phi, nO.phi, u);
      const cR = getRadiusMeters(cur.orbit, minRadius + 1);
      const nR = getRadiusMeters(nxt.orbit, minRadius + 1);
      let radius = lerp(cR, nR, u);
      radius = Math.max(minRadius, radius);

      const target: [number, number, number] = [
        lerp(cT[0], nT[0], u),
        lerp(cT[1], nT[1], u),
        lerp(cT[2], nT[2], u),
      ];
      const fov = lerp(cF, nF, u);

      try {
        v.cameraOrbit = `${theta.toFixed(2)}deg ${phi.toFixed(2)}deg ${radius.toFixed(2)}m`;
        v.cameraTarget = `${target[0].toFixed(3)} ${target[1].toFixed(3)} ${target[2].toFixed(3)}`;
        v.fieldOfView = `${fov.toFixed(1)}deg`;
      } catch { /* ignore */ }

      // Sync progress 0..1 for scrub joystick
      const dur = totalDuration(path);
      if (dur > 0) {
        let cum = 0;
        for (let i = 1; i <= segRef.current; i++) cum += path[i].duration;
        const prog = (cum + tRef.current * (path[segRef.current + 1]?.duration || 0)) / dur;
        // Throttle dispatch: only when tick fires (RAF), ok to dispatch each frame but guard
dispatch({ type: 'SET_WALKTHROUGH_PROGRESS', payload: Math.max(0, Math.min(1, prog)) });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame((t) => {
      lastTime = t;
      tick(t);
    });

    return () => cancelAnimationFrame(rafRef.current);
  }, [state.walkthroughPlaying, state.cameraPath, state.walkthroughSpeed, state.walkthroughLoop, state.collisionPadding, dispatch]);

  // Keep min-camera-orbit attribute in sync even when not playing, so manual moves also respect it
  useEffect(() => {
    const v = document.querySelector('model-viewer') as any;
    if (!v) return;
    const minR = getMinRadius(state.collisionPadding);
    try {
      if (minR > 0) v.setAttribute('min-camera-orbit', `auto auto ${minR.toFixed(2)}m`);
      else v.removeAttribute('min-camera-orbit');
    } catch { /* ignore */ }
  }, [state.collisionPadding, state.modelLoaded]);

  // Overlay during playback — shown over the viewport
  if (!state.walkthroughPlaying) return null;

  const curLabel = state.cameraPath[activeIdx]?.label ?? '';
  const nextLabel = state.cameraPath[activeIdx + 1]?.label ?? 'End';

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 pointer-events-none">
      <div className="mx-auto max-w-md mb-4 pointer-events-auto">
        <div className="bg-black/70 backdrop-blur-xl text-white rounded-2xl px-5 py-3 flex items-center gap-3 shadow-2xl border border-white/15">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold tracking-wide opacity-90">
              Walkthrough {activeIdx + 1} / {state.cameraPath.length}
            </div>
            <div className="text-[11px] opacity-70 truncate">
              {curLabel} → {nextLabel}
            </div>
            {/* progress bar */}
            <div className="mt-1.5 h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white/80 rounded-full transition-none" style={{ width: `${((activeIdx) / Math.max(1, state.cameraPath.length - 1)) * 100}%` }} />
            </div>
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_WALKTHROUGH_PLAYING', payload: false })}
            className="ml-2 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors border border-white/10"
            title="Stop walkthrough"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
