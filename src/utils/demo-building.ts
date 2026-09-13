/**
 * Runtime GLB generator — produces a tiny 3-story office building
 * made of coloured box meshes.  No Three.js or other 3D library required;
 * the file is built directly in the GLB binary spec so @google/model-viewer
 * can load it immediately.
 */

// ── Box helper ────────────────────────────────────────────────
// Returns { vertices: Float32Array, indices: Uint16Array }
function box(
  w: number,
  h: number,
  d: number,
  r: number,
  g: number,
  b: number,
) {
  const hw = w / 2,
    hh = h / 2,
    hd = d / 2;

  // 24 verts – 4 per face so normals face outward
  const verts = new Float32Array([
    // Front (z = +hd)
    -hw, -hh, hd, hw, -hh, hd, hw, hh, hd, -hw, hh, hd,
    // Back (z = -hd)
    hw, -hh, -hd, -hw, -hh, -hd, -hw, hh, -hd, hw, hh, -hd,
    // Left (x = -hw)
    -hw, -hh, -hd, -hw, -hh, hd, -hw, hh, hd, -hw, hh, -hd,
    // Right (x = +hw)
    hw, -hh, hd, hw, -hh, -hd, hw, hh, -hd, hw, hh, hd,
    // Top (y = +hh)
    -hw, hh, hd, hw, hh, hd, hw, hh, -hd, -hw, hh, -hd,
    // Bottom (y = -hh)
    -hw, -hh, -hd, hw, -hh, -hd, hw, -hh, hd, -hw, -hh, hd,
  ]);

  // Per-face base colours (RGB, one per vertex)
  const colors = new Float32Array(24 * 3);
  const faces = [
    [r, g, b],
    [r * 0.9, g * 0.9, b * 0.9],
    [r * 0.85, g * 0.85, b * 0.85],
    [r * 0.85, g * 0.85, b * 0.85],
    [r * 1.1, g * 1.1, b * 1.1],
    [r * 0.7, g * 0.7, b * 0.7],
  ];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = (f * 4 + v) * 3;
      colors[i] = Math.min(1, faces[f][0]);
      colors[i + 1] = Math.min(1, faces[f][1]);
      colors[i + 2] = Math.min(1, faces[f][2]);
    }
  }

  const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14,
    12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23,
  ]);

  return { vertices: verts, colors, indices };
}

