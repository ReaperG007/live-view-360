/**
 * Procedural equirectangular skybox generator.
 *
 * Generates day / night / overcast / winter skies at runtime on a canvas,
 * so the editor always has guaranteed-available skybox options without
 * relying on external HDR hosts.
 *
 * Tokens like '__sky_day__' are stored in state; `resolveSkyboxUrl` maps
 * them to generated data URLs (memoized). Non-token values pass through.
 */

export type GeneratedSkyboxId = 'day' | 'night' | 'overcast' | 'winter';

export const SKYBOX_TOKENS: Record<GeneratedSkyboxId, string> = {
  day: '__sky_day__',
  night: '__sky_night__',
  overcast: '__sky_overcast__',
  winter: '__sky_winter__',
};

const cache = new Map<string, string>();

const WIDTH = 2048;
const HEIGHT = 1024;

function createBaseCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

/** Vertical equirect gradient: top = zenith, middle = horizon, bottom = ground */
function paintVerticalGradient(
  ctx: CanvasRenderingContext2D,
  stops: Array<[number, string]>
) {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  for (const [offset, color] of stops) {
    gradient.addColorStop(offset, color);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

/** A glowing celestial disc (sun or moon) */
function paintGlowDisc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  glowRadius: number,
  discColor: string,
  glowColor: string
) {
  // Outer glow
  const glow = ctx.createRadialGradient(x, y, radius * 0.2, x, y, glowRadius);
  glow.addColorStop(0, glowColor);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - glowRadius, y - glowRadius, glowRadius * 2, glowRadius * 2);

  // Disc
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = discColor;
  ctx.fill();
}

/** Painted crescent moon shape */
function paintCrescent(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  glowColor: string
) {
  const glow = ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius * 4);
  glow.addColorStop(0, glowColor);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - radius * 4, y - radius * 4, radius * 8, radius * 8);

  // Crescent = full disc minus offset shadow disc
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#e8ecf5';
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.fillStyle = '#070d1e';
  ctx.beginPath();
  ctx.arc(x + radius * 0.45, y - radius * 0.25, radius * 0.92, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Deterministic pseudo-random so stars are stable between calls */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paintStars(ctx: CanvasRenderingContext2D, count: number, seed: number) {
  const rand = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const x = rand() * WIDTH;
    const y = rand() * HEIGHT * 0.55; // keep stars above horizon
    const size = rand() < 0.9 ? rand() * 1.4 + 0.4 : rand() * 2.2 + 1.4;
    const alpha = 0.35 + rand() * 0.65;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.fill();
  }
  // A few bright stars with cross sparkle
  for (let i = 0; i < 24; i++) {
    const x = rand() * WIDTH;
    const y = rand() * HEIGHT * 0.45;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(x - 3, y, 7, 1);
    ctx.fillRect(x, y - 3, 1, 7);
  }
}

/** Soft horizontal cloud bands */
function paintCloudBands(
  ctx: CanvasRenderingContext2D,
  color: string,
  seed: number,
  bandCount: number
) {
  const rand = mulberry32(seed);
  for (let i = 0; i < bandCount; i++) {
    const y = HEIGHT * (0.28 + rand() * 0.25);
    const cloudH = 12 + rand() * 30;
    const cloudW = WIDTH * (0.3 + rand() * 0.7);
    const x = rand() * WIDTH * 0.9;
    const alpha = 0.08 + rand() * 0.1;
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, color.replace(/ALPHA/, alpha.toFixed(2)));
    gradient.addColorStop(1, color.replace(/ALPHA/, '0'));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(cloudW, cloudH);
    ctx.translate(-x, -y);
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.save();
    ctx.translate(-cloudW, -cloudH);
    ctx.fillRect(x - cloudW, y - cloudH, cloudW * 2, cloudH * 2);
    ctx.restore();
    ctx.restore();
  }
}

