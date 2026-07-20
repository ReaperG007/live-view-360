import { useRef, useState } from 'react';
import { useEditor } from '../../store/editor-store';

// Landscape-style environment lighting presets (outdoor only)
export const SUMMER_ENV_URL =
  'https://modelviewer.dev/shared-assets/environments/spruit_sunrise_1k_HDR.hdr';
export const RAIN_ENV_URL =
  'https://modelviewer.dev/shared-assets/environments/whipple_creek_regional_park_04_1k.hdr';
export const WINTER_ENV_URL =
  'https://modelviewer.dev/shared-assets/environments/pillars_1k.hdr';

export const DEFAULT_ENVIRONMENTS: Array<{
  name: string;
  value: string;
  landscape: string;
  subtitle?: string;
}> = [
  { name: 'None', value: '', landscape: 'none' },
  { name: 'Neutral', value: 'neutral', landscape: 'neutral' },
  { name: 'Summer', value: SUMMER_ENV_URL, landscape: 'summer', subtitle: 'Sunny Day' },
  { name: 'Rain', value: RAIN_ENV_URL, landscape: 'rain', subtitle: 'Overcast Park' },
  { name: 'Winter', value: WINTER_ENV_URL, landscape: 'winter', subtitle: 'Snow Field' },
];

/** Landscape preview thumbnails for environment cards */
function EnvCardPreview({ kind }: { kind: string }) {
  const base = 'absolute inset-0 overflow-hidden rounded-t-lg';
  return (
    <div className="relative w-full aspect-[16/9] bg-gray-100 rounded-t-lg overflow-hidden">
      {kind === 'none' && (
        <div className={`${base} flex items-center justify-center bg-gray-200`}>
          <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </div>
      )}
      {kind === 'neutral' && (
        <div className={base} style={{ background: 'linear-gradient(180deg, #d9dee3 0%, #e9edf1 55%, #b8bfc6 55%, #9aa2aa 100%)' }}>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white/70 blur-[1px]" />
        </div>
      )}
      {kind === 'summer' && (
        <div className={base} style={{ background: 'linear-gradient(180deg, #2f7dd6 0%, #7db5e8 48%, #cfe9c9 48%, #5e9c46 62%, #3e6e30 100%)' }}>
          <div className="absolute top-1.5 left-2 w-4 h-4 rounded-full" style={{ background: '#fff7c2', boxShadow: '0 0 14px 4px rgba(255,230,120,.9)' }} />
          <div className="absolute bottom-[38%] left-[62%] w-8 h-2.5 rounded-full bg-white/75 blur-[1.5px]" />
          <div className="absolute bottom-[44%] left-[26%] w-10 h-3 rounded-full bg-white/60 blur-[1.5px]" />
        </div>
      )}
      {kind === 'rain' && (
        <div className={base} style={{ background: 'linear-gradient(180deg, #4c555e 0%, #7a848d 45%, #96a08c 45%, #4c5a43 60%, #2f3a2b 100%)' }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="absolute bg-blue-200/70 rounded-sm" style={{ width: 1.5, height: 8, top: `${12 + (i % 3) * 9}%`, left: `${8 + i * 13}%`, transform: 'rotate(12deg)' }} />
          ))}
          <div className="absolute top-[8%] left-0 right-0 h-3 bg-gray-300/40 blur-[2px]" />
        </div>
      )}
      {kind === 'winter' && (
        <div className={base} style={{ background: 'linear-gradient(180deg, #86a6c4 0%, #c8d9e8 42%, #f2f7fb 48%, #e4ecf2 60%, #bccad6 100%)' }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[35%] w-16 h-px bg-white/70" />
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="absolute w-1 h-1 rounded-full bg-white" style={{ top: `${15 + ((i * 7) % 30)}%`, left: `${5 + i * 9}%`, opacity: 0.55 + (i % 4) * 0.1 }} />
          ))}
          <div className="absolute bottom-[30%] left-[30%] w-2.5 h-2.5 rounded-full" style={{ background: '#fffdf4', boxShadow: '0 0 8px 3px rgba(255,250,230,.8)' }} />
        </div>
      )}
    </div>
  );
}