// ── GLB builder ───────────────────────────────────────────────
// Builds a minimal GLB 2.0 with one PBR Metallic-Roughness mesh
// that uses vertex colours (white base colour + vertex colour multiplication).
function buildGlb(meshes: { vertices: Float32Array; colors: Float32Array; indices: Uint16Array; translation?: [number, number, number] }[]) {
  const accessors: any[] = [];
  const bufferViews: any[] = [];
  const meshDefs: any[] = [];
  const nodeDefs: any[] = [];
  const primitiveDefs: any[] = [];

  // Collect all binary chunks, pack into one buffer
  const binParts: ArrayBuffer[] = [];
  let byteOffset = 0;

  function addBufferView(data: ArrayBuffer | ArrayBufferLike, target?: number) {
    const alignedLen = (data.byteLength + 3) & ~3; // align to 4 bytes
    const idx = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: data.byteLength,
      ...(target !== undefined ? { target } : {}),
    });
    binParts.push(data.slice(0) as ArrayBuffer); // copy
    // pad
    if (alignedLen > data.byteLength) {
      binParts.push(new Uint8Array(alignedLen - data.byteLength).buffer);
    }
    byteOffset += alignedLen;
    return idx;
  }

  function addAccessor(
    bvIdx: number,
    componentType: number,
    count: number,
    type: string,
    min?: number[],
    max?: number[],
  ) {
    const idx = accessors.length;
    accessors.push({
      bufferView: bvIdx,
      componentType,
      count,
      type,
      ...(min ? { min } : {}),
      ...(max ? { max } : {}),
    });
    return idx;
  }

  for (const mesh of meshes) {
    // Vertex positions buffer view
    const posBv = addBufferView(mesh.vertices.buffer, 34962);
    const posAcc = addAccessor(
      posBv,
      5126, // FLOAT
      mesh.vertices.length / 3,
      'VEC3',
    );

    // Vertex colours buffer view
    const colBv = addBufferView(mesh.colors.buffer, 34962);
    const colAcc = addAccessor(
      colBv,
      5126,
      mesh.colors.length / 3,
      'VEC3',
    );

    // Indices buffer view
    const idxBv = addBufferView(mesh.indices.buffer, 34963);
    const idxAcc = addAccessor(
      idxBv,
      5123, // UNSIGNED_SHORT
      mesh.indices.length,
      'SCALAR',
    );

    const prim = {
      attributes: { POSITION: posAcc, COLOR_0: colAcc },
      indices: idxAcc,
      material: 0,
    };
    primitiveDefs.push(prim);

    const meshIdx = meshDefs.length;
    meshDefs.push({ primitives: [prim] });

    const node: any = { mesh: meshIdx };
    if (mesh.translation) {
      node.translation = mesh.translation;
    }
    nodeDefs.push(node);
  }

  // ── JSON chunk ──
  const gltf: any = {
    asset: { version: '2.0', generator: 'freebuff-demo-building' },
    scene: 0,
    scenes: [{ nodes: nodeDefs.map((_, i) => i) }],
    nodes: nodeDefs,
    meshes: meshDefs,
    accessors,
    bufferViews,
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorFactor: [1, 1, 1, 1],
          metallicFactor: 0,
          roughnessFactor: 0.9,
        },
      },
    ],
    buffers: [{ byteLength: byteOffset }],
  };

  const jsonStr = JSON.stringify(gltf);
  // Pad JSON chunk to 4-byte boundary (spaces)
  const jsonPad = (4 - (jsonStr.length % 4)) % 4;
  const jsonChunkLen = jsonStr.length + jsonPad;

  // ── Binary chunk ──
  const binDataLen = binParts.reduce((s, p) => s + p.byteLength, 0);
  const binPad = (4 - (binDataLen % 4)) % 4;
  const binChunkLen = binDataLen + binPad;

  // ── GLB header + chunks ──
  const totalLen = 12 + 8 + jsonChunkLen + 8 + binChunkLen;
  const buf = new ArrayBuffer(totalLen);
  const dv = new DataView(buf);
  let off = 0;

  // Header
  dv.setUint32(off, 0x46546c67, true);
  off += 4; // magic "glTF"
  dv.setUint32(off, 2, true);
  off += 4; // version 2
  dv.setUint32(off, totalLen, true);
  off += 4; // total length

  // JSON chunk
  dv.setUint32(off, jsonChunkLen, true);
  off += 4;
  dv.setUint32(off, 0x4e4f534a, true);
  off += 4; // "JSON"
  const enc = new TextEncoder();
  const jsonBytes = enc.encode(jsonStr);
  new Uint8Array(buf, off, jsonBytes.length).set(jsonBytes);
  // fill padding with spaces
  for (let i = 0; i < jsonPad; i++) jsonBytes[jsonBytes.length + i] = 0x20;
  new Uint8Array(buf, off, jsonChunkLen).set(
    new Uint8Array(jsonBytes.buffer, 0, jsonChunkLen),
  );
  off += jsonChunkLen;

  // Binary chunk
  dv.setUint32(off, binChunkLen, true);
  off += 4;
  dv.setUint32(off, 0x004e4942, true);
  off += 4; // "BIN\0"
  for (const part of binParts) {
    new Uint8Array(buf, off, part.byteLength).set(new Uint8Array(part));
    off += part.byteLength;
  }
  // binary padding is zeroes (ArrayBuffer already zeroed)

  return buf;
}

