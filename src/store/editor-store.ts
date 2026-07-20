import { createContext, useContext } from 'react';
import type { ModelViewerInstance, Material } from '../model-viewer';


export interface EditorState {
  // Model
  modelSrc: string;
  modelAlt: string;
  modelLoaded: boolean;
  /** Uniform model scale multiplier (model-viewer `scale` attribute). */
  modelScale: number;

  // Camera
  cameraOrbit: string;
  cameraTarget: string;
  fieldOfView: string;
  autoRotate: boolean;
  autoRotateDelay: number;
  cameraControls: boolean;
  disableZoom: boolean;

  // Scene / Environment
  environmentImage: string;
  skyboxImage: string;
  exposure: number;
  shadowIntensity: number;
  shadowSoftness: number;
  backgroundColor: string;

  // Animation
  animationName: string;
  autoplay: boolean;
  animationCrossfadeDuration: number;

  // Variant
  variantName: string;

  // Limits
  'min-camera-orbit': string;
  'max-camera-orbit': string;
  'min-field-of-view': string;
  'max-field-of-view': string;

  // Interaction
  interactionPrompt: string;
  interactionPromptThreshold: number;
  interactionPromptStyle: string;

  // Materials (runtime - updated from model)
  materials: Material[];

  // Hotspots
  hotspots: Hotspot[];
  activeHotspotId: string;

  // UI
  activeTab: EditorTab;
  showExportPanel: boolean;
  viewLayout: ViewLayout;
  showWireframe: boolean;

  // Static skybox background behind the model
  skyboxType: 'none' | 'day' | 'night' | 'sunset';

  // Hotspot creation by clicking the model
  pickingHotspot: boolean;
}

export type ViewLayout = 'single' | 'split' | 'quad';

export interface ViewWindow {
  id: string;
  label: string;
  orbit: string;
  target: string;
  fov: string;
  locked: boolean;
}

export interface Hotspot {
  id: string;
  name: string;
  position: string;
  normal: string;
  title: string;
  description: string;
  /** Camera pose to jump to when the hotspot is clicked. Empty = keep current. */
  focusOrbit: string;
  /** Camera target on click. Empty = look at the hotspot position. */
  focusTarget: string;
  /** Field of view on click. Empty = keep current. */
  focusFov: string;
}

export type EditorTab = 'import' | 'scene' | 'camera' | 'animation' | 'materials' | 'hotspots' | 'inspector';

