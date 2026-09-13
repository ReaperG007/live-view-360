import { useRef, useState } from 'react';
import { useEditor } from '../../store/editor-store';
import { buildStandaloneZip } from '../../utils/export-zip';

export default function ImportExportPanel() {
  const { state, dispatch } = useEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [dragging, setDragging] = useState(false);

  const handleFileUpload = (file: File) => {
    const validExtensions = ['.glb', '.gltf'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      alert('Please select a GLB or glTF file.');
      return;
    }
    const url = URL.createObjectURL(file);
    dispatch({ type: 'SET_MODEL_SRC', payload: url });
    dispatch({ type: 'SET_MODEL_ALT', payload: file.name });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleUrlSubmit = () => {
    if (!inputUrl.trim()) return;
    dispatch({ type: 'SET_MODEL_SRC', payload: inputUrl.trim() });
    dispatch({ type: 'SET_MODEL_ALT', payload: 'Model from URL' });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleExportHtml = () => {
    const attrs: string[] = [];
    if (state.modelSrc) attrs.push(`src="${state.modelSrc}"`);
    if (state.modelAlt) attrs.push(`alt="${state.modelAlt}"`);
    if (state.cameraControls) attrs.push('camera-controls');
    if (state.autoRotate) attrs.push('auto-rotate');
    if (state.autoRotateDelay > 0) attrs.push(`auto-rotate-delay="${state.autoRotateDelay}"`);
    if (state.disableZoom) attrs.push('disable-zoom');
    if (state.environmentImage) attrs.push(`environment-image="${state.environmentImage}"`);
    if (state.skyboxImage) {
      attrs.push(`skybox-image="${state.skyboxImage}"`);
    }
    attrs.push(`exposure="${state.exposure}"`);
    attrs.push(`shadow-intensity="${state.shadowIntensity}"`);
    attrs.push(`shadow-softness="${state.shadowSoftness}"`);
    attrs.push(`camera-orbit="${state.cameraOrbit}"`);
    attrs.push(`camera-target="${state.cameraTarget}"`);
    attrs.push(`field-of-view="${state.fieldOfView}"`);
    if (state.modelScale !== 1)
      attrs.push(`scale="${state.modelScale} ${state.modelScale} ${state.modelScale}"`);
    if (state.animationName) attrs.push(`animation-name="${state.animationName}"`);
    if (state.autoplay) attrs.push('autoplay');

    // Hotspots with focus-view data attributes + a small click script that
    // animates the camera to each hotspot's saved pose.
    const hotspotMarkup = state.hotspots
      .map(
        (h, i) =>
          `  <button\n    slot="hotspot-${i}"\n    data-position="${h.position}"\n    data-normal="${h.normal}"\n    data-focus-orbit="${h.focusOrbit}"\n    data-focus-target="${h.focusTarget}"\n    data-focus-fov="${h.focusFov}"\n    style="width:24px;height:24px;border-radius:50%;background:rgba(59,130,246,.85);border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);cursor:pointer;"\n  >${h.title}</button>`
      )
      .join('\n');

    const hotspotScript =
      state.hotspots.length > 0
        ? `\n<script>\n  const mv = document.querySelector('model-viewer');\n  mv.querySelectorAll('[slot^="hotspot-"]').forEach((btn) => {\n    btn.addEventListener('click', () => {\n      mv.cameraTarget = btn.dataset.focusTarget || btn.dataset.position;\n      if (btn.dataset.focusOrbit) mv.cameraOrbit = btn.dataset.focusOrbit;\n      if (btn.dataset.focusFov) mv.fieldOfView = btn.dataset.focusFov;\n    });\n  });\n</script>`
        : '';

    const html = `<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"></script>\n<model-viewer ${attrs.join('\n  ')} style="width: 100%; height: 500px; background-color: ${state.backgroundColor};">\n${hotspotMarkup}\n</model-viewer>${hotspotScript}`;

    navigator.clipboard.writeText(html).then(() => {
      setExportStatus('HTML copied to clipboard!');
      setTimeout(() => setExportStatus(''), 3000);
    });
  };

  const handleExportScene = async () => {
    try {
      const viewer = document.querySelector('model-viewer') as unknown as {
        exportScene: () => Promise<Blob>;
      } | null;
      if (!viewer?.exportScene) {
        setExportStatus('No model loaded or export not available.');
        return;
      }
      const blob = await viewer.exportScene();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'model-exported.glb';
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus('Scene exported!');
      setTimeout(() => setExportStatus(''), 3000);
    } catch {
      setExportStatus('Export failed.');
    }
  };

  return (
    <div className="p-4 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Import Model</h3>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors backdrop-blur-sm ${
            dragging
              ? 'border-blue-400/60 bg-blue-400/15'
              : 'border-white/40 hover:border-white/60 hover:bg-white/30'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="text-sm text-gray-600">Drop a GLB/glTF file here</p>
          <p className="text-xs text-gray-400 mt-1">or click to browse</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.gltf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Or load from URL</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="https://example.com/model.glb"
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <button
            onClick={handleUrlSubmit}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={!inputUrl.trim()}
          >
            Load
          </button>
        </div>
      </div>

      {state.modelSrc && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Loaded Model</h3>
          <div className="bg-white/40 backdrop-blur-sm rounded-lg p-3 text-sm">
            <p className="text-gray-700 truncate font-mono text-xs">{state.modelAlt || state.modelSrc}</p>
            {state.modelLoaded && (
              <span className="inline-block mt-1.5 px-2 py-0.5 bg-green-400/20 text-green-700 text-xs rounded-full backdrop-blur-sm">
                Loaded
              </span>
            )}
          </div>
        </div>
      )}

      {/* Model Size — increase / decrease bar */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-800">
            Model Size
            {!state.modelSrc && (
              <span className="text-xs font-normal text-gray-400 ml-1">(load a model first)</span>
            )}
          </h3>
          <span className="text-xs font-mono text-gray-600">
            {Math.round(state.modelScale * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              dispatch({
                type: 'SET_MODEL_SCALE',
                payload: Math.max(0.1, Math.round((state.modelScale - 0.1) * 100) / 100),
              })
            }
            disabled={!state.modelSrc}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Decrease size"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <input
            type="range"
            min="0.1"
            max="3"
            step="0.05"
            value={state.modelScale}
            onChange={(e) =>
              dispatch({ type: 'SET_MODEL_SCALE', payload: parseFloat(e.target.value) })
            }
            disabled={!state.modelSrc}
            className="flex-1 accent-blue-600 disabled:opacity-40"
          />

          <button
            onClick={() =>
              dispatch({
                type: 'SET_MODEL_SCALE',
                payload: Math.min(3, Math.round((state.modelScale + 0.1) * 100) / 100),
              })
            }
            disabled={!state.modelSrc}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Increase size"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-10">
          <span>10%</span>
          <span>100%</span>
          <span>300%</span>
        </div>

        <div className="flex gap-2 mt-2">
          {[0.5, 1, 2].map((v) => (
            <button
              key={v}
              onClick={() => dispatch({ type: 'SET_MODEL_SCALE', payload: v })}
              disabled={!state.modelSrc}
              className={`flex-1 px-2 py-1 text-[11px] rounded border transition-colors disabled:opacity-40 backdrop-blur-sm ${
                state.modelScale === v
                  ? 'bg-blue-400/25 border-blue-400/40 text-blue-700 font-medium'
                  : 'bg-white/40 border-white/30 text-gray-600 hover:bg-white/60'
              }`}
            >
              {Math.round(v * 100)}%
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Export</h3>
        <div className="space-y-2">
          <button
            onClick={handleExportHtml}
            disabled={!state.modelSrc}
            className="w-full px-3 py-2 text-sm bg-gray-700/70 text-white rounded-lg hover:bg-gray-800/80 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
          >
            Copy HTML Snippet
          </button>
          <button
            onClick={handleExportScene}
            disabled={!state.modelSrc}
            className="w-full px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export Scene (GLB)
          </button>
          <button
            onClick={async () => {
              try {
                setExportStatus('Building 3D web ZIP…');
                const blob = await buildStandaloneZip(state);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = '3d-web-viewer.zip';
                a.click();
                URL.revokeObjectURL(url);
                setExportStatus('3D web ZIP downloaded — open index.html');
                setTimeout(() => setExportStatus(''), 4000);
              } catch (e) {
                setExportStatus('ZIP export failed: ' + (e as Error).message);
              }
            }}
            disabled={!state.modelSrc}
            className="w-full px-3 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Export 3D Web ZIP
          </button>
          <p className="text-[11px] text-gray-500 leading-snug">Single download: <strong>index.html</strong> with hotspot + FPV + walkthrough, plus the model. Works offline by just opening index.html. Camera never crosses rigid parts.</p>
          {exportStatus && (
            <p className="text-xs text-green-600 text-center">{exportStatus}</p>
          )}
        </div>
      </div>
    </div>
  );
}
