import { useEditor } from '../../store/editor-store';

export default function CameraPanel() {
  const { state, dispatch } = useEditor();

  return (
    <div className="p-4 space-y-5">
      {/* Camera Mode */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Camera Mode</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => dispatch({ type: 'SET_CAMERA_MODE', payload: 'orbit' })}
            className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg border text-xs font-medium transition-all ${
              state.cameraMode === 'orbit'
                ? 'bg-blue-400/20 border-blue-400/50 text-blue-700 shadow-sm'
                : 'bg-white/40 border-white/30 text-gray-600 hover:bg-white/60'
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <ellipse cx="12" cy="12" rx="9" ry="4" />
            </svg>
            Orbit
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_CAMERA_MODE', payload: 'fpv' })}
            className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg border text-xs font-medium transition-all ${
              state.cameraMode === 'fpv'
                ? 'bg-blue-400/20 border-blue-400/50 text-blue-700 shadow-sm'
                : 'bg-white/40 border-white/30 text-gray-600 hover:bg-white/60'
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            FPV
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">
          {state.cameraMode === 'fpv'
            ? 'First-person view locked at eye level. Drag to look around.'
            : 'Free orbit around the model. Drag to rotate, scroll to zoom.'}
        </p>

        {state.cameraMode === 'fpv' && (
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.showFpvControls}
                onChange={(e) => dispatch({ type: 'SET_SHOW_FPV_CONTROLS', payload: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show FPV Controller</span>
            </label>
            <p className="text-[11px] text-gray-500 leading-snug">Joystick drag + <strong>WASD</strong> to look, <strong>Q/E</strong> vertical, <strong>+/−</strong> zoom. Camera enforces a safe distance so you cannot pass through walls.</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 whitespace-nowrap">Safe distance</span>
              <input type="range" min={0} max={1.5} step={0.05} value={state.collisionPadding} onChange={(e) => dispatch({ type: 'SET_COLLISION_PADDING', payload: parseFloat(e.target.value) })} className="flex-1 accent-emerald-600" />
              <span className="text-xs font-mono w-10 text-right">{state.collisionPadding.toFixed(2)}m</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Camera Controls</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={state.cameraControls}
            onChange={(e) => dispatch({ type: 'SET_CAMERA_CONTROLS', payload: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Enable Camera Controls</span>
        </label>
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={state.autoRotate}
            onChange={(e) => dispatch({ type: 'SET_AUTO_ROTATE', payload: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Auto Rotate</span>
        </label>
      </div>

      {state.autoRotate && (
        <div>
          <label className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Auto Rotate Delay (ms)</span>
            <span>{state.autoRotateDelay}</span>
          </label>
          <input
            type="range"
            min="0"
            max="5000"
            step="100"
            value={state.autoRotateDelay}
            onChange={(e) => dispatch({ type: 'SET_AUTO_ROTATE_DELAY', payload: parseInt(e.target.value) })}
            className="w-full accent-blue-600"
          />
        </div>
      )}

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Orbit</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Camera Orbit</label>
            <input
              type="text"
              value={state.cameraOrbit}
              onChange={(e) => dispatch({ type: 'SET_CAMERA_ORBIT', payload: e.target.value })}
              className="w-full px-3 py-1.5 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="0deg 75deg auto"
            />
            <p className="text-xs text-gray-400 mt-1">
              Format: azimuthal angle, inclination angle, radius
            </p>
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-1 block">Camera Target</label>
            <input
              type="text"
              value={state.cameraTarget}
              onChange={(e) => dispatch({ type: 'SET_CAMERA_TARGET', payload: e.target.value })}
              className="w-full px-3 py-1.5 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="auto auto auto"
            />
            <p className="text-xs text-gray-400 mt-1">
              Format: X Y Z (use 'auto' for default)
            </p>
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-1 block">Field of View</label>
            <input
              type="text"
              value={state.fieldOfView}
              onChange={(e) => dispatch({ type: 'SET_FIELD_OF_VIEW', payload: e.target.value })}
              className="w-full px-3 py-1.5 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="45deg"
            />
            <p className="text-xs text-gray-400 mt-1">
              e.g. 45deg, 30deg, or 'auto'
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Limits</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Min Camera Orbit</label>
            <input
              type="text"
              value={state['min-camera-orbit'] || ''}
              onChange={(e) => dispatch({ type: 'SET_MIN_CAMERA_ORBIT', payload: e.target.value })}
              className="w-full px-3 py-1.5 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="auto"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-1 block">Max Camera Orbit</label>
            <input
              type="text"
              value={state['max-camera-orbit'] || ''}
              onChange={(e) => dispatch({ type: 'SET_MAX_CAMERA_ORBIT', payload: e.target.value })}
              className="w-full px-3 py-1.5 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="auto"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.disableZoom}
              onChange={(e) => dispatch({ type: 'SET_DISABLE_ZOOM', payload: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Disable Zoom</span>
          </label>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Interaction Prompt</h3>
        <div className="space-y-3">
          <select
            value={state.interactionPrompt}
            onChange={(e) => dispatch({ type: 'SET_INTERACTION_PROMPT', payload: e.target.value })}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="auto">Auto</option>
            <option value="when-focused">When Focused</option>
            <option value="all">Always</option>
            <option value="none">None</option>
          </select>

          <div>
            <label className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Prompt Threshold (ms)</span>
              <span>{state.interactionPromptThreshold}</span>
            </label>
            <input
              type="range"
              min="500"
              max="10000"
              step="100"
              value={state.interactionPromptThreshold}
              onChange={(e) => dispatch({ type: 'SET_INTERACTION_PROMPT_THRESHOLD', payload: parseInt(e.target.value) })}
              className="w-full accent-blue-600"
            />
          </div>

          <select
            value={state.interactionPromptStyle}
            onChange={(e) => dispatch({ type: 'SET_INTERACTION_PROMPT_STYLE', payload: e.target.value })}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="basic">Basic</option>
            <option value="extended">Extended</option>
          </select>
        </div>
      </div>
    </div>
  );
}