type Action =
  | { type: 'SET_MODEL_SRC'; payload: string }
  | { type: 'SET_MODEL_ALT'; payload: string }
  | { type: 'SET_MODEL_LOADED'; payload: boolean }
  | { type: 'SET_MODEL_SCALE'; payload: number }
  | { type: 'SET_CAMERA_ORBIT'; payload: string }
  | { type: 'SET_CAMERA_TARGET'; payload: string }
  | { type: 'SET_FIELD_OF_VIEW'; payload: string }
  | { type: 'SET_AUTO_ROTATE'; payload: boolean }
  | { type: 'SET_AUTO_ROTATE_DELAY'; payload: number }
  | { type: 'SET_CAMERA_CONTROLS'; payload: boolean }
  | { type: 'SET_DISABLE_ZOOM'; payload: boolean }
  | { type: 'SET_ENVIRONMENT_IMAGE'; payload: string }
  | { type: 'SET_SKYBOX_IMAGE'; payload: string }
  | { type: 'SET_EXPOSURE'; payload: number }
  | { type: 'SET_SHADOW_INTENSITY'; payload: number }
  | { type: 'SET_SHADOW_SOFTNESS'; payload: number }
  | { type: 'SET_BACKGROUND_COLOR'; payload: string }
  | { type: 'SET_ANIMATION_NAME'; payload: string }
  | { type: 'SET_AUTOPLAY'; payload: boolean }
  | { type: 'SET_ANIMATION_CROSSFADE_DURATION'; payload: number }
  | { type: 'SET_VARIANT_NAME'; payload: string }
  | { type: 'SET_MIN_CAMERA_ORBIT'; payload: string }
  | { type: 'SET_MAX_CAMERA_ORBIT'; payload: string }
  | { type: 'SET_MIN_FIELD_OF_VIEW'; payload: string }
  | { type: 'SET_MAX_FIELD_OF_VIEW'; payload: string }
  | { type: 'SET_INTERACTION_PROMPT'; payload: string }
  | { type: 'SET_INTERACTION_PROMPT_THRESHOLD'; payload: number }
  | { type: 'SET_INTERACTION_PROMPT_STYLE'; payload: string }
  | { type: 'SET_MATERIALS'; payload: Material[] }
  | { type: 'UPDATE_MATERIAL'; payload: { index: number; updates: Partial<Material> } }
  | { type: 'ADD_HOTSPOT'; payload: Hotspot }
  | { type: 'SET_ACTIVE_HOTSPOT'; payload: string }
  | { type: 'REMOVE_HOTSPOT'; payload: string }
  | { type: 'UPDATE_HOTSPOT'; payload: { id: string; updates: Partial<Hotspot> } }
  | { type: 'SET_ACTIVE_TAB'; payload: EditorTab }
  | { type: 'SET_SHOW_EXPORT_PANEL'; payload: boolean }
  | { type: 'SET_VIEW_LAYOUT'; payload: ViewLayout }
  | { type: 'SET_SHOW_WIREFRAME'; payload: boolean }
  | { type: 'SET_SKYBOX_TYPE'; payload: 'none' | 'day' | 'night' | 'sunset' }
  | { type: 'SET_PICKING_HOTSPOT'; payload: boolean }
  | { type: 'LOAD_CONFIG'; payload: Partial<EditorState> };

export const initialState: EditorState = {
  modelSrc: '',
  modelAlt: 'A 3D model',
  modelLoaded: false,
  modelScale: 1,
  cameraOrbit: '0deg 75deg auto',
  cameraTarget: 'auto auto auto',
  fieldOfView: '45deg',
  autoRotate: true,
  autoRotateDelay: 0,
  cameraControls: true,
  disableZoom: false,
  environmentImage: '',
  skyboxImage: '',
  exposure: 1,
  shadowIntensity: 1,
  shadowSoftness: 1,
  backgroundColor: '#ffffff',
  animationName: '',
  autoplay: false,
  animationCrossfadeDuration: 300,
  variantName: '',
  'min-camera-orbit': '',
  'max-camera-orbit': '',
  'min-field-of-view': '',
  'max-field-of-view': '',
  interactionPrompt: 'auto',
  interactionPromptThreshold: 3000,
  interactionPromptStyle: 'basic',
  materials: [],
  hotspots: [],
  activeHotspotId: '',
  activeTab: 'import',
  showExportPanel: false,
  viewLayout: 'single',
  showWireframe: false,
  skyboxType: 'none',
  pickingHotspot: false,
};

