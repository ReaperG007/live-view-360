import { useEditor } from '../../store/editor-store';

export default function AnimationPanel() {
  const { state, dispatch } = useEditor();

  return (
    <div className="p-4 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">
          Animation
          {!state.modelLoaded && (
            <span className="text-xs font-normal text-gray-400 ml-1">(load a model first)</span>
          )}
        </h3>

        {state.modelLoaded && (
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={state.autoplay}
              onChange={(e) => dispatch({ type: 'SET_AUTOPLAY', payload: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Auto Play</span>
          </label>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Animation Name</h3>
        <input
          type="text"
          value={state.animationName}
          onChange={(e) => dispatch({ type: 'SET_ANIMATION_NAME', payload: e.target.value })}
          placeholder={state.modelLoaded ? 'Select from available animations' : 'Load a model first'}
          className="w-full px-3 py-1.5 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          disabled={!state.modelLoaded}
        />
        <p className="text-xs text-gray-400 mt-1">
          Enter the name of the animation to play.
        </p>
      </div>

      <div>
        <label className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Crossfade Duration (ms)</span>
          <span>{state.animationCrossfadeDuration}ms</span>
        </label>
        <input
          type="range"
          min="0"
          max="2000"
          step="50"
          value={state.animationCrossfadeDuration}
          onChange={(e) =>
            dispatch({
              type: 'SET_ANIMATION_CROSSFADE_DURATION',
              payload: parseInt(e.target.value),
            })
          }
          className="w-full accent-blue-600"
          disabled={!state.modelLoaded}
        />
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Model Variant</h3>
        <input
          type="text"
          value={state.variantName}
          onChange={(e) => dispatch({ type: 'SET_VARIANT_NAME', payload: e.target.value })}
          placeholder={state.modelLoaded ? 'Select variant' : 'Load a model first'}
          className="w-full px-3 py-1.5 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          disabled={!state.modelLoaded}
        />
        <p className="text-xs text-gray-400 mt-1">
          Enter the variant name if the model has multiple variants.
        </p>
      </div>
    </div>
  );
}