// ── Building parts ────────────────────────────────────────────
function createBuilding() {
  const parts: ReturnType<typeof box>[] = [];
  const translations: [number, number, number][] = [];

  // Main body: 3-storey building (width=2, height=3, depth=1.2)
  const body = box(2, 3, 1.2, 0.85, 0.88, 0.92);
  parts.push(body);
  translations.push([0, 1.5, 0]);

  // Roof: slightly wider slab on top
  const roof = box(2.2, 0.15, 1.35, 0.45, 0.48, 0.52);
  parts.push(roof);
  translations.push([0, 3.1, 0]);

  // Ground floor entrance (recessed door)
  const door = box(0.5, 0.9, 0.06, 0.35, 0.55, 0.85);
  parts.push(door);
  translations.push([0, 0.45, 0.63]);

  // Door frame surround
  const doorFrame = box(0.6, 1.0, 0.04, 0.6, 0.63, 0.67);
  parts.push(doorFrame);
  translations.push([0, 0.5, 0.65]);

  // Canopy above door
  const canopy = box(0.9, 0.06, 0.4, 0.55, 0.58, 0.62);
  parts.push(canopy);
  translations.push([0, 1.0, 0.75]);

  // Windows (2 rows x 3 columns per floor, 3 floors = 18 windows)
  // Each window is a thin colored panel on the front face
  const winW = 0.3,
    winH = 0.45,
    winD = 0.04;
  const startX = -0.75;
  const gapX = 0.5;
  const floors = [0.65, 1.45, 2.25];
  const winColor: [number, number, number] = [0.55, 0.75, 0.95];
  const frameColor: [number, number, number] = [0.5, 0.53, 0.57];

  for (let floor = 0; floor < 3; floor++) {
    for (let col = 0; col < 3; col++) {
      const x = startX + col * gapX;
      const y = floors[floor];
      const z = 0.63;

      // Window glass
      parts.push(box(winW, winH, winD, ...winColor));
      translations.push([x, y, z]);

      // Window frame (slightly larger)
      parts.push(box(winW + 0.06, winH + 0.06, 0.02, ...frameColor));
      translations.push([x, y, z + 0.01]);
    }
  }

  // Side windows (left side)
  const sideZ = [-0.25, 0.25];
  for (let floor = 0; floor < 3; floor++) {
    for (const sz of sideZ) {
      parts.push(box(0.04, winH, winW, ...winColor));
      translations.push([-1.02, floors[floor], sz]);

      parts.push(box(0.02, winH + 0.06, winW + 0.06, ...frameColor));
      translations.push([-1.03, floors[floor], sz]);
    }
  }

  // Right side windows
  for (let floor = 0; floor < 3; floor++) {
    for (const sz of sideZ) {
      parts.push(box(0.04, winH, winW, ...winColor));
      translations.push([1.02, floors[floor], sz]);

      parts.push(box(0.02, winH + 0.06, winW + 0.06, ...frameColor));
      translations.push([1.03, floors[floor], sz]);
    }
  }

  // Back side windows (3 per floor)
  const backX = [-0.6, 0, 0.6];
  for (let floor = 0; floor < 3; floor++) {
    for (const bx of backX) {
      parts.push(box(winW, winH, winD, ...winColor));
      translations.push([bx, floors[floor], -0.63]);

      parts.push(box(winW + 0.06, winH + 0.06, 0.02, ...frameColor));
      translations.push([bx, floors[floor], -0.64]);
    }
  }

  // Ground plane
  const ground = box(6, 0.08, 6, 0.38, 0.42, 0.36);
  parts.push(ground);
  translations.push([0, -0.04, 0]);

  return { parts, translations };
}

let cachedUrl = '';

export function getDemoBuildingUrl(): string {
  if (cachedUrl) return cachedUrl;
  if (typeof document === 'undefined') return '';

  const { parts, translations } = createBuilding();

  const meshDefs = parts.map((p, i) => ({
    vertices: p.vertices,
    colors: p.colors,
    indices: p.indices,
    translation: translations[i],
  }));

  const arrayBuffer = buildGlb(meshDefs);
  const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
  cachedUrl = URL.createObjectURL(blob);
  return cachedUrl;
}
