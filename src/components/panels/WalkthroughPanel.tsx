import { useEditor } from '../../store/editor-store';
import WalkScrubController from '../WalkScrubController';

function capturePose() {
  const v = document.querySelector('model-viewer') as unknown as {
    getCameraOrbit?: () => { toString(): string };
    getCameraTarget?: () => { toString(): string };
    getFieldOfView?: () => number;
  } | null;
  try {
    return {
      orbit: v?.getCameraOrbit?.().toString() ?? '',
      target: v?.getCameraTarget?.().toString() ?? '',
      fov: v?.getFieldOfView ? `${v.getFieldOfView().toFixed(1)}deg` : '45deg',
    };
  } catch {
    return { orbit: '0deg 75deg auto', target: 'auto auto auto', fov: '45deg' };
  }
}

export default function WalkthroughPanel() {
  const { state, dispatch } = useEditor();
  const canAdd = !!state.modelSrc;

  const handleCapture = () => {
    const p = capturePose();
    dispatch({
      type: 'ADD_WAYPOINT',
      payload: {
        id: `wp-${Date.now()}`,
        label: `Point ${state.cameraPath.length + 1}`,
        orbit: p.orbit,
        target: p.target,
        fov: p.fov,
        duration: 2,
      },
    });
  };

  const handleRecapture = (id: string) => {
    const p = capturePose();
    dispatch({ type: 'UPDATE_WAYPOINT', payload: { id, updates: { orbit: p.orbit, target: p.target, fov: p.fov } } });
  };

  const handleGoTo = (id: string) => {
    const wp = state.cameraPath.find((w) => w.id === id);
    if (!wp) return;
    const v = document.querySelector('model-viewer') as any;
    if (!v) return;
    try {
      v.cameraOrbit = wp.orbit;
      v.cameraTarget = wp.target;
      v.fieldOfView = wp.fov;
    } catch { /* ignore */ }
    dispatch({ type: 'SET_ACTIVE_WAYPOINT', payload: id });
  };

  const totalDuration = state.cameraPath.reduce((s, w) => s + w.duration, 0);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-800">Camera Path — Walkthrough</h3>
        <p className="text-xs text-gray-500 mt-1 leading-snug">
          Capture viewpoints along a path. Play walks the camera smoothly between them, always keeping a safe distance from the model so it never clips through walls.
        </p>
      </div>

      {/* Playback controls */}
      <div className="bg-white/40 backdrop-blur-sm border border-white/30 rounded-xl p-3 space-y-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => dispatch({ type: 'SET_WALKTHROUGH_PLAYING', payload: !state.walkthroughPlaying })}
            disabled={state.cameraPath.length < 2}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              state.walkthroughPlaying ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {state.walkthroughPlaying ? (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                Stop
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" /></svg>
                Play Walkthrough
              </>
            )}
          </button>
          <button
            onClick={() => {
              const v = document.querySelector('model-viewer') as any;
              if (!v || state.cameraPath.length === 0) return;
              const first = state.cameraPath[0];
              if (!first) return;
              v.cameraOrbit = first.orbit;
              v.cameraTarget = first.target;
              v.fieldOfView = first.fov;
              dispatch({ type: 'SET_ACTIVE_WAYPOINT', payload: first.id });
            }}
            disabled={state.cameraPath.length === 0}
            className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            title="Jump to first point"
          >
            ⏮ First
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={state.walkthroughLoop}
              onChange={(e) => dispatch({ type: 'SET_WALKTHROUGH_LOOP', payload: e.target.checked })}
              className="rounded border-gray-300 text-blue-600"
            />
            Loop
          </label>
          <div className="flex-1 flex items-center gap-1.5">
            <span className="text-gray-500 whitespace-nowrap">Speed</span>
            <input
              type="range"
              min={0.25}
              max={2}
              step={0.25}
              value={state.walkthroughSpeed}
              onChange={(e) => dispatch({ type: 'SET_WALKTHROUGH_SPEED', payload: parseFloat(e.target.value) })}
              className="flex-1 accent-blue-600"
            />
            <span className="font-mono w-8 text-right">{state.walkthroughSpeed}×</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600 whitespace-nowrap">Safe distance</span>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.05}
            value={state.collisionPadding}
            onChange={(e) => dispatch({ type: 'SET_COLLISION_PADDING', payload: parseFloat(e.target.value) })}
            className="flex-1 accent-emerald-600"
          />
          <span className="text-xs font-mono w-10 text-right">{state.collisionPadding.toFixed(2)}m</span>
        </div>
        <p className="text-[11px] text-gray-400">Camera never passes closer than this padding from the model surface. Increase if you see wall clipping.</p>
        {state.cameraPath.length >= 2 && (
          <p className="text-[11px] text-blue-700 bg-blue-50 rounded px-2 py-1">
            Total duration: {totalDuration.toFixed(1)}s at 1× · {state.cameraPath.length} points
          </p>
        )}
      </div>

      {/* Capture */}
      <div className="flex gap-2">
        <button
          onClick={handleCapture}
          disabled={!canAdd}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 border border-emerald-700 shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" /></svg>
          Capture Current View
        </button>
      </div>
      <p className="text-[11px] text-gray-400 -mt-2">Orbit the model to frame each stop, then capture. Points play in order.</p>

      {/* Inline scrub bar for seeking */}
      <WalkScrubController inline />

      {/* Timeline mini-preview bar */}
      {state.cameraPath.length > 0 && (
        <div className="bg-white/30 backdrop-blur-sm rounded-lg border border-white/30 p-3">
          <div className="flex items-center gap-1 h-8">
            {state.cameraPath.map((wp, i) => {
              const active = state.activeWaypointId === wp.id;
              return (
                <div key={wp.id} className="flex items-center gap-1 flex-1">
                  <button
                    onClick={() => handleGoTo(wp.id)}
                    className={`flex-1 h-8 rounded-lg border flex flex-col items-center justify-center text-[10px] font-medium leading-none transition-all ${
                      active ? 'bg-blue-600 text-white border-blue-700 shadow' : 'bg-white/70 text-gray-700 border-white/40 hover:bg-white'
                    }`}
                    title={`${wp.label} — ${wp.duration}s`}
                  >
                    <span className="text-[11px] font-bold">{i + 1}</span>
                    <span className="opacity-80 truncate max-w-[60px]">{wp.duration}s</span>
                  </button>
                  {i < state.cameraPath.length - 1 && (
                    <div className="w-3 h-0.5 bg-gray-300 rounded-full flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>Start</span>
            <span>End</span>
          </div>
        </div>
      )}

      {/* Waypoint list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-gray-700">Points ({state.cameraPath.length})</h4>
          {state.cameraPath.length > 0 && (
            <button
              onClick={() => {
                if (!confirm('Clear all walkthrough points?')) return;
                state.cameraPath.forEach((w) => dispatch({ type: 'REMOVE_WAYPOINT', payload: w.id }));
              }}
              className="text-[11px] text-red-500 hover:text-red-700"
            >
              Clear all
            </button>
          )}
        </div>

        {state.cameraPath.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-white/40 rounded-xl bg-white/20">
            <div className="w-10 h-10 mx-auto rounded-full bg-white/50 flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 009 15a1.65 1.65 0 00-1-1.51A1.65 1.65 0 006.18 13l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 0010.82 10a1.65 1.65 0 001-1.51V8a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0015 12a1.65 1.65 0 001 1.51z" /></svg>
            </div>
            <p className="text-xs text-gray-500">No points yet</p>
            <p className="text-[11px] text-gray-400 mt-1">Move the camera and capture viewpoints</p>
          </div>
        )}

        {state.cameraPath.map((wp, idx) => (
          <div
            key={wp.id}
            className={`rounded-xl border p-3 space-y-2 backdrop-blur-sm ${
              state.activeWaypointId === wp.id ? 'bg-blue-50/70 border-blue-300/50 shadow-sm' : 'bg-white/40 border-white/30'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <input
                value={wp.label}
                onChange={(e) => dispatch({ type: 'UPDATE_WAYPOINT', payload: { id: wp.id, updates: { label: e.target.value } } })}
                className="flex-1 px-2 py-1 text-sm font-medium border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white/80"
                placeholder="Point label"
              />
              <div className="flex gap-1">
                <button
                  onClick={() => idx > 0 && dispatch({ type: 'REORDER_WAYPOINT', payload: { from: idx, to: idx - 1 } })}
                  disabled={idx === 0}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 text-xs"
                  title="Move up"
                >↑</button>
                <button
                  onClick={() => idx < state.cameraPath.length - 1 && dispatch({ type: 'REORDER_WAYPOINT', payload: { from: idx, to: idx + 1 } })}
                  disabled={idx === state.cameraPath.length - 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 text-xs"
                  title="Move down"
                >↓</button>
                <button
                  onClick={() => dispatch({ type: 'REMOVE_WAYPOINT', payload: wp.id })}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200"
                  title="Remove"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-gray-500">Orbit
                <input value={wp.orbit} onChange={(e) => dispatch({ type: 'UPDATE_WAYPOINT', payload: { id: wp.id, updates: { orbit: e.target.value } } })} className="mt-0.5 w-full px-2 py-1 text-[11px] font-mono border border-gray-200 rounded-lg bg-white/70" />
              </label>
              <label className="text-[11px] text-gray-500">Target
                <input value={wp.target} onChange={(e) => dispatch({ type: 'UPDATE_WAYPOINT', payload: { id: wp.id, updates: { target: e.target.value } } })} className="mt-0.5 w-full px-2 py-1 text-[11px] font-mono border border-gray-200 rounded-lg bg-white/70" />
              </label>
              <label className="text-[11px] text-gray-500">FOV
                <input value={wp.fov} onChange={(e) => dispatch({ type: 'UPDATE_WAYPOINT', payload: { id: wp.id, updates: { fov: e.target.value } } })} className="mt-0.5 w-full px-2 py-1 text-[11px] font-mono border border-gray-200 rounded-lg bg-white/70" />
              </label>
              <label className="text-[11px] text-gray-500">Duration (s)
                <input type="number" min={0.2} max={10} step={0.1} value={wp.duration} onChange={(e) => dispatch({ type: 'UPDATE_WAYPOINT', payload: { id: wp.id, updates: { duration: Math.max(0.2, parseFloat(e.target.value) || 1) } } })} className="mt-0.5 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white/70" />
              </label>
            </div>

            <div className="flex gap-1.5">
              <button onClick={() => handleGoTo(wp.id)} className="flex-1 px-2 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="7" /><line x1="12" y1="17" x2="12" y2="22" /><line x1="2" y1="12" x2="7" y2="12" /><line x1="17" y1="12" x2="22" y2="12" /></svg>
                Go
              </button>
              <button onClick={() => handleRecapture(wp.id)} className="flex-1 px-2 py-1.5 text-xs bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Re-capture</button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50/60 border border-amber-200/50 rounded-lg p-3">
        <p className="text-[11px] text-amber-800 leading-snug">
          <strong>Collision-aware:</strong> During walkthrough playback, if the path would bring the camera inside the model, the radius is automatically clamped outward so the view never crosses walls or floors. Adjust <em>Safe distance</em> above to tune it.
        </p>
      </div>
    </div>
  );
}