export function editorReducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'SET_MODEL_SRC':
      return { ...state, modelSrc: action.payload };
    case 'SET_MODEL_ALT':
      return { ...state, modelAlt: action.payload };
    case 'SET_MODEL_LOADED':
      return { ...state, modelLoaded: action.payload };
    case 'SET_MODEL_SCALE':
      return { ...state, modelScale: action.payload };
    case 'SET_CAMERA_ORBIT':
      return { ...state, cameraOrbit: action.payload };
    case 'SET_CAMERA_TARGET':
      return { ...state, cameraTarget: action.payload };
    case 'SET_FIELD_OF_VIEW':
      return { ...state, fieldOfView: action.payload };
    case 'SET_AUTO_ROTATE':
      return { ...state, autoRotate: action.payload };
    case 'SET_AUTO_ROTATE_DELAY':
      return { ...state, autoRotateDelay: action.payload };
    case 'SET_CAMERA_CONTROLS':
      return { ...state, cameraControls: action.payload };
    case 'SET_DISABLE_ZOOM':
      return { ...state, disableZoom: action.payload };
    case 'SET_ENVIRONMENT_IMAGE':
      return { ...state, environmentImage: action.payload };
    case 'SET_SKYBOX_IMAGE':
      return { ...state, skyboxImage: action.payload };
    case 'SET_EXPOSURE':
      return { ...state, exposure: action.payload };
    case 'SET_SHADOW_INTENSITY':
      return { ...state, shadowIntensity: action.payload };
    case 'SET_SHADOW_SOFTNESS':
      return { ...state, shadowSoftness: action.payload };
    case 'SET_BACKGROUND_COLOR':
      return { ...state, backgroundColor: action.payload };
    case 'SET_ANIMATION_NAME':
      return { ...state, animationName: action.payload };
    case 'SET_AUTOPLAY':
      return { ...state, autoplay: action.payload };
    case 'SET_ANIMATION_CROSSFADE_DURATION':
      return { ...state, animationCrossfadeDuration: action.payload };
    case 'SET_VARIANT_NAME':
      return { ...state, variantName: action.payload };
    case 'SET_MIN_CAMERA_ORBIT':
      return { ...state, 'min-camera-orbit': action.payload };
    case 'SET_MAX_CAMERA_ORBIT':
      return { ...state, 'max-camera-orbit': action.payload };
    case 'SET_MIN_FIELD_OF_VIEW':
      return { ...state, 'min-field-of-view': action.payload };
    case 'SET_MAX_FIELD_OF_VIEW':
      return { ...state, 'max-field-of-view': action.payload };
    case 'SET_INTERACTION_PROMPT':
      return { ...state, interactionPrompt: action.payload };
    case 'SET_INTERACTION_PROMPT_THRESHOLD':
      return { ...state, interactionPromptThreshold: action.payload };
    case 'SET_INTERACTION_PROMPT_STYLE':
      return { ...state, interactionPromptStyle: action.payload };
    case 'SET_MATERIALS':
      return { ...state, materials: action.payload };
    case 'UPDATE_MATERIAL':
      return {
        ...state,
        materials: state.materials.map((m, i) =>
          i === action.payload.index ? { ...m, ...action.payload.updates } : m
        ),
      };
    case 'ADD_HOTSPOT':
      return { ...state, hotspots: [...state.hotspots, action.payload] };
    case 'SET_ACTIVE_HOTSPOT':
      return { ...state, activeHotspotId: action.payload };
    case 'REMOVE_HOTSPOT':
      return {
        ...state,
        hotspots: state.hotspots.filter((h) => h.id !== action.payload),
      };
    case 'UPDATE_HOTSPOT':
      return {
        ...state,
        hotspots: state.hotspots.map((h) =>
          h.id === action.payload.id ? { ...h, ...action.payload.updates } : h
        ),
      };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_SHOW_EXPORT_PANEL':
      return { ...state, showExportPanel: action.payload };
    case 'SET_VIEW_LAYOUT':
      return { ...state, viewLayout: action.payload };
    case 'SET_SHOW_WIREFRAME':
      return { ...state, showWireframe: action.payload };
    case 'SET_SKYBOX_TYPE':
      return { ...state, skyboxType: action.payload };
    case 'SET_PICKING_HOTSPOT':
      return { ...state, pickingHotspot: action.payload };
    case 'LOAD_CONFIG':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

export interface EditorContextType {
  state: EditorState;
  dispatch: React.Dispatch<Action>;
  modelViewerRef: React.RefObject<ModelViewerInstance | null>;
}

// We use a placeholder since we can't use React.createContext with null default properly
export const EditorContext = createContext<EditorContextType | null>(null);

export function useEditor(): EditorContextType {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}


