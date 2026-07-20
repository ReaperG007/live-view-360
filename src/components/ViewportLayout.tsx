import { useState } from 'react';
import { useEditor } from '../store/editor-store';
import ModelViewer from './ModelViewer';
import MiniViewport from './MiniViewport';

const VIEW_PRESETS = {
  perspective: '0deg 75deg 100%',
  front: '0deg 90deg auto',
  back: '180deg 90deg auto',
  top: '0deg 0deg auto',
  bottom: '0deg 180deg auto',
  left: '90deg 90deg auto',
  right: '-90deg 90deg auto',
};

export default function ViewportLayout() {
  const { state, dispatch } = useEditor();
  const [splitLayout, setSplitLayout] = useState<'h' | 'v'>('h'); // horizontal or vertical split

  const setLayout = (layout: 'single' | 'split' | 'quad') => {
    dispatch({ type: 'SET_VIEW_LAYOUT', payload: layout });
  };

  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Toolbar for view controls */}
      <div className="absolute top-12 right-4 z-20 flex items-center gap-1 bg-white/50 backdrop-blur-xl rounded-lg border border-white/30 shadow-lg p-1">
        <button
          onClick={() => setLayout('single')}
          className={`p-1.5 rounded text-xs ${
            state.viewLayout === 'single'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
          title="Single view"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        </button>
        <button
          onClick={() => {
            setLayout('split');
          }}
          className={`p-1.5 rounded text-xs ${
            state.viewLayout === 'split'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
          title="Split view (2 views)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="12" y1="3" x2="12" y2="21" />
          </svg>
        </button>
        <button
          onClick={() => setLayout('quad')}
          className={`p-1.5 rounded text-xs ${
            state.viewLayout === 'quad'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
          title="Quad view (4 views)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="12" y1="3" x2="12" y2="21" />
          </svg>
        </button>

        {state.viewLayout === 'split' && (
          <>
            <div className="w-px h-4 bg-gray-200 mx-0.5" />
            <button
              onClick={() => setSplitLayout('h')}
              className={`p-1.5 rounded ${
                splitLayout === 'h'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="Horizontal split"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
              </svg>
            </button>
            <button
              onClick={() => setSplitLayout('v')}
              className={`p-1.5 rounded ${
                splitLayout === 'v'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="Vertical split"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="3" x2="12" y2="21" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Viewports */}
      {state.viewLayout === 'single' && (
        <div className="w-full h-full">
          <ModelViewer />
        </div>
      )}

      {state.viewLayout === 'split' && (
        <div className={`w-full h-full flex ${splitLayout === 'h' ? 'flex-col' : 'flex-row'}`}>
          <div className="flex-1 relative border-gray-300 border-b-2 md:border-b-0 md:border-r-2">
            <ModelViewer />
            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded font-medium backdrop-blur-sm z-20 pointer-events-none">
              Perspective
            </div>
          </div>
          <div className="flex-1">
            <MiniViewport label="Top" orbit={VIEW_PRESETS.top} interactive fov="30deg" />
          </div>
        </div>
      )}

      {state.viewLayout === 'quad' && (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5 bg-gray-300">
          <div className="relative bg-gray-900">
            <ModelViewer />
            <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md text-white text-xs px-2 py-1 rounded font-medium z-10 pointer-events-none">
              Perspective
            </div>
          </div>
          <div className="relative">
            <MiniViewport label="Top" orbit={VIEW_PRESETS.top} fov="45deg" />
          </div>
          <div className="relative">
            <MiniViewport label="Front" orbit={VIEW_PRESETS.front} fov="45deg" />
          </div>
          <div className="relative">
            <MiniViewport label="Right" orbit={VIEW_PRESETS.right} fov="45deg" />
          </div>
        </div>
      )}
    </div>
  );
}
