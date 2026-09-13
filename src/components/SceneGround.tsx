/**
 * Static background behind the model.
 * Only provides a solid background color fallback — skybox panoramas
 * are rendered as proper 3D spheres by model-viewer's skybox-image attribute,
 * so we do NOT duplicate a flat <img> here (that would cause a ratio mismatch).
 */

interface Props {
  backgroundColor?: string;
}

export default function SceneGround({ backgroundColor }: Props) {
  if (backgroundColor && backgroundColor !== '#ffffff') {
    return (
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ backgroundColor }}
      />
    );
  }

  return null;
}
