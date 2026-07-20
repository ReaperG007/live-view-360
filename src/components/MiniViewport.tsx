import { useRef, useCallback } from 'react';
import ModelViewerElement from './ModelViewerElement';
import type { ModelViewerInstance } from '../model-viewer';
import { useEditor } from '../store/editor-store';
import { resolveSkyboxUrl } from '../utils/skybox';

interface MiniViewportProps {
  label: string;
  orbit: string;
  target?: string;
  fov?: string;
  interactive?: boolean;
  syncWithMain?: boolean;
  onOrbitChange?: (orbit: string) => void;
}

export default function MiniViewport({
  label,
  orbit,
  target,
  fov,
  interactive = false,
  syncWithMain = false,
  onOrbitChange,
}: MiniViewportProps) {
  const { state } = useEditor();
  const viewerRef = useRef<HTMLElement | null>(null);

  const setRef = useCallback(
    (el: HTMLElement | null) => {
      viewerRef.current = el;
    },
    []
  );

  if (!state.modelSrc) return null;

  return (
    <div className="relative w-full h-full bg-gray-900 overflow-hidden group">
      <ModelViewerElement
        ref={setRef}
        src={state.modelSrc}
        alt={`${label} view`}
        camera-controls={interactive || undefined}
        auto-rotate={state.autoRotate && syncWithMain ? true : undefined}
        environment-image={state.environmentImage || undefined}
        skybox-image={resolveSkyboxUrl(state.skyboxImage) || undefined}
        exposure={state.exposure}
        shadow-intensity={state.shadowIntensity}
        shadow-softness={state.shadowSoftness}
        camera-orbit={orbit}
        camera-target={target || state.cameraTarget}
        field-of-view={fov || state.fieldOfView}
        animation-name={state.animationName || undefined}
        autoplay={state.autoplay || undefined}
        animation-crossfade-duration={state.animationCrossfadeDuration}
        variant-name={state.variantName || undefined}
        scale={`${state.modelScale} ${state.modelScale} ${state.modelScale}`}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: state.backgroundColor,
          display: 'block',
        }}
        onCameraChange={() => {
          if (onOrbitChange && viewerRef.current) {
            const viewer = viewerRef.current as unknown as ModelViewerInstance;
            if (viewer.getCameraOrbit) {
              try {
                onOrbitChange(viewer.getCameraOrbit().toString());
              } catch {
                // ignore
              }
            }
          }
        }}
      />

      {/* View label */}
      <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md text-white text-xs px-2 py-1 rounded font-medium">
        {label}
      </div>

      {/* Corner grid indicator */}
      {!interactive && (
        <div className="absolute bottom-2 right-2 w-6 h-6 border border-white/30 rounded-sm pointer-events-none" />
      )}
    </div>
  );
}
