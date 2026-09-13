export function parseOrbit(orbit: string) {
  const p = String(orbit).trim().split(/\s+/);
  return {
    theta: parseFloat(p[0]) || 0,
    phi: parseFloat(p[1]) || 90,
    radius: p[2] || 'auto',
  };
}
export function parseTarget(t: string): [number, number, number] {
  const p = String(t).trim().split(/\s+/);
  return [parseFloat(p[0]) || 0, parseFloat(p[1]) || 1, parseFloat(p[2]) || 0];
}
export function parseFov(f: string) {
  const n = parseFloat(f);
  return isNaN(n) ? 45 : n;
}
export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
export function smooth(t: number) {
  return t * t * (3 - 2 * t);
}
export function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return a + d * t;
}
export function getMinRadius(collisionPadding: number): number {
  const v = document.querySelector('model-viewer') as any;
  try {
    const d = v?.getDimensions?.();
    if (d) {
      const r = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z) / 2;
      return r * 0.45 + collisionPadding;
    }
  } catch {
    // ignore
  }
  return 0.6 + collisionPadding;
}

export interface WalkWP {
  label?: string;
  orbit: string;
  target: string;
  fov: string;
  duration: number;
}

/** Return total duration */
export function totalDuration(path: WalkWP[]): number {
  return path.reduce((s, w) => s + (w.duration || 0), 0);
}

/**
 * Seek model-viewer to normalized progress p in [0,1] along path.
 * Interpolates with smoothstep + angle lerp, clamped by min radius.
 */
export function seekToProgress(path: WalkWP[], p: number, collisionPadding: number) {
  const v = document.querySelector('model-viewer') as any;
  if (!v || path.length === 0) return;
  if (path.length === 1) {
    try {
      v.cameraOrbit = path[0].orbit;
      v.cameraTarget = path[0].target;
      v.fieldOfView = path[0].fov;
    } catch {
      // ignore
    }
    return;
  }
  const tDur = totalDuration(path);
  if (tDur <= 0) return;
  const clamped = Math.max(0, Math.min(1, p));
  const abs = clamped * tDur;

  // Find segment: durations are per-waypoint (time to reach that point from previous).
  // We use path[i].duration as segment ending at i, for i>=1. For simplicity treat cumulative.
  let cum = 0;
  let seg = 0;
  for (let i = 1; i < path.length; i++) {
    cum += path[i].duration;
    if (abs <= cum) {
      seg = i - 1;
      break;
    }
    if (i === path.length - 1) seg = path.length - 2;
  }
  const segStartCum = (() => {
    let s = 0;
    for (let i = 1; i <= seg; i++) s += path[i].duration;
    return s;
  })();
  const segDur = path[seg + 1]?.duration || 1;
  const localT = segDur <= 0 ? 0 : Math.max(0, Math.min(1, (abs - segStartCum) / segDur));
  const u = smooth(localT);

  const cur = path[seg];
  const nxt = path[seg + 1];
  if (!cur || !nxt) return;

  const cO = parseOrbit(cur.orbit);
  const nO = parseOrbit(nxt.orbit);
  const cT = parseTarget(cur.target);
  const nT = parseTarget(nxt.target);
  const cF = parseFov(cur.fov);
  const nF = parseFov(nxt.fov);
  const minR = getMinRadius(collisionPadding);
  const cRraw = cO.radius === 'auto' ? minR + 1 : parseFloat(String(cO.radius));
  const nRraw = nO.radius === 'auto' ? minR + 1 : parseFloat(String(nO.radius));
  const cR = isNaN(cRraw as any) ? minR + 1 : (cRraw as number);
  const nR = isNaN(nRraw as any) ? minR + 1 : (nRraw as number);
  let radius = lerp(cR, nR, u);
  radius = Math.max(minR, radius);
  const theta = lerpAngle(cO.theta, nO.theta, u);
  const phi = lerp(cO.phi, nO.phi, u);
  const tx = lerp(cT[0], nT[0], u);
  const ty = lerp(cT[1], nT[1], u);
  const tz = lerp(cT[2], nT[2], u);
  const fov = lerp(cF, nF, u);
  try {
    v.cameraOrbit = `${theta.toFixed(2)}deg ${phi.toFixed(2)}deg ${radius.toFixed(2)}m`;
    v.cameraTarget = `${tx.toFixed(3)} ${ty.toFixed(3)} ${tz.toFixed(3)}`;
    v.fieldOfView = `${fov.toFixed(1)}deg`;
    v.setAttribute('min-camera-orbit', `auto auto ${minR.toFixed(2)}m`);
  } catch {
    // ignore
  }
}
