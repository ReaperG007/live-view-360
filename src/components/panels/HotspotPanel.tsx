import { useState } from 'react';
import { useEditor } from '../../store/editor-store';
import type { HotspotIcon } from '../../store/editor-store';

const ICONS: { id: HotspotIcon; label: string; svg: React.ReactNode }[] = [
  { id: 'pin', label: 'Pin', svg: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg> },
  { id: 'dot', label: 'Dot', svg: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5" /></svg> },
  { id: 'info', label: 'Info', svg: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg> },
  { id: 'eye', label: 'Eye', svg: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg> },
  { id: 'star', label: 'Star', svg: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg> },
  { id: 'arrow', label: 'Arrow', svg: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg> },
];

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4', '#111827'];

function captureCameraPose(): { orbit: string; target: string; fov: string } {
  const viewer = document.querySelector('model-viewer') as unknown as {
    getCameraOrbit?: () => { toString(): string };
    getCameraTarget?: () => { toString(): string };
    getFieldOfView?: () => number;
  } | null;
  try {
    return {
      orbit: viewer?.getCameraOrbit?.().toString() ?? '',
      target: viewer?.getCameraTarget?.().toString() ?? '',
      fov: viewer?.getFieldOfView ? `${viewer.getFieldOfView().toFixed(1)}deg` : '',
    };
  } catch {
    return { orbit: '', target: '', fov: '' };
  }
}

export function focusCameraOnHotspot(hotspot: { position: string; focusOrbit: string; focusTarget: string; focusFov: string }) {
  const viewer = document.querySelector('model-viewer') as unknown as {
    cameraTarget?: string; cameraOrbit?: string; fieldOfView?: string;
  } | null;
  if (!viewer) return;
  try {
    viewer.cameraTarget = hotspot.focusTarget || hotspot.position;
    if (hotspot.focusOrbit) viewer.cameraOrbit = hotspot.focusOrbit;
    if (hotspot.focusFov) viewer.fieldOfView = hotspot.focusFov;
  } catch { /* ignore */ }
}

function HotspotDot({ icon, color, pulse, size = 28 }: { icon: HotspotIcon; color: string; pulse?: boolean; size?: number }) {
  const entry = ICONS.find((i) => i.id === icon) ?? ICONS[0];
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border-2 border-white shadow-lg flex-shrink-0 ${pulse ? 'animate-[hotspotPulse_1.6s_ease-in-out_infinite]' : ''}`}
      style={{ width: size, height: size, background: color, color: 'white' }}
    >
      <span className="scale-90">{entry.svg}</span>
      <style>{`@keyframes hotspotPulse { 0%,100%{transform:scale(1);box-shadow:0 0 0 0 ${color}66} 50%{transform:scale(1.08);box-shadow:0 0 0 8px ${color}00} }`}</style>
    </span>
  );
}

export default function HotspotPanel() {
  const { state, dispatch } = useEditor();
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [position, setPosition] = useState('0 0 0');
  const [normal, setNormal] = useState('0 1 0');
  const [focusOrbit, setFocusOrbit] = useState('');
  const [focusTarget, setFocusTarget] = useState('');
  const [focusFov, setFocusFov] = useState('');
  const [icon, setIcon] = useState<HotspotIcon>('pin');
  const [color, setColor] = useState('#3b82f6');
  const [pulse, setPulse] = useState(true);

  const picking = state.pickingHotspot;

  const handleCapture = () => {
    const pose = captureCameraPose();
    setFocusOrbit(pose.orbit);
    setFocusTarget(pose.target);
    setFocusFov(pose.fov);
  };

  const handleAddHotspot = () => {
    if (!newTitle.trim()) return;
    dispatch({
      type: 'ADD_HOTSPOT',
      payload: {
        id: `hotspot-${Date.now()}`,
        name: newTitle,
        position,
        normal,
        title: newTitle,
        description: newDescription,
        focusOrbit,
        focusTarget,
        focusFov,
        icon,
        color,
        pulse,
      },
    });
    setNewTitle('');
    setNewDescription('');
    setFocusOrbit('');
    setFocusTarget('');
    setFocusFov('');
  };

  const handleFocus = (hotspot: (typeof state.hotspots)[number]) => {
    focusCameraOnHotspot(hotspot);
    dispatch({ type: 'SET_ACTIVE_HOTSPOT', payload: hotspot.id });
  };

  const handleRecapture = (id: string) => {
    const pose = captureCameraPose();
    dispatch({ type: 'UPDATE_HOTSPOT', payload: { id, updates: { focusOrbit: pose.orbit, focusTarget: pose.target, focusFov: pose.fov } } });
  };

  return (
    <div className="p-4 space-y-5">
      {/* Create */}
      <div className="bg-white/40 backdrop-blur-sm border border-white/30 rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Create Hotspot</h3>
          <HotspotDot icon={icon} color={color} pulse={pulse} size={32} />
        </div>
        <p className="text-[11px] text-gray-500 leading-snug">
          Click <strong>Pick on Model</strong> then click the 3D surface to place exactly — or type coordinates. Each hotspot flies the camera to its saved view.
        </p>

        <button
          onClick={() => dispatch({ type: 'SET_PICKING_HOTSPOT', payload: !picking })}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-xl border-2 transition-all ${picking ? 'bg-emerald-600 text-white border-emerald-700 shadow-md animate-pulse' : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50 shadow-sm'}`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
          {picking ? 'Click the model — or Cancel' : 'Pick on Model · Click to Place'}
        </button>
        {picking && (
          <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-center">
            Move your cursor over the model and <strong>click any surface</strong>. The hotspot drops at that point with its normal.
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Title *</label>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Main entrance, Rooftop, Lobby"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white/80"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Description</label>
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Short description shown in the card"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white/80"
          />
        </div>

        {/* Style pickers */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Icon</label>
            <div className="grid grid-cols-3 gap-1.5">
              {ICONS.map((ic) => (
                <button
                  key={ic.id}
                  onClick={() => setIcon(ic.id)}
                  className={`h-9 rounded-xl border flex items-center justify-center transition-all ${icon === ic.id ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                  title={ic.label}
                >
                  {ic.svg}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Color</label>
            <div className="grid grid-cols-4 gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-9 rounded-xl border-2 flex items-center justify-center ${color === c ? 'border-gray-900 shadow' : 'border-white/60 hover:scale-105'}`}
                  style={{ background: c }}
                  title={c}
                >
                  {color === c && <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={pulse} onChange={(e) => setPulse(e.target.checked)} className="rounded border-gray-300 text-blue-600" />
          <span className="text-xs text-gray-700">Pulsing glow</span>
          <span className="text-[11px] text-gray-400">(draws attention)</span>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block">Position (X Y Z)</label>
            <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} className="w-full px-2 py-1.5 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white/70" />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block">Normal (X Y Z)</label>
            <input type="text" value={normal} onChange={(e) => setNormal(e.target.value)} className="w-full px-2 py-1.5 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white/70" />
          </div>
        </div>

        <div className="bg-blue-50/70 border border-blue-200/50 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800">Focus View</span>
            <button onClick={handleCapture} disabled={!state.modelSrc} className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 shadow-sm">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="7" /><line x1="12" y1="17" x2="12" y2="22" /><line x1="2" y1="12" x2="7" y2="12" /><line x1="17" y1="12" x2="22" y2="12" /></svg>
              Capture View
            </button>
          </div>
          <p className="text-[11px] text-blue-700/80 leading-snug">Frame the model, then capture. Clicking the hotspot will fly to this exact view.</p>
          {(focusOrbit || focusTarget || focusFov) && (
            <div className="text-[10px] font-mono text-blue-900 bg-white/70 rounded-lg p-2 space-y-0.5 border border-blue-100">
              <div className="truncate">orbit: {focusOrbit || '—'}</div>
              <div className="truncate">target: {focusTarget || '—'}</div>
              <div>fov: {focusFov || '—'}</div>
              <button onClick={() => { setFocusOrbit(''); setFocusTarget(''); setFocusFov(''); }} className="text-[11px] text-red-500 hover:text-red-700 mt-1">Clear</button>
            </div>
          )}
        </div>

        <button
          onClick={handleAddHotspot}
          disabled={!newTitle.trim() || !state.modelSrc}
          className="w-full px-3 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          Add Hotspot
        </button>
      </div>

      {/* List */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-800">Hotspots ({state.hotspots.length})</h3>
          {state.hotspots.length > 0 && (
            <span className="text-[11px] text-gray-400">click title to fly · drag on model to move</span>
          )}
        </div>

        {state.hotspots.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-white/40 rounded-xl bg-white/20">
            <div className="w-10 h-10 mx-auto rounded-full bg-white/60 flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-xs text-gray-500">No hotspots yet</p>
            <p className="text-[11px] text-gray-400 mt-1">Create one above or click directly on the model</p>
          </div>
        )}

        <div className="space-y-3">
          {state.hotspots.map((hotspot) => {
            const isActive = state.activeHotspotId === hotspot.id;
            const ic: HotspotIcon = (hotspot.icon as HotspotIcon) || 'pin';
            const col = hotspot.color || '#3b82f6';
            const pul = hotspot.pulse ?? true;
            return (
              <div
                key={hotspot.id}
                className={`rounded-xl p-3 border backdrop-blur-sm transition-all ${isActive ? 'bg-blue-50/80 border-blue-300/60 shadow-sm' : 'bg-white/50 border-white/30 hover:bg-white/70'}`}
              >
                <div className="flex items-start gap-2.5 mb-2">
                  <button onClick={() => handleFocus(hotspot)} className="flex-shrink-0 mt-0.5" title="Fly to view">
                    <HotspotDot icon={ic} color={col} pulse={pul} size={28} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <button onClick={() => handleFocus(hotspot)} className="text-sm font-semibold text-gray-800 hover:text-blue-700 text-left leading-tight block truncate w-full">
                      {hotspot.title}
                    </button>
                    {hotspot.description && <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">{hotspot.description}</p>}
                  </div>
                  <button onClick={() => dispatch({ type: 'REMOVE_HOTSPOT', payload: hotspot.id })} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 flex-shrink-0" title="Remove">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>

                {/* Quick style edit */}
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="flex gap-1">
                    {ICONS.slice(0, 4).map((i) => (
                      <button
                        key={i.id}
                        onClick={() => dispatch({ type: 'UPDATE_HOTSPOT', payload: { id: hotspot.id, updates: { icon: i.id } } })}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center ${ic === i.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                        title={i.label}
                      >
                        <span className="scale-75">{i.svg}</span>
                      </button>
                    ))}
                  </div>
                  <div className="w-px h-6 bg-gray-200 mx-1" />
                  <div className="flex gap-1 flex-wrap">
                    {COLORS.slice(0, 5).map((c) => (
                      <button
                        key={c}
                        onClick={() => dispatch({ type: 'UPDATE_HOTSPOT', payload: { id: hotspot.id, updates: { color: c } } })}
                        className={`w-6 h-6 rounded-full border-2 ${col === c ? 'border-gray-900 scale-110' : 'border-white shadow-sm'}`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <label className="ml-auto flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={!!pul} onChange={(e) => dispatch({ type: 'UPDATE_HOTSPOT', payload: { id: hotspot.id, updates: { pulse: e.target.checked } } })} className="rounded border-gray-300 w-3 h-3" />
                    pulse
                  </label>
                </div>

                {/* Title/desc editable */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    value={hotspot.title}
                    onChange={(e) => dispatch({ type: 'UPDATE_HOTSPOT', payload: { id: hotspot.id, updates: { title: e.target.value, name: e.target.value } } })}
                    placeholder="Title"
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white/70 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <input
                    value={hotspot.description}
                    onChange={(e) => dispatch({ type: 'UPDATE_HOTSPOT', payload: { id: hotspot.id, updates: { description: e.target.value } } })}
                    placeholder="Description"
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white/70 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <label className="text-[10px] text-gray-500">Position
                      <input value={hotspot.position} onChange={(e) => dispatch({ type: 'UPDATE_HOTSPOT', payload: { id: hotspot.id, updates: { position: e.target.value } } })} className="mt-0.5 w-full px-2 py-1 text-[11px] font-mono border border-gray-200 rounded-lg bg-white/70" />
                    </label>
                    <label className="text-[10px] text-gray-500">Normal
                      <input value={hotspot.normal} onChange={(e) => dispatch({ type: 'UPDATE_HOTSPOT', payload: { id: hotspot.id, updates: { normal: e.target.value } } })} className="mt-0.5 w-full px-2 py-1 text-[11px] font-mono border border-gray-200 rounded-lg bg-white/70" />
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <label className="text-[10px] text-gray-500">Orbit
                      <input value={hotspot.focusOrbit} placeholder="current" onChange={(e) => dispatch({ type: 'UPDATE_HOTSPOT', payload: { id: hotspot.id, updates: { focusOrbit: e.target.value } } })} className="mt-0.5 w-full px-2 py-1 text-[10px] font-mono border border-gray-200 rounded-lg bg-white/70" />
                    </label>
                    <label className="text-[10px] text-gray-500">Target
                      <input value={hotspot.focusTarget} placeholder="anchor" onChange={(e) => dispatch({ type: 'UPDATE_HOTSPOT', payload: { id: hotspot.id, updates: { focusTarget: e.target.value } } })} className="mt-0.5 w-full px-2 py-1 text-[10px] font-mono border border-gray-200 rounded-lg bg-white/70" />
                    </label>
                    <label className="text-[10px] text-gray-500">FOV
                      <input value={hotspot.focusFov} placeholder="auto" onChange={(e) => dispatch({ type: 'UPDATE_HOTSPOT', payload: { id: hotspot.id, updates: { focusFov: e.target.value } } })} className="mt-0.5 w-full px-2 py-1 text-[10px] font-mono border border-gray-200 rounded-lg bg-white/70" />
                    </label>
                  </div>
                </div>

                <div className="flex gap-1.5 mt-2.5">
                  <button
                    onClick={() => handleFocus(hotspot)}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-lg font-medium ${isActive ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="7" /><line x1="12" y1="17" x2="12" y2="22" /><line x1="2" y1="12" x2="7" y2="12" /><line x1="17" y1="12" x2="22" y2="12" /></svg>
                    Go to View
                  </button>
                  <button onClick={() => handleRecapture(hotspot.id)} className="flex-1 px-2 py-1.5 text-xs bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Re-capture View</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
