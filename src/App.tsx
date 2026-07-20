import '@google/model-viewer';
import { useState, useEffect, useCallback } from 'react';
import { EditorProvider } from './components/EditorProvider';
import Sidebar from './components/Sidebar';
import ViewportLayout from './components/ViewportLayout';

const SIDEBAR_WIDTH = 320; // px

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Toggle sidebar with keyboard shortcut: Ctrl/Cmd+B or Bracket
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      setSidebarOpen((open) => !open);
    }
    if (e.key === 'Escape') {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <EditorProvider>
      <div className="h-screen w-screen overflow-hidden bg-white flex">
        {/* Sliding Sidebar Drawer — glassmorphic */}
        <aside
          className={`relative flex-shrink-0 h-full z-40 bg-white/30 backdrop-blur-3xl shadow-2xl transition-[width] duration-300 ease-in-out overflow-hidden border-r border-white/20`}
          style={{ width: sidebarOpen ? SIDEBAR_WIDTH : 0 }}
        >
          <div
            className="h-full w-full"
            style={{ width: SIDEBAR_WIDTH }}
          >
            <Sidebar />
          </div>
        </aside>

        {/* Main content - slides with the sidebar */}
        <main className="flex-1 h-full relative min-w-0">
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2 bg-white/40 backdrop-blur-xl border-b border-white/20">
            <div className="flex items-center gap-3">
              {/* Hamburger / close toggle button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center"
                title={sidebarOpen ? 'Hide editor panel (Ctrl+B)' : 'Show editor panel (Ctrl+B)'}
                aria-label="Toggle editor panel"
              >
                {sidebarOpen ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                )}
              </button>

              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-blue-600 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
                <h1 className="text-sm font-semibold text-gray-800">
                  360° Viewer Editor
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden md:inline text-[11px] text-gray-400 font-mono">
                Ctrl+B to toggle panel
              </span>
            </div>
          </div>

          {/* Viewport area */}
          <div className="h-full pt-10">
            <ViewportLayout />
          </div>
        </main>
      </div>
    </EditorProvider>
  );
}
