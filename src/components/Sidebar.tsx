import { useEditor } from '../store/editor-store';
import type { EditorTab } from '../store/editor-store';
import ImportExportPanel from './panels/ImportExportPanel';
import ScenePanel from './panels/ScenePanel';
import CameraPanel from './panels/CameraPanel';
import AnimationPanel from './panels/AnimationPanel';
import MaterialsPanel from './panels/MaterialsPanel';
import HotspotPanel from './panels/HotspotPanel';
import InspectorPanel from './panels/InspectorPanel';

interface TabConfig {
  id: EditorTab;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabConfig[] = [
  {
    id: 'import',
    label: 'Import / Export',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    id: 'scene',
    label: 'Scene',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
  {
    id: 'camera',
    label: 'Camera',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    id: 'animation',
    label: 'Animation',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    id: 'materials',
    label: 'Materials',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    id: 'hotspots',
    label: 'Hotspots',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    id: 'inspector',
    label: 'Inspector',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const { state, dispatch } = useEditor();

  const activeTabConfig = tabs.find((t) => t.id === state.activeTab);

  return (
    <div className="flex h-full w-full bg-transparent">
      {/* Vertical icon rail — ultra-transparent glass */}
      <nav className="w-14 flex-shrink-0 flex flex-col items-center py-3 gap-1 bg-white/10 backdrop-blur-3xl border-r border-white/10">
        {/* Logo at top */}
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/60 to-indigo-600/60 backdrop-blur-md flex items-center justify-center mb-2 shadow-sm">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        </div>

        {tabs.map((tab) => {
          const isActive = state.activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab.id })}
              className={`w-10 h-10 flex flex-col items-center justify-center rounded-lg text-[10px] font-medium transition-colors ${
                isActive
                  ? 'bg-blue-500/20 text-blue-600 shadow-sm backdrop-blur-md border border-blue-300/20'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-white/30'
              }`}
              title={tab.label}
            >
              {tab.icon}
            </button>
          );
        })}
      </nav>

      {/* Content panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Panel header with title — ultra glass */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/20 backdrop-blur-2xl">
          <h2 className="text-sm font-semibold text-gray-800">
            {activeTabConfig?.label}
          </h2>
          <span className="text-[10px] uppercase tracking-wider text-gray-400">
            {state.modelLoaded ? (
              <span className="inline-flex items-center gap-1 text-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            ) : (
              'No model'
            )}
          </span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {state.activeTab === 'import' && <ImportExportPanel />}
          {state.activeTab === 'scene' && <ScenePanel />}
          {state.activeTab === 'camera' && <CameraPanel />}
          {state.activeTab === 'animation' && <AnimationPanel />}
          {state.activeTab === 'materials' && <MaterialsPanel />}
          {state.activeTab === 'hotspots' && <HotspotPanel />}
          {state.activeTab === 'inspector' && <InspectorPanel />}
        </div>

        {/* Footer — ultra glass */}
        <div className="border-t border-white/10 px-4 py-2 bg-white/15 backdrop-blur-xl">
          <p className="text-[11px] text-gray-400 text-center">
            360° Viewer Editor
          </p>
        </div>
      </div>
    </div>
  );
}
