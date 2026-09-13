import { useRef, useState } from 'react';
import { useEditor } from '../../store/editor-store';

// ── Realistic environment + skybox image presets ──────────────
// Environment images: HDR files for physically-based image lighting (IBL)
// Skybox images: equirectangular panoramas for the visible background
//
// HDR sources from modelviewer.dev shared assets (CC0)
// Skybox panoramas from Poly Haven (CC0)

const ENV_NONE = '';
const ENV_NEUTRAL = 'neutral';
const ENV_SPRUIT =
  'https://modelviewer.dev/shared-assets/environments/spruit_sunrise_1k_HDR.hdr';
const ENV_WHIPPLE =
  'https://modelviewer.dev/shared-assets/environments/whipple_creek_regional_park_04_1k.hdr';
const ENV_PILLARS =
  'https://modelviewer.dev/shared-assets/environments/pillars_1k.hdr';
const ENV_PIAZZA =
  'https://modelviewer.dev/shared-assets/environments/piazza.hdr';
const ENV_SUNSET =
  'https://modelviewer.dev/shared-assets/environments/kiara_1_dawn_1k.hdr';

const SKY_STUDIO =
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr';
const SKY_SUNRISE =
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/spruit_sunrise_1k.hdr';
const SKY_PARK =
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/whipple_creek_regional_park_04_1k.hdr';
const SKY_FIELD =
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloofendal_43d_clear_puresky_1k.hdr';
const SKY_DUSK =
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kiara_1_dawn_1k.hdr';
const SKY_NIGHT =
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/dikhololo_night_1k.hdr';
const SKY_WINTER =
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/pillars_1k.hdr';

export interface EnvPreset {
  id: string;
  name: string;
  subtitle: string;
  env: string;   // environment-image for IBL lighting
  sky: string;   // skybox-image for visible background
  exposure: number;
  bg: string;    // fallback background color
}

export const ENVIRONMENT_PRESETS: EnvPreset[] = [
  { id: 'none', name: 'None', subtitle: 'No environment', env: ENV_NONE, sky: '', exposure: 1, bg: '#ffffff' },
  { id: 'neutral', name: 'Studio', subtitle: 'Neutral lighting', env: ENV_NEUTRAL, sky: SKY_STUDIO, exposure: 1, bg: '#e8e8e8' },
  { id: 'sunrise', name: 'Sunrise', subtitle: 'Golden hour field', env: ENV_SPRUIT, sky: SKY_SUNRISE, exposure: 1.05, bg: '#f5e6d0' },
  { id: 'park', name: 'Park', subtitle: 'Overcast woodland', env: ENV_WHIPPLE, sky: SKY_PARK, exposure: 0.95, bg: '#9aa88c' },
  { id: 'clear', name: 'Clear Sky', subtitle: 'Bright blue sky', env: ENV_PIAZZA, sky: SKY_FIELD, exposure: 1.0, bg: '#87CEEB' },
  { id: 'dusk', name: 'Dusk', subtitle: 'Twilight horizon', env: ENV_SUNSET, sky: SKY_DUSK, exposure: 1.1, bg: '#c4956e' },
  { id: 'night', name: 'Night', subtitle: 'Dark starry sky', env: ENV_PILLARS, sky: SKY_NIGHT, exposure: 0.7, bg: '#1a1e2e' },
  { id: 'winter', name: 'Winter', subtitle: 'Snowy landscape', env: ENV_PILLARS, sky: SKY_WINTER, exposure: 1.15, bg: '#d8e4ee' },
];

export const SUMMER_ENV_URL = ENV_SPRUIT;
export const RAIN_ENV_URL = ENV_WHIPPLE;
export const WINTER_ENV_URL = ENV_PILLARS;

/** Landscape preview thumbnails for environment cards */
function EnvCardPreview({ preset }: { preset: EnvPreset }) {
  // Show the skybox panorama as a thumbnail preview
  if (preset.id === 'none') {
    return (
      <div className="relative w-full aspect-[16/9] bg-gray-100 rounded-t-lg overflow-hidden flex items-center justify-center">
        <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </div>
    );
  }
  return (
    <div className="relative w-full aspect-[16/9] rounded-t-lg overflow-hidden bg-gray-200">
      <img
        src={preset.sky}
        alt={preset.name}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          // Fallback: show the background color if image fails to load
          (e.target as HTMLImageElement).style.display = 'none';
          (e.target as HTMLImageElement).parentElement!.style.background = preset.bg;
        }}
      />
    </div>
  );
}