export default function ScenePanel() {
  const { state, dispatch } = useEditor();
  const envFileRef = useRef<HTMLInputElement>(null);
  const [customEnvUrl, setCustomEnvUrl] = useState('');
  const [envPreviewUrl, setEnvPreviewUrl] = useState('');

  const defaultEnvValues = DEFAULT_ENVIRONMENTS.map((e) => e.value);
  const isCustomEnv = state.environmentImage && !defaultEnvValues.includes(state.environmentImage);

  const handleEnvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validExts = ['.hdr', '.exr', '.png', '.jpg', '.jpeg', '.webp'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExts.includes(ext)) {
      alert('Please select an HDR, EXR, or equirectangular image file.');
      return;
    }
    const url = URL.createObjectURL(file);
    dispatch({ type: 'SET_ENVIRONMENT_IMAGE', payload: url });
    setEnvPreviewUrl(url);
  };

  const handleCustomEnvUrlSubmit = () => {
    if (!customEnvUrl.trim()) return;
    dispatch({ type: 'SET_ENVIRONMENT_IMAGE', payload: customEnvUrl.trim() });
    setEnvPreviewUrl(customEnvUrl.trim());
    setCustomEnvUrl('');
  };

  // Quick seasonal presets
  const setSummerMode = () => {
    dispatch({ type: 'SET_ENVIRONMENT_IMAGE', payload: SUMMER_ENV_URL });
    dispatch({ type: 'SET_BACKGROUND_COLOR', payload: '#ffffff' });
    dispatch({ type: 'SET_EXPOSURE', payload: 1 });
  };
  const setRainMode = () => {
    dispatch({ type: 'SET_ENVIRONMENT_IMAGE', payload: RAIN_ENV_URL });
    dispatch({ type: 'SET_BACKGROUND_COLOR', payload: '#949ba3' });
    dispatch({ type: 'SET_EXPOSURE', payload: 0.9 });
  };
  const setWinterMode = () => {
    dispatch({ type: 'SET_ENVIRONMENT_IMAGE', payload: WINTER_ENV_URL });
    dispatch({ type: 'SET_BACKGROUND_COLOR', payload: '#e8edf2' });
    dispatch({ type: 'SET_EXPOSURE', payload: 1.1 });
  };

  const isSummerActive = state.environmentImage === SUMMER_ENV_URL;
  const isRainActive = state.environmentImage === RAIN_ENV_URL;
  const isWinterActive = state.environmentImage === WINTER_ENV_URL;

  return (
    <div className="p-4 space-y-5">
      {/* Seasonal quick presets */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Quick Presets</h3>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={setSummerMode} className={`flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-lg border text-xs font-medium transition-colors ${isSummerActive ? 'bg-amber-300/30 border-amber-400/50 text-amber-700 backdrop-blur-sm' : 'bg-white/40 border-white/30 text-gray-600 hover:bg-amber-400/15 hover:border-amber-300/50 hover:text-amber-800 backdrop-blur-sm'}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" /></svg>
            Summer
          </button>
          <button onClick={setRainMode} className={`flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-lg border text-xs font-medium transition-colors ${isRainActive ? 'bg-slate-300/30 border-slate-400/50 text-slate-700 backdrop-blur-sm' : 'bg-white/40 border-white/30 text-gray-600 hover:bg-slate-400/15 hover:border-slate-300/50 hover:text-slate-800 backdrop-blur-sm'}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16" y1="13" x2="16" y2="21" /><line x1="8" y1="13" x2="8" y2="21" /><line x1="12" y1="15" x2="12" y2="23" /><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" /></svg>
            Rain
          </button>
          <button onClick={setWinterMode} className={`flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-lg border text-xs font-medium transition-colors ${isWinterActive ? 'bg-sky-300/30 border-sky-400/50 text-sky-700 backdrop-blur-sm' : 'bg-white/40 border-white/30 text-gray-600 hover:bg-sky-400/15 hover:border-sky-300/50 hover:text-sky-800 backdrop-blur-sm'}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22" /><line x1="3.34" y1="7" x2="20.66" y2="17" /><line x1="3.34" y1="17" x2="20.66" y2="7" /><line x1="12" y1="2" x2="9" y2="5" /><line x1="12" y1="2" x2="15" y2="5" /><line x1="12" y1="22" x2="9" y2="19" /><line x1="12" y1="22" x2="15" y2="19" /></svg>
            Winter
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">One-click seasonal lighting.</p>
      </div>

      {/* Environment Lighting as landscape cards */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Environment Lighting (IBL)</h3>
        <p className="text-xs text-gray-500 mb-2">Landscape lighting. Click a card to apply.</p>

        <div className="grid grid-cols-2 gap-2">
          {DEFAULT_ENVIRONMENTS.map((env) => {
            const active = state.environmentImage === env.value;
            return (
              <button
                key={env.value}
                onClick={() => dispatch({ type: 'SET_ENVIRONMENT_IMAGE', payload: env.value })}
                className={`relative rounded-lg border text-left overflow-hidden transition-all backdrop-blur-sm ${active ? 'border-blue-400/60 ring-2 ring-blue-300/50 shadow-sm bg-white/50' : 'border-white/30 bg-white/30 hover:border-white/50 hover:bg-white/50 hover:shadow-sm'}`}
              >
                <EnvCardPreview kind={env.landscape} />
                <div className="px-2 py-1.5">
                  <div className="text-xs font-semibold text-gray-800 leading-tight">{env.name}</div>
                  {env.subtitle && <div className="text-[10px] text-gray-400 leading-tight">{env.subtitle}</div>}
                </div>
              </button>
            );
          })}
        </div>

        {isCustomEnv && (
          <p className="text-xs text-blue-600 mt-2 truncate font-mono">
            Custom: {state.environmentImage.length > 40 ? state.environmentImage.slice(0, 40) + '...' : state.environmentImage}
          </p>
        )}

        <div className="flex gap-2 mt-3">
          <button onClick={() => envFileRef.current?.click()} className="flex-1 px-2 py-1.5 text-xs bg-white/40 hover:bg-white/60 text-gray-700 rounded-lg border border-white/30 backdrop-blur-sm">
            Upload HDR/EXR
          </button>
          <input ref={envFileRef} type="file" accept=".hdr,.exr,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleEnvFileUpload} />
        </div>

        <div className="mt-2 flex gap-1">
          <input type="text" value={customEnvUrl} onChange={(e) => setCustomEnvUrl(e.target.value)} placeholder="Custom URL" className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          <button onClick={handleCustomEnvUrlSubmit} disabled={!customEnvUrl.trim()} className="px-2 py-1.5 text-xs bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 disabled:opacity-50">Apply</button>
        </div>
        {envPreviewUrl && (
          <button onClick={() => { setEnvPreviewUrl(''); dispatch({ type: 'SET_ENVIRONMENT_IMAGE', payload: '' }); }} className="text-xs text-red-500 hover:text-red-700 mt-1">Clear custom</button>
        )}
      </div>

      {/* Skybox — static background behind the model */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Skybox</h3>
        <p className="text-xs text-gray-500 mb-2">Static background behind the model.</p>

        <div className="grid grid-cols-2 gap-2">
          {([
            { type: 'none' as const, label: 'None', preview: 'bg-gray-100' },
            { type: 'day' as const, label: 'Day', preview: '' },
            { type: 'night' as const, label: 'Night', preview: '' },
            { type: 'sunset' as const, label: 'Sunset', preview: '' },
          ]).map((s) => {
            const active = state.skyboxType === s.type;
            return (
              <button
                key={s.type}
                onClick={() => dispatch({ type: 'SET_SKYBOX_TYPE', payload: s.type })}
                className={`relative rounded-lg border text-left overflow-hidden transition-all backdrop-blur-sm ${active ? 'border-blue-400/60 ring-2 ring-blue-300/50 shadow-sm' : 'border-white/30 hover:border-white/50'}`}
              >
                <div className="h-12 rounded-t overflow-hidden">
                  {s.type === 'none' && (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300" />
                    </div>
                  )}
                  {s.type === 'day' && (
                    <div className="w-full h-full" style={{ background: 'linear-gradient(180deg, #2563eb 0%, #60a5fa 30%, #93c5fd 50%, #bfdbfe 65%, #e0f2fe 80%, #f0f9ff 100%)' }} />
                  )}
                  {s.type === 'night' && (
                    <div className="w-full h-full" style={{ background: 'linear-gradient(180deg, #020617 0%, #0f172a 25%, #1e293b 50%, #1a1f3a 70%, #0f1322 100%)' }} />
                  )}
                  {s.type === 'sunset' && (
                    <div className="w-full h-full" style={{ background: 'linear-gradient(180deg, #1e1b4b 0%, #4c1d95 15%, #9333ea 28%, #e879f9 38%, #fb923c 50%, #fbbf24 60%, #fde68a 72%, #fef3c7 100%)' }} />
                  )}
                </div>
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-700">{s.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lighting adjustments */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Lighting Adjustments</h3>
        <div className="space-y-3">
          <div>
            <label className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Exposure</span><span className="font-mono">{state.exposure.toFixed(2)}</span>
            </label>
            <input type="range" min="0" max="3" step="0.05" value={state.exposure} onChange={(e) => dispatch({ type: 'SET_EXPOSURE', payload: parseFloat(e.target.value) })} className="w-full accent-blue-600" />
          </div>
          <div>
            <label className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Shadow Intensity</span><span className="font-mono">{state.shadowIntensity.toFixed(2)}</span>
            </label>
            <input type="range" min="0" max="3" step="0.05" value={state.shadowIntensity} onChange={(e) => dispatch({ type: 'SET_SHADOW_INTENSITY', payload: parseFloat(e.target.value) })} className="w-full accent-blue-600" />
          </div>
          <div>
            <label className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Shadow Softness</span><span className="font-mono">{state.shadowSoftness.toFixed(2)}</span>
            </label>
            <input type="range" min="0" max="3" step="0.05" value={state.shadowSoftness} onChange={(e) => dispatch({ type: 'SET_SHADOW_SOFTNESS', payload: parseFloat(e.target.value) })} className="w-full accent-blue-600" />
          </div>
          <button onClick={() => { dispatch({ type: 'SET_EXPOSURE', payload: 1 }); dispatch({ type: 'SET_SHADOW_INTENSITY', payload: 1 }); dispatch({ type: 'SET_SHADOW_SOFTNESS', payload: 1 }); }} className="w-full mt-1 px-2 py-1.5 text-xs text-gray-600 hover:text-gray-800 border border-white/40 rounded-lg hover:bg-white/50 backdrop-blur-sm">Reset Lighting</button>
        </div>
      </div>
    </div>
  );
}
