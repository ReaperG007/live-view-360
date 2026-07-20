import { useState } from 'react';
import { useEditor } from '../../store/editor-store';
import type { RGBA } from '../../model-viewer';

function stringToRgba(hex: string): RGBA {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b, 1];
}

function rgbaToHex(rgba: RGBA): string {
  const r = Math.round(rgba[0] * 255)
    .toString(16)
    .padStart(2, '0');
  const g = Math.round(rgba[1] * 255)
    .toString(16)
    .padStart(2, '0');
  const b = Math.round(rgba[2] * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${r}${g}${b}`;
}

export default function MaterialsPanel() {
  const { state, dispatch } = useEditor();
  const [selectedMaterialIndex, setSelectedMaterialIndex] = useState<number>(0);

  const materials = state.materials;
  const selectedMaterial = materials[selectedMaterialIndex];

  if (!state.modelLoaded || materials.length === 0) {
    return (
      <div className="p-4">
        <div className="text-center text-gray-400 py-8">
          <svg className="w-10 h-10 mx-auto mb-2 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          <p className="text-sm">Load a model with materials to edit them.</p>
        </div>
      </div>
    );
  }

  const pbr = selectedMaterial?.pbrMetallicRoughness;

  const handleBaseColorChange = (hex: string) => {
    if (!pbr) return;
    const rgba = stringToRgba(hex);
    const viewer = document.querySelector('model-viewer') as unknown as {
      model?: { materials?: Array<{ pbrMetallicRoughness: { setBaseColorFactor: (rgba: RGBA) => void } }> };
    } | null;
    viewer?.model?.materials?.[selectedMaterialIndex]?.pbrMetallicRoughness.setBaseColorFactor(rgba);
    // Force a dispatch to trigger re-render
    dispatch({ type: 'SET_MATERIALS', payload: [...state.materials] });
  };

  const handleMetallicChange = (value: number) => {
    if (!pbr) return;
    const viewer = document.querySelector('model-viewer') as unknown as {
      model?: { materials?: Array<{ pbrMetallicRoughness: { setMetallicFactor: (v: number) => void } }> };
    } | null;
    viewer?.model?.materials?.[selectedMaterialIndex]?.pbrMetallicRoughness.setMetallicFactor(value);
    dispatch({ type: 'SET_MATERIALS', payload: [...state.materials] });
  };

  const handleRoughnessChange = (value: number) => {
    if (!pbr) return;
    const viewer = document.querySelector('model-viewer') as unknown as {
      model?: { materials?: Array<{ pbrMetallicRoughness: { setRoughnessFactor: (v: number) => void } }> };
    } | null;
    viewer?.model?.materials?.[selectedMaterialIndex]?.pbrMetallicRoughness.setRoughnessFactor(value);
    dispatch({ type: 'SET_MATERIALS', payload: [...state.materials] });
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Materials</h3>
        <select
          value={selectedMaterialIndex}
          onChange={(e) => setSelectedMaterialIndex(parseInt(e.target.value))}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
        >
          {materials.map((mat, i) => (
            <option key={i} value={i}>
              {mat.name || `Material ${i}`}
            </option>
          ))}
        </select>
      </div>

      {selectedMaterial && pbr && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">
              Base Color: {rgbaToHex(pbr.baseColorFactor)}
            </label>
            <input
              type="color"
              value={rgbaToHex(pbr.baseColorFactor)}
              onChange={(e) => handleBaseColorChange(e.target.value)}
              className="w-full h-10 rounded border border-gray-300 cursor-pointer"
            />
          </div>

          <div>
            <label className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Metallic</span>
              <span>{pbr.metallicFactor.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={pbr.metallicFactor}
              onChange={(e) => handleMetallicChange(parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <div>
            <label className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Roughness</span>
              <span>{pbr.roughnessFactor.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={pbr.roughnessFactor}
              onChange={(e) => handleRoughnessChange(parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-1 block">
              Emissive Color: {selectedMaterial.emissiveFactor ? rgbaToHex([...selectedMaterial.emissiveFactor, 1] as RGBA) : '#000000'}
            </label>
            <input
              type="color"
              value={
                selectedMaterial.emissiveFactor
                  ? rgbaToHex([...selectedMaterial.emissiveFactor, 1] as RGBA)
                  : '#000000'
              }
              onChange={(e) => {
                const rgba: RGBA = [...stringToRgba(e.target.value).slice(0, 3), 1] as RGBA;
                const viewer = document.querySelector('model-viewer') as unknown as {
                  model?: { materials?: Array<{ setEmissiveFactor: (rgb: [number, number, number]) => void }> };
                } | null;
                viewer?.model?.materials?.[selectedMaterialIndex]?.setEmissiveFactor([
                  rgba[0],
                  rgba[1],
                  rgba[2],
                ]);
                dispatch({ type: 'SET_MATERIALS', payload: [...state.materials] });
              }}
              className="w-full h-10 rounded border border-gray-300 cursor-pointer"
            />
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 pt-3">
        <p className="text-xs text-gray-400">
          Material changes are applied directly to the model. Changes are not persisted unless you export.
        </p>
      </div>
    </div>
  );
}
