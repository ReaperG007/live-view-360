import { useCallback, useEffect, useRef } from 'react';
import { useEditor } from '../store/editor-store';
import ModelViewerElement from './ModelViewerElement';
import SceneGround from './SceneGround';
import FpvController from './FpvController';
import WalkthroughPlayer from './WalkthroughPlayer';
import WalkScrubController from './WalkScrubController';
import { focusCameraOnHotspot } from './panels/HotspotPanel';
import type { ModelViewerInstance } from '../model-viewer';

export default function ModelViewer() {
  const { state, dispatch } = useEditor();
  const viewerRef = useRef<HTMLElement | null>(null);
  const loadHandlerRef = useRef<((e: Event) => void) | null>(null);
  const homePoseRef = useRef<{ orbit: string; target: string; fov: string } | null>(null);

  const handleModelLoad = useCallback(() => {
    dispatch({ type: 'SET_MODEL_LOADED', payload: true });
    const viewer = viewerRef.current as ModelViewerInstance | null;
    if (!viewer) return;

    // Snapshot the initial camera framing as "home" for Reset View
    try {
      homePoseRef.current = {
        orbit: viewer.getCameraOrbit().toString(),
        target: viewer.getCameraTarget().toString(),
        fov: `${viewer.getFieldOfView().toFixed(1)}deg`,
      };
    } catch {
      homePoseRef.current = null;
    }

    // Collect available animations
    if (viewer.availableAnimations?.length > 0) {
      dispatch({ type: 'SET_ANIMATION_NAME', payload: viewer.availableAnimations[0] || '' });
    }

    // Collect materials
    if (viewer.model?.materials) {
      const materials = [...viewer.model.materials];
      dispatch({ type: 'SET_MATERIALS', payload: materials });
    }
  }, [dispatch]);

  const handleHotspotClick = useCallback(
    (hotspotId: string) => {
      const hotspot = state.hotspots.find((h) => h.id === hotspotId);
      if (!hotspot) return;
      // Toggle the info card; clicking the open one just closes it
      const nextActive = state.activeHotspotId === hotspotId ? null : hotspotId;
      dispatch({ type: 'SET_ACTIVE_HOTSPOT', payload: nextActive ?? '' });
      // Fly camera to the saved focus pose
      if (nextActive) focusCameraOnHotspot(hotspot);
    },
    [state.hotspots, state.activeHotspotId, dispatch]
  );

  const handleResetView = useCallback(() => {
    const viewer = viewerRef.current as unknown as {
      cameraTarget?: string;
      cameraOrbit?: string;
      fieldOfView?: string;
    } | null;
    if (!viewer) return;
    const home = homePoseRef.current;
    try {
      if (home) {
        viewer.cameraTarget = home.target;
        viewer.cameraOrbit = home.orbit;
        viewer.fieldOfView = home.fov;
      } else {
        viewer.cameraTarget = 'auto auto auto';
        viewer.fieldOfView = 'auto';
      }
      dispatch({ type: 'SET_ACTIVE_HOTSPOT', payload: '' });
    } catch {
      // camera not ready
    }
  }, [dispatch]);

  // Click anywhere on the model to create a hotspot when in "pick" mode
  const handleCameraChange = useCallback(() => {
    const viewer = viewerRef.current as ModelViewerInstance | null;
    if (!viewer) return;
    try {
      const orbit = viewer.getCameraOrbit();
      if (orbit) {
        dispatch({ type: 'SET_CAMERA_ORBIT', payload: orbit.toString() });
      }
    } catch {
      // Camera not yet available
    }
  }, [dispatch]);

  // Apply scale imperatively on the model-viewer element and re-frame
  // the camera after the render catches up.
  useEffect(() => {
    const viewer = viewerRef.current as ModelViewerInstance | null;
    if (!viewer) return;
    const s = `${state.modelScale} ${state.modelScale} ${state.modelScale}`;
    try {
      // Set the property directly so model-viewer picks it up immediately
      (viewer as any).scale = s;
      // Also set the attribute for React reconciliation
      viewer.setAttribute('scale', s);
      // Defer updateFraming so the renderer has time to apply the new scale
      requestAnimationFrame(() => {
        try {
          viewer.updateFraming();
        } catch {
          // not ready
        }
      });
    } catch {
      // viewer not ready
    }
  }, [state.modelScale]);

  // ── FPV camera mode ──────────────────────────────────────────
  // When FPV mode is active, lock the camera at human eye level
  // (~1.7 m) and restrict orbit to horizontal rotation + look-up/down.
  const fpvOrbitRef = useRef(state.cameraOrbit);
  const fpvTargetRef = useRef(state.cameraTarget);
  const fpvFovRef = useRef(state.fieldOfView);

  useEffect(() => {
    const viewer = viewerRef.current as ModelViewerInstance | null;
    if (!viewer || !state.modelLoaded) return;

    if (state.cameraMode === 'fpv') {
      // Save current orbit settings so we can restore them
      try {
        fpvOrbitRef.current = viewer.getCameraOrbit().toString();
        fpvTargetRef.current = viewer.getCameraTarget().toString();
        fpvFovRef.current = `${viewer.getFieldOfView().toFixed(1)}deg`;
      } catch {
        // ignore
      }

      // Lock to eye-level orbit: phi=85deg (5 deg above horizontal),
      // keep the current radius so the user stays at the same distance.
      const v = viewer as any;
      try {
        const cur = viewer.getCameraOrbit();
        v.cameraOrbit = `0deg 85deg ${cur.radius}`;
      } catch {
        v.cameraOrbit = '0deg 85deg auto';
      }
      v.cameraTarget = '0 1 0';
      v.fieldOfView = '90deg';

      // Disable pan and zoom in FPV — only rotation allowed
      viewer.setAttribute('disable-pan', '');
      viewer.setAttribute('disable-zoom', '');
    } else {
      // Restore orbit mode settings
      const v = viewer as any;
      v.cameraOrbit = fpvOrbitRef.current || state.cameraOrbit;
      v.cameraTarget = fpvTargetRef.current || state.cameraTarget;
      v.fieldOfView = fpvFovRef.current || state.fieldOfView;
      viewer.removeAttribute('disable-pan');
      // Respect the user's zoom preference
      if (!state.disableZoom) viewer.removeAttribute('disable-zoom');
    }
  }, [state.cameraMode, state.modelLoaded]);

  // Set up the ref callback and event listeners
  const setViewerRef = useCallback(
    (el: HTMLElement | null) => {
      viewerRef.current = el;

      if (el) {
        // Remove old listener if it exists
        if (loadHandlerRef.current) {
          el.removeEventListener('load', loadHandlerRef.current);
        }
        loadHandlerRef.current = handleModelLoad;
        el.addEventListener('load', loadHandlerRef.current);

        // Click-to-create hotspot (picking mode)
        el.addEventListener('click', (ev: MouseEvent) => {
          if (!state.pickingHotspot) return;
          const viewer = el as unknown as ModelViewerInstance;
          if (!viewer.positionAndNormalFromPoint) return;

          const rect = (el as HTMLElement).getBoundingClientRect();
          const x = ((ev.clientX - rect.left) / rect.width) * (viewer.clientWidth || rect.width);
          const y = ((ev.clientY - rect.top) / rect.height) * (viewer.clientHeight || rect.height);

          const result = viewer.positionAndNormalFromPoint(x, y);
          if (!result) {
            dispatch({ type: 'SET_PICKING_HOTSPOT', payload: false });
            return;
          }
          const id = `hotspot-${Date.now()}`;
          dispatch({
            type: 'ADD_HOTSPOT',
            payload: {
              id,
              name: 'New Hotspot',
              position: result.position,
              normal: result.normal,
              title: 'New Hotspot',
              description: '',
              focusOrbit: '',
              focusTarget: '',
              focusFov: '',
              icon: 'pin',
              color: '#3b82f6',
              pulse: true,
            },
          });
          dispatch({ type: 'SET_ACTIVE_HOTSPOT', payload: id });
          dispatch({ type: 'SET_PICKING_HOTSPOT', payload: false });
        });

        // Also update the EditorContext's ref
        const ctx = { current: el as ModelViewerInstance };
        Object.assign(ctx, { current: el as ModelViewerInstance });
      }
    },
    [handleModelLoad, state.pickingHotspot, dispatch]
  );

  return (
    <div className="relative w-full h-full bg-gray-100 overflow-hidden">
      {!state.modelSrc && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center max-w-md p-8">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No Model Loaded
            </h3>
            <p className="text-gray-500 text-sm">
              Import a GLB or glTF model using the Import panel to get started.
            </p>
          </div>
        </div>
      )}

      {state.modelSrc && (
        <div className="relative w-full h-full">
          {/* Background color (skybox panorama is handled by model-viewer) */}
          <SceneGround backgroundColor={state.backgroundColor} />

          <ModelViewerElement
            ref={setViewerRef}
            src={state.modelSrc}
            alt={state.modelAlt}
            camera-controls={state.cameraControls || undefined}
            auto-rotate={state.autoRotate || undefined}
            auto-rotate-delay={state.autoRotateDelay}
            disable-zoom={state.disableZoom || undefined}
            environment-image={state.environmentImage || undefined}
            skybox-image={state.skyboxImage || undefined}
            exposure={state.exposure}
            shadow-intensity={state.shadowIntensity}
            shadow-softness={state.shadowSoftness}
            camera-orbit={state.cameraOrbit}
            camera-target={state.cameraTarget}
            field-of-view={state.fieldOfView}
            animation-name={state.animationName || undefined}
            autoplay={state.autoplay || undefined}
            animation-crossfade-duration={state.animationCrossfadeDuration}
            variant-name={state.variantName || undefined}
            scale={`${state.modelScale} ${state.modelScale} ${state.modelScale}`}
            interaction-prompt={state.interactionPrompt}
            interaction-prompt-threshold={state.interactionPromptThreshold}
            interaction-prompt-style={state.interactionPromptStyle}
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent',
            display: 'block',
            position: 'relative',
            zIndex: 2,
          }}
          onCameraChange={handleCameraChange}
        >
            {state.hotspots.map((hotspot, i) => {
              const col = hotspot.color || '#3b82f6';
              const pul = hotspot.pulse ?? true;
              return (
                <button
                  key={hotspot.id}
                  slot={`hotspot-${hotspot.id}-${i}`}
                  data-position={hotspot.position}
                  data-normal={hotspot.normal}
                  className={`hotspot-btn ${state.activeHotspotId === hotspot.id ? 'active' : ''}`}
                  onClick={() => handleHotspotClick(hotspot.id)}
                  style={{ ['--hs-color' as string]: col } as React.CSSProperties}
                  data-hotspot-color={col}
                  data-hotspot-icon={hotspot.icon || 'pin'}
                  data-hotspot-pulse={pul ? '1' : '0'}
                >
                  <span
                    className="hotspot-dot"
                    style={{
                      background: col,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid white',
                      boxShadow: pul ? `0 0 0 6px ${col}33` : '0 2px 8px rgba(0,0,0,.25)',
                      color: 'white',
                    }}
                  >
                    •
                  </span>
                  <div className="hotspot-label">
                    <strong>{hotspot.title}</strong>
                    {hotspot.description && <p>{hotspot.description}</p>}
                  </div>
                </button>
              );
            })}
          </ModelViewerElement>
        </div>
      )}

      {/* FPV virtual joystick overlay */}
      {state.modelSrc && state.cameraMode === 'fpv' && <FpvController />}
      {/* Walkthrough playback */}
      <WalkthroughPlayer />

      {/* Walk scrub joystick overlay — shown when camera path exists */}
      {state.modelSrc && state.cameraPath.length >= 2 && !state.walkthroughPlaying && (
        <WalkScrubController />
      )}

      {/* Reset View floating button — appears when a model is active */}
      {state.modelSrc && (
        <button
          onClick={handleResetView}
          className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 px-3 py-2 bg-white/50 backdrop-blur-xl rounded-lg shadow-xl border border-white/30 text-xs font-medium text-gray-700 hover:bg-white/70 hover:text-gray-900 transition-all"
          title="Return camera to the initial view"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Reset View
        </button>
      )}
    </div>
  );
}