const generators: Record<GeneratedSkyboxId, () => string> = {
  day: () => {
    const [canvas, ctx] = createBaseCanvas();
    paintVerticalGradient(ctx, [
      [0, '#1d5fc4'], // zenith deep blue
      [0.38, '#4a8fd9'],
      [0.48, '#a8cdea'], // horizon haze
      [0.52, '#e8dcc8'], // warm ground line
      [0.56, '#9aa48c'],
      [1, '#4d5443'], // ground
    ]);
    // Sun high in the sky, centered at azimuth 0
    paintGlowDisc(
      ctx,
      WIDTH * 0.5,
      HEIGHT * 0.22,
      26,
      260,
      '#fffdf2',
      'rgba(255, 236, 170, 0.85)'
    );
    paintCloudBands(ctx, 'rgba(255,255,255,ALPHA)', 42, 16);
    return canvas.toDataURL('image/png');
  },

  night: () => {
    const [canvas, ctx] = createBaseCanvas();
    paintVerticalGradient(ctx, [
      [0, '#030612'], // zenith near-black
      [0.35, '#081226'],
      [0.48, '#15294a'], // horizon glow
      [0.52, '#0a1426'],
      [0.56, '#050a14'],
      [1, '#02040a'], // dark ground
    ]);
    paintStars(ctx, 900, 1337);
    // Crescent moon
    paintCrescent(ctx, WIDTH * 0.5, HEIGHT * 0.18, 30, 'rgba(200, 215, 255, 0.55)');
    // Faint night clouds
    paintCloudBands(ctx, 'rgba(120,140,190,ALPHA)', 91, 7);
    return canvas.toDataURL('image/png');
  },

  overcast: () => {
    const [canvas, ctx] = createBaseCanvas();
    paintVerticalGradient(ctx, [
      [0, '#5d6670'], // gray zenith
      [0.4, '#828b95'],
      [0.49, '#b4bac1'], // pale horizon
      [0.52, '#7d868e'],
      [0.58, '#4a5057'],
      [1, '#282c31'], // dark ground (wet)
    ]);
    paintCloudBands(ctx, 'rgba(210,216,224,ALPHA)', 7, 26);
    paintCloudBands(ctx, 'rgba(40,44,50,ALPHA)', 23, 10);
    return canvas.toDataURL('image/png');
  },

  winter: () => {
    const [canvas, ctx] = createBaseCanvas();
    paintVerticalGradient(ctx, [
      [0, '#7f9db8'], // cold steel blue
      [0.38, '#b6c9da'],
      [0.49, '#eef4f9'], // bright snow-lit horizon
      [0.52, '#dfe8f0'],
      [0.58, '#cdd6e0'],
      [1, '#9aa7b4'], // snowy ground
    ]);
    // Low pale winter sun
    paintGlowDisc(
      ctx,
      WIDTH * 0.32,
      HEIGHT * 0.4,
      20,
      300,
      '#fdf7ea',
      'rgba(255, 240, 200, 0.5)'
    );
    paintCloudBands(ctx, 'rgba(255,255,255,ALPHA)', 55, 14);
    return canvas.toDataURL('image/png');
  },
};

export function getGeneratedSkyboxUrl(id: GeneratedSkyboxId): string {
  const token = SKYBOX_TOKENS[id];
  const cached = cache.get(token);
  if (cached) return cached;
  if (typeof document === 'undefined') return '';
  const url = generators[id]();
  cache.set(token, url);
  return url;
}

/** True when the value is one of our generated-skybox tokens (not a real URL). */
export function isGeneratedSkyboxToken(value: string): boolean {
  return Object.values(SKYBOX_TOKENS).includes(value);
}

/**
 * Resolves a skybox state value into a real URL usable by <model-viewer>.
 * Pass-through for regular URLs / blob URLs.
 */
export function resolveSkyboxUrl(value: string): string {
  if (!value) return '';
  if (!isGeneratedSkyboxToken(value)) return value;
  const id = (Object.keys(SKYBOX_TOKENS) as GeneratedSkyboxId[]).find(
    (k) => SKYBOX_TOKENS[k] === value
  )!;
  return getGeneratedSkyboxUrl(id);
}
