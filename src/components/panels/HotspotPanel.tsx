import { useState } from 'react';
import { useEditor } from '../../store/editor-store';

/** Read the live camera pose from the main (perspective) model-viewer. */
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

/** Smoothly animate the main viewport camera to a hotspot's focus pose. */
export function focusCameraOnHotspot(hotspot: {
  position: string;
  focusOrbit: string;
  focusTarget: string;
  focusFov: string;
}) {
  const viewer = document.querySelector('model-viewer') as unknown as {
    cameraTarget?: string;
    cameraOrbit?: string;
    fieldOfView?: string;
  } | null;
  if (!viewer) return;
  try {
    viewer.cameraTarget = hotspot.focusTarget || hotspot.position;
    if (hotspot.focusOrbit) viewer.cameraOrbit = hotspot.focusOrbit;
    if (hotspot.focusFov) viewer.fieldOfView = hotspot.focusFov;
  } catch {
    // camera not ready
  }
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

  const picking = state.pickingHotspot;

  const togglePicking = () => {
    dispatch({ type: 'SET_PICKING_HOTSPOT', payload: !picking });
  };

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
      },
    });
    setNewTitle('');
    setNewDescription('');
    setFocusOrbit('');
    setFocusTarget('');
    setFocusFov('');
  };

  const handleFocusHotspot = (hotspot: (typeof state.hotspots)[number]) => {
    focusCameraOnHotspot(hotspot);
    dispatch({ type: 'SET_ACTIVE_HOTSPOT', payload: hotspot.id });
  };

  const handleRecapture = (id: string) => {
    const pose = captureCameraPose();
    dispatch({
      type: 'UPDATE_HOTSPOT',
      payload: {
        id,
        updates: {
          focusOrbit: pose.orbit,
          focusTarget: pose.target,
          focusFov: pose.fov,
        },
      },
    });
  };

  return (
    <div className="p-4 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Create Hotspot</h3>
        <p className="text-xs text-gray-500 mb-3">
          Click <strong>“Click to Place on Model”</strong> then click any part of the model to instantly drop a hotspot at that exact location (with its surface normal). You can also type coordinates manually.
        </p>

        <button
          onClick={togglePicking}
          className={`mb-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${picking ? 'bg-green-600 text-white border-green-700' : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'}`}
        >
          {picking ? 'Cancel Click-to-Place' : 'Click to Place on Model'}
        </button>

        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Cockpit, Wheel, Rear Light"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-1 block">Description</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Position (X Y Z)</label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full px-2 py-1.5 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Normal (X Y Z)</label>
              <input
                type="text"
                value={normal}
                onChange={(e) => setNormal(e.target.value)}
                className="w-full px-2 py-1.5 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Focus view capture */}
          <div className="bg-blue-400/10 border border-blue-400/30 rounded-lg p-3 space-y-2 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-800">Focus View on Click</span>
              <button
                onClick={handleCapture}
                disabled={!state.modelSrc}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <line x1="12" y1="2" x2="12" y2="7" />
                  <line x1="12" y1="17" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="7" y2="12" />
                  <line x1="17" y1="12" x2="22" y2="12" />
                </svg>
                Capture Current
              </button>
            </div>
            <p className="text-[11px] text-blue-700 leading-snug">
              Orbit the model to frame the part, then capture. Clicking this hotspot will fly the
              camera to this exact view.
            </p>
            {focusOrbit && (
              <div className="text-[10px] font-mono text-blue-900 bg-white/60 rounded p-1.5 space-y-0.5">
                <div>orbit: {focusOrbit}</div>
                <div>target: {focusTarget}</div>
                <div>fov: {focusFov}</div>
              </div>
            )}
          </div>

          <button
            onClick={handleAddHotspot}
            disabled={!newTitle.trim() || !state.modelSrc}
            className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Hotspot
          </button>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">
          Hotspots ({state.hotspots.length})
        </h3>

        {state.hotspots.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">
            No hotspots yet. Add one above to create interactive views.
          </p>
        )}

        <div className="space-y-2">
          {state.hotspots.map((hotspot) => {
            const isActive = state.activeHotspotId === hotspot.id;
            return (
              <div
                key={hotspot.id}
                className={`rounded-lg p-3 border transition-colors backdrop-blur-sm ${
                  isActive
                    ? 'bg-blue-400/15 border-blue-400/50'
                    : 'bg-white/30 border-white/30'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <button
                    onClick={() => handleFocusHotspot(hotspot)}
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-800 hover:text-blue-700"
                    title="Click to fly camera to this view"
                  >
                    <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="4" />
                    </svg>
                    {hotspot.title}
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'REMOVE_HOTSPOT', payload: hotspot.id })}
                    className="text-red-500 hover:text-red-700 p-0.5"
                    title="Remove hotspot"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {hotspot.description && (
                  <p className="text-xs text-gray-500 mb-2">{hotspot.description}</p>
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400 w-12">Anchor</span>
                    <input
                      type="text"
                      value={hotspot.position}
                      onChange={(e) =>
                        dispatch({
                          type: 'UPDATE_HOTSPOT',
                          payload: { id: hotspot.id, updates: { position: e.target.value } },
                        })
                      }
                      className="flex-1 px-1.5 py-0.5 text-[11px] font-mono border border-gray-200 rounded"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400 w-12">Normal</span>
                    <input
                      type="text"
                      value={hotspot.normal}
                      onChange={(e) =>
                        dispatch({
                          type: 'UPDATE_HOTSPOT',
                          payload: { id: hotspot.id, updates: { normal: e.target.value } },
                        })
                      }
                      className="flex-1 px-1.5 py-0.5 text-[11px] font-mono border border-gray-200 rounded"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400 w-12">Orbit</span>
                    <input
                      type="text"
                      value={hotspot.focusOrbit}
                      placeholder="current"
                      onChange={(e) =>
                        dispatch({
                          type: 'UPDATE_HOTSPOT',
                          payload: { id: hotspot.id, updates: { focusOrbit: e.target.value } },
                        })
                      }
                      className="flex-1 px-1.5 py-0.5 text-[11px] font-mono border border-gray-200 rounded"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400 w-12">Target</span>
                    <input
                      type="text"
                      value={hotspot.focusTarget}
                      placeholder="anchor"
                      onChange={(e) =>
                        dispatch({
                          type: 'UPDATE_HOTSPOT',
                          payload: { id: hotspot.id, updates: { focusTarget: e.target.value } },
                        })
                      }
                      className="flex-1 px-1.5 py-0.5 text-[11px] font-mono border border-gray-200 rounded"
                    />
                  </div>
                </div>

                <div className="flex gap-1.5 mt-2">
                  <button
                    onClick={() => handleFocusHotspot(hotspot)}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[11px] rounded font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="3" />
                      <line x1="12" y1="2" x2="12" y2="7" />
                      <line x1="12" y1="17" x2="12" y2="22" />
                      <line x1="2" y1="12" x2="7" y2="12" />
                      <line x1="17" y1="12" x2="22" y2="12" />
                    </svg>
                    Go to View
                  </button>
                  <button
                    onClick={() => handleRecapture(hotspot.id)}
                    className="flex-1 px-2 py-1 text-[11px] bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                    title="Overwrite the focus view with the current camera"
                  >
                    Re-capture View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