export default function ScenePanel() {
  const { state, dispatch } = useEditor();
  const envFileRef = useRef<HTMLInputElement>(null);
  const [customEnvUrl, setCustomEnvUrl] = useState('');
  const [envPreviewUrl, setEnvPreviewUrl] = useState('');

  const defaultEnvValues = ENVIRONMENT_PRESETS.map((p) => p.env);
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

  const applyPreset = (preset: EnvPreset) => {
    dispatch({ type: 'SET_ENVIRONMENT_IMAGE', payload: preset.env });
    dispatch({ type: 'SET_SKYBOX_IMAGE', payload: preset.sky });
    dispatch({ type: 'SET_BACKGROUND_COLOR', payload: preset.bg });
    dispatch({ type: 'SET_EXPOSURE', payload: preset.exposure });
  };

  const activePresetId =
    state.environmentImage === '' && state.skyboxImage === ''
      ? 'none'
      : ENVIRONMENT_PRESETS.find(
          (p) =>
            p.env === state.environmentImage && p.sky === state.skyboxImage
        )?.id ?? null;

  const skyboxFileRef = useRef<HTMLInputElement>(null);
  const [customSkyboxUrl, setCustomSkyboxUrl] = useState('');

  const handleSkyboxFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validExts = ['.png', '.jpg', '.jpeg', '.webp', '.hdr', '.exr'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExts.includes(ext)) {
      alert('Please select an equirectangular panorama image (PNG, JPG, HDR, EXR).');
      return;
    }
    const url = URL.createObjectURL(file);
    dispatch({ type: 'SET_SKYBOX_IMAGE', payload: url });
  };

  const handleCustomSkyboxUrlSubmit = () => {
    if (!customSkyboxUrl.trim()) return;
    dispatch({ type: 'SET_SKYBOX_IMAGE', payload: customSkyboxUrl.trim() });
    setCustomSkyboxUrl('');
  };


  return (
    <div className="p-4 space-y-5">
      {/* Environment & Skybox presets (image-based) */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Environment & Skybox</h3>
        <p className="text-xs text-gray-500 mb-2">Realistic lighting and panoramic background. Click a preset to apply.</p>

        <div className="grid grid-cols-2 gap-2">
          {ENVIRONMENT_PRESETS.map((preset) => {
            const active = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`relative rounded-lg border text-left overflow-hidden transition-all backdrop-blur-sm ${active ? 'border-blue-400/60 ring-2 ring-blue-300/50 shadow-sm bg-white/50' : 'border-white/30 bg-white/30 hover:border-white/50 hover:bg-white/50 hover:shadow-sm'}`}
              >
                <EnvCardPreview preset={preset} />
                <div className="px-2 py-1.5">
                  <div className="text-xs font-semibold text-gray-800 leading-tight">{preset.name}</div>
                  <div className="text-[10px] text-gray-400 leading-tight">{preset.subtitle}</div>
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
            Upload HDR / Panorama
          </button>
          <input ref={envFileRef} type="file" accept=".hdr,.exr,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleEnvFileUpload} />
        </div>

        <div className="mt-2 flex gap-1">
          <input type="text" value={customEnvUrl} onChange={(e) => setCustomEnvUrl(e.target.value)} placeholder="Custom URL" className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          <button onClick={handleCustomEnvUrlSubmit} disabled={!customEnvUrl.trim()} className="px-2 py-1.5 text-xs bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 disabled:opacity-50">Apply</button>
        </div>
        {envPreviewUrl && (
          <button onClick={() => { setEnvPreviewUrl(''); dispatch({ type: 'SET_ENVIRONMENT_IMAGE', payload: '' }); dispatch({ type: 'SET_SKYBOX_IMAGE', payload: '' }); }} className="text-xs text-red-500 hover:text-red-700 mt-1">Clear custom</button>
        )}
      </div>

      {/* Custom Skybox Panorama */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Custom Skybox</h3>
        <p className="text-xs text-gray-500 mb-2">Upload or paste a 360×180 equirectangular panorama for the background.</p>

        <div className="flex gap-2">
          <button
            onClick={() => skyboxFileRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs bg-white/40 hover:bg-white/60 text-gray-700 rounded-lg border border-white/30 backdrop-blur-sm transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload Panorama
          </button>
          <input
            ref={skyboxFileRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.hdr,.exr"
            className="hidden"
            onChange={handleSkyboxFileUpload}
          />
        </div>

        {state.skyboxImage && (
          <div className="mt-2 p-2 bg-blue-50/60 rounded-lg border border-blue-200/50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-700 truncate font-mono max-w-[180px]">
                Custom panorama active
              </span>
              <button
                onClick={() => dispatch({ type: 'SET_SKYBOX_IMAGE', payload: '' })}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        <div className="mt-2 flex gap-1">
          <input
            type="text"
            value={customSkyboxUrl}
            onChange={(e) => setCustomSkyboxUrl(e.target.value)}
            placeholder="Panorama URL"
            className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <button
            onClick={handleCustomSkyboxUrlSubmit}
            disabled={!customSkyboxUrl.trim()}
            className="px-2 py-1.5 text-xs bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Skybox Size */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Skybox Size</h3>
        <p className="text-xs text-gray-500 mb-2">Scale the skybox to fit your model world. Smaller values bring the sky closer; larger values push it further away.</p>
        <div className="space-y-3">
          <div>
            <label className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Scale</span>
              <span className="font-mono">{state.skyboxScale.toFixed(1)}×</span>
            </label>
            <input
              type="range"
              min={0.1}
              max={5}
              step={0.1}
              value={state.skyboxScale}
              onChange={(e) => dispatch({ type: 'SET_SKYBOX_SCALE', payload: parseFloat(e.target.value) })}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>0.1× (close)</span>
              <button
                onClick={() => dispatch({ type: 'SET_SKYBOX_SCALE', payload: 1 })}
                className="text-blue-500 hover:text-blue-700"
              >
                Reset
              </button>
              <span>5.0× (far)</span>
            </div>
          </div>
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
