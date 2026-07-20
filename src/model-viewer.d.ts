export interface ModelViewerElementAttributes {
  src?: string;
  'ios-src'?: string;
  alt?: string;
  poster?: string;
  'seamless-poster'?: boolean;
  loading?: 'eager' | 'lazy' | 'auto';
  reveal?: 'auto' | 'interaction' | 'manual';
  'with-credentials'?: boolean;
  'environment-image'?: string;
  'skybox-image'?: string;
  'camera-controls'?: boolean;
  'disable-zoom'?: boolean;
  'disable-pan'?: boolean;
  'disable-tap'?: boolean;
  'auto-rotate'?: boolean;
  'auto-rotate-delay'?: number | string;
  ar?: boolean;
  autoplay?: boolean;
  'shadow-intensity'?: number | string;
  'shadow-softness'?: number | string;
  exposure?: number | string;
  'camera-orbit'?: string;
  'camera-target'?: string;
  'field-of-view'?: string;
  'interaction-prompt'?: string;
  'interaction-prompt-threshold'?: string;
  'interaction-prompt-style'?: string;
  'animation-name'?: string;
  'animation-crossfade-duration'?: string;
  'variant-name'?: string;
  'min-camera-orbit'?: string;
  'max-camera-orbit'?: string;
  'min-field-of-view'?: string;
  'max-field-of-view'?: string;
  'ar-placement'?: string;
  'ar-scale'?: string;
  'ar-modes'?: string;
  orientation?: string;
  scale?: string;
  'touch-action'?: string;
}

export interface ModelViewerInstance extends HTMLElement {
  src: string;
  alt: string;
  poster: string;
  'camera-controls': boolean;
  'auto-rotate': boolean;
  'auto-rotate-delay': number;
  'disable-zoom': boolean;
  'environment-image': string;
  'skybox-image': string;
  exposure: number;
  'shadow-intensity': number;
  'shadow-softness': number;
  'camera-orbit': string;
  'camera-target': string;
  'field-of-view': string;
  'animation-name': string;
  autoplay: boolean;
  'animation-crossfade-duration': number;
  'variant-name': string;

  readonly loaded: boolean;
  readonly modelIsVisible: boolean;
  readonly model: Model;
  readonly availableVariants: string[];
  readonly availableAnimations: string[];

  scale: string;
  orientation: string;

  dismissPoster(): void;
  showPoster(): void;
  getDimensions(): { x: number; y: number; z: number; toString(): string };
  exportScene(): Promise<Blob>;
  toDataURL(type?: string, encoderOptions?: number): string;
  toBlob(options?: { mimeType?: string; qualityArgument?: number; idealAspect?: boolean }): Promise<Blob>;
  updateFraming(): void;
  resetTurntableRotation(theta?: number): void;
  getCameraOrbit(): { phi: number; radius: number; theta: number; toString(): string };
  getCameraTarget(): { x: number; y: number; z: number; toString(): string };
  getFieldOfView(): number;
  jumpCameraToGoal(): void;

  /**
   * Returns the world position and normal at a point on the canvas.
   * Useful for click-to-place hotspots.
   */
  positionAndNormalFromPoint(x: number, y: number): { position: string; normal: string } | null;
}

export interface Model {
  readonly materials: Material[];
  getMaterialByName(name: string): Material | null;
}

export interface Material {
  name: string;
  readonly index: number;
  readonly emissiveFactor: RGB;
  readonly pbrMetallicRoughness: PBRMetallicRoughness;
  setEmissiveFactor(rgb: RGB): void;
  setAlphaCutoff(cutoff: number): void;
  getAlphaCutoff(): number;
  setDoubleSided(doubleSided: boolean): void;
  getDoubleSided(): boolean;
  setAlphaMode(alphaMode: AlphaMode): void;
  getAlphaMode(): AlphaMode;
}

export interface PBRMetallicRoughness {
  readonly baseColorFactor: RGBA;
  readonly metallicFactor: number;
  readonly roughnessFactor: number;
  readonly baseColorTexture: Record<string, unknown> | null;
  readonly metallicRoughnessTexture: Record<string, unknown> | null;
  setBaseColorFactor(rgba: RGBA): void;
  setMetallicFactor(value: number): void;
  setRoughnessFactor(value: number): void;
}

export type RGBA = [number, number, number, number];
export type RGB = [number, number, number];
export type AlphaMode = 'OPAQUE' | 'MASK' | 'BLEND';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & ModelViewerElementAttributes & {
          onLoad?: (e: Event) => void;
          onCameraChange?: (e: CustomEvent) => void;
        },
        HTMLElement
      >;
    }
  }
}
