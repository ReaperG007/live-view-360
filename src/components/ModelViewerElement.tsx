import { createElement, forwardRef } from 'react';

interface ModelViewerProps {
  src?: string;
  alt?: string;
  'camera-controls'?: boolean;
  'auto-rotate'?: boolean;
  'auto-rotate-delay'?: number;
  'disable-zoom'?: boolean;
  'environment-image'?: string;
  'skybox-image'?: string;
  exposure?: number;
  'shadow-intensity'?: number;
  'shadow-softness'?: number;
  'camera-orbit'?: string;
  'camera-target'?: string;
  'field-of-view'?: string;
  'animation-name'?: string;
  autoplay?: boolean;
  'animation-crossfade-duration'?: number;
  'variant-name'?: string;
  'interaction-prompt'?: string;
  'interaction-prompt-threshold'?: number;
  'interaction-prompt-style'?: string;
  scale?: string;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
  onLoad?: (e: Event) => void;
  onCameraChange?: (e: CustomEvent) => void;
}

const ModelViewerElement = forwardRef<HTMLElement, ModelViewerProps>((props, ref) => {
  const { children, ...rest } = props;
  return createElement('model-viewer', { ...rest, ref }, children);
});

ModelViewerElement.displayName = 'ModelViewerElement';

export default ModelViewerElement;
