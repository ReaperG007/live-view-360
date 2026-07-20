import { useEditor } from '../../store/editor-store';

export default function InspectorPanel() {
  const { state } = useEditor();

  return (
    <div className="p-4 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Model Info</h3>

        {!state.modelSrc ? (
          <div className="text-center text-gray-400 py-8">
            <svg className="w-10 h-10 mx-auto mb-2 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <p className="text-sm">No model loaded</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-white/30 backdrop-blur-sm rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Status</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    state.modelLoaded
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {state.modelLoaded ? 'Loaded' : 'Loading...'}
                </span>
              </div>
            </div>

            <div className="bg-white/30 backdrop-blur-sm rounded-lg p-3">
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-500">Source</span>
                <span className="text-xs text-gray-700 text-right max-w-[200px] truncate font-mono">
                  {state.modelAlt || state.modelSrc}
                </span>
              </div>
            </div>

            <div className="bg-white/30 backdrop-blur-sm rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-gray-600">Materials</span>
                <span className="text-xs font-mono text-gray-700">{state.materials.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Hotspots</span>
                <span className="text-xs font-mono text-gray-700">{state.hotspots.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Camera Controls</span>
                <span className="text-xs font-mono text-gray-700">
                  {state.cameraControls ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Auto Rotate</span>
                <span className="text-xs font-mono text-gray-700">
                  {state.autoRotate ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">View Layout</span>
                <span className="text-xs font-mono text-gray-700 capitalize">{state.viewLayout}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Model Scale</span>
                <span className="text-xs font-mono text-gray-700">
                  {Math.round(state.modelScale * 100)}%
                </span>
              </div>
            </div>

            <div className="bg-white/30 backdrop-blur-sm rounded-lg p-3 space-y-2">
              <h4 className="text-xs font-semibold text-gray-800 mb-1">Camera</h4>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Orbit</span>
                <span className="text-xs font-mono text-gray-700 max-w-[140px] truncate text-right">
                  {state.cameraOrbit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Target</span>
                <span className="text-xs font-mono text-gray-700 max-w-[140px] truncate text-right">
                  {state.cameraTarget}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">FOV</span>
                <span className="text-xs font-mono text-gray-700">{state.fieldOfView}</span>
              </div>
            </div>

            <div className="bg-white/30 backdrop-blur-sm rounded-lg p-3 space-y-2">
              <h4 className="text-xs font-semibold text-gray-800 mb-1">Lighting</h4>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Exposure</span>
                <span className="text-xs font-mono text-gray-700">{state.exposure.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Shadow Intensity</span>
                <span className="text-xs font-mono text-gray-700">
                  {state.shadowIntensity.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Shadow Softness</span>
                <span className="text-xs font-mono text-gray-700">
                  {state.shadowSoftness.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Environment</span>
                <span className="text-xs font-mono text-gray-700 max-w-[140px] truncate text-right">
                  {state.environmentImage || 'Default'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
