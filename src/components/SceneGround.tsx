/**
 * Static skybox backgrounds behind the model.
 * Simple full-viewport gradient fills — no animations, no SVG landscapes.
 */
export type SkyboxType = 'none' | 'day' | 'night' | 'sunset';

interface Props {
  type: SkyboxType;
}

const SKYBOXES: Record<Exclude<SkyboxType, 'none'>, string> = {
  day: 'linear-gradient(180deg, #2563eb 0%, #60a5fa 30%, #93c5fd 50%, #bfdbfe 65%, #e0f2fe 80%, #f0f9ff 100%)',
  night: 'linear-gradient(180deg, #020617 0%, #0f172a 25%, #1e293b 50%, #1a1f3a 70%, #0f1322 100%)',
  sunset:
    'linear-gradient(180deg, #1e1b4b 0%, #4c1d95 15%, #9333ea 28%, #e879f9 38%, #fb923c 50%, #fbbf24 60%, #fde68a 72%, #fef3c7 100%)',
};

export default function SceneGround({ type }: Props) {
  if (type === 'none') return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1]"
      style={{ background: SKYBOXES[type] }}
    />
  );
}
