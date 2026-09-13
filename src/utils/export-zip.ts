/**
 * Builds a standalone ZIP containing:
 *  - index.html (single-file viewer with hotspot, FPV, walkthrough, collision-aware)
 *  - model.glb (the loaded model, inlined as base64 if needed for singlefile compat,
 *               otherwise as a local file — we include both strategies for robustness)
 *
 * The exported viewer works by simply opening index.html in any static host or locally.
 */
import JSZip from 'jszip';
import type { EditorState, Hotspot } from '../store/editor-store';

function escAttr(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function buildHotspotButton(h: Hotspot, idx: number): string {
  const col = h.color || '#3b82f6';
  const title = escAttr(h.title);
  const desc = escAttr(h.description);
  const label = h.description
    ? `<div class=\"hs-label\"><strong>${title}</strong><p>${desc}</p></div>`
    : `<div class=\"hs-label\"><strong>${title}</strong></div>`;
  // model-viewer hotspot: slot + data-position/data-normal. We add focus data in dataset.
  return `      <button slot=\"hotspot-${h.id}-${idx}\" data-position=\"${escAttr(h.position)}\" data-normal=\"${escAttr(h.normal)}\" data-focus-orbit=\"${escAttr(h.focusOrbit)}\" data-focus-target=\"${escAttr(h.focusTarget)}\" data-focus-fov=\"${escAttr(h.focusFov)}\" class=\"hs\" style=\"--hs-color:${col}\" data-title=\"${title}\">\n        <span class=\"hs-dot\" style=\"background:${col}\"><span class=\"hs-icon hs-icon--${h.icon || 'pin'}\"></span></span>\n        ${label}\n      </button>`;
}

function inferFilename(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').pop() || 'model.glb';
    return last.includes('.') ? last : 'model.glb';
  } catch {
    return 'model.glb';
  }
}

export async function buildStandaloneZip(state: EditorState): Promise<Blob> {
  const zip = new JSZip();

  // 1) Fetch/embed the model as a blob
  let modelBlob: Blob | null = null;
  let modelFilename = 'model.glb';
  if (state.modelSrc) {
    try {
      modelFilename = inferFilename(state.modelSrc);
      // If it's a blob: URL we already own, fetch it
      const resp = await fetch(state.modelSrc);
      const buf = await resp.arrayBuffer();
      if (buf.byteLength > 0) {
        modelBlob = new Blob([buf], { type: 'model/gltf-binary' });
      }
    } catch {
      // fetching may fail for cross-origin models — viewer will fall back to remote URL
      modelBlob = null;
    }
  }

  // Also try to get an exported scene if available (more accurate: includes material tweaks)
  // We keep modelBlob as-is; the standalone will prefer the bundled file.

  if (modelBlob) {
    zip.file(modelFilename, modelBlob);
  }

  // Also embed the model as a data URL for guaranteed offline singlefile opening (optional extra)
  let modelDataUrl = '';
  if (modelBlob) {
    // limit data URL to ~ 12MB to avoid insanely large HTML; otherwise use file reference
    if (modelBlob.size < 12 * 1024 * 1024) {
      const b64 = await blobToBase64(modelBlob);
      modelDataUrl = `data:model/gltf-binary;base64,${b64}`;
    }
  }

  const modelSrcForHtml = modelDataUrl || (modelBlob ? escAttr(modelFilename) : escAttr(state.modelSrc));

  // Build hotspot HTML
  const hotspotsHtml = state.hotspots.map((h, i) => buildHotspotButton(h, i)).join('\n');

  // Serialize waypoints for runtime script
  const waypointsJson = JSON.stringify(state.cameraPath);

  // Build index.html
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escAttr(state.modelAlt || '3D Viewer')}</title>
<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"></script>
<style>
  *{box-sizing:border-box}html,body{height:100%;margin:0;background:${state.backgroundColor || '#ffffff'};font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
  .wrap{position:relative;width:100%;height:100dvh;overflow:hidden;background:${state.backgroundColor || '#ffffff'}}
  model-viewer{width:100%;height:100%;background:transparent;--poster-color:transparent}
  .hs{width:28px;height:28px;border-radius:50%;border:2px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer;display:grid;place-items:center;padding:0;background:var(--hs-color,#3b82f6);transition:transform .15s}
  .hs:hover{transform:scale(1.08)} .hs.active{transform:scale(1.12);box-shadow:0 6px 18px rgba(0,0,0,.35),0 0 0 6px color-mix(in srgb,var(--hs-color) 25%, transparent)}
  .hs-dot{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;color:#fff}
  .hs-label{position:absolute;left:50%;bottom:calc(100% + 10px);transform:translateX(-50%);background:rgba(17,24,39,.92);color:#fff;padding:8px 10px;border-radius:10px;min-width:160px;max-width:240px;pointer-events:none;opacity:0;translate:0 4px;transition:all .18s;box-shadow:0 10px 30px rgba(0,0,0,.35);text-align:left}
  .hs-label strong{font-size:12px;line-height:1.2;display:block} .hs-label p{font-size:11px;opacity:.8;margin:4px 0 0;line-height:1.3}
  .hs:hover .hs-label,.hs.active .hs-label{opacity:1;translate:0 0}
  .hs-label::after{content:\"\";position:absolute;top:100%;left:50%;margin-left:-6px;border:6px solid transparent;border-top-color:rgba(17,24,39,.92)}
  .bar{position:absolute;left:12px;right:12px;top:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;z-index:20}
  .pill{backdrop-filter:blur(16px);background:rgba(255,255,255,.72);border:1px solid rgba(255,255,255,.6);box-shadow:0 8px 24px rgba(0,0,0,.12);border-radius:999px;padding:8px 12px;display:flex;gap:8px;align-items:center}
  .pill button{appearance:none;border:0;border-radius:999px;padding:7px 12px;font:600 12px/1 ui-sans-serif,system-ui;cursor:pointer}
  .pill button.primary{background:#111827;color:#fff} .pill button.ghost{background:rgba(255,255,255,.9);color:#111827;border:1px solid rgba(0,0,0,.06)}
  .pill button:disabled{opacity:.45;cursor:not-allowed}
  .badge{font:600 11px/1 ui-sans-serif,system-ui;letter-spacing:.04em;text-transform:uppercase;color:#111827;background:rgba(255,255,255,.85);border:1px solid rgba(0,0,0,.06);padding:6px 8px;border-radius:999px}
  .scrubbar{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:22;width:min(560px, calc(100% - 24px))}
  .scrubbar .scrubcard{background:rgba(17,24,39,.78);backdrop-filter:blur(16px);color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:10px 14px;box-shadow:0 18px 40px rgba(0,0,0,.35)}
  .scrubbar .scrubtrack{position:relative;height:32px;border-radius:999px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);cursor:pointer;touch-action:none;user-select:none;margin-top:8px}
  .scrubbar .scrubfill{position:absolute;top:4px;bottom:4px;left:4px;border-radius:999px;background:linear-gradient(90deg,rgba(255,255,255,.9),rgba(59,130,246,.9));pointer-events:none;transition:none}
  .scrubbar .scrubthumb{position:absolute;top:50%;width:28px;height:28px;border-radius:50%;background:#fff;border:2px solid #fff;box-shadow:0 4px 16px rgba(0,0,0,.3);transform:translate(-50%,-50%);pointer-events:none;transition:none}
  .scrubbar .scrubinfo{display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:rgba(255,255,255,.6)}
  .scrubbar .scrubdots{display:flex;gap:4px;margin-top:6px}
  .scrubbar .scrubdot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.3);cursor:pointer;transition:background .15s}
  .scrubbar .scrubdot.active{background:rgba(255,255,255,.95)}
  .walkbar{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:20;width:min(560px, calc(100% - 24px))}
  .walkcard{background:rgba(17,24,39,.78);backdrop-filter:blur(16px);color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:10px 14px;display:flex;gap:12px;align-items:center;box-shadow:0 18px 40px rgba(0,0,0,.35)}
  .walkcard .dot{width:8px;height:8px;border-radius:50%;background:#34d399;box-shadow:0 0 10px rgba(52,211,153,.9);flex-shrink:0}
  .walkcard .meta{flex:1;min-width:0}
  .walkcard .meta .t{font:600 12px/1.1 ui-sans-serif,system-ui}
  .walkcard .meta .s{font:400 11px/1.2 ui-sans-serif,system-ui;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .walkcard .prog{height:4px;background:rgba(255,255,255,.18);border-radius:999px;overflow:hidden;margin-top:8px}
  .walkcard .prog>span{display:block;height:100%;background:rgba(255,255,255,.9);width:0%}
  .fpvHint{position:absolute;left:50%;bottom:90px;transform:translateX(-50%);z-index:15;pointer-events:none;background:rgba(0,0,0,.28);backdrop-filter:blur(10px);color:rgba(255,255,255,.75);border:1px solid rgba(255,255,255,.12);padding:6px 10px;border-radius:999px;font:500 11px/1 ui-sans-serif,system-ui}
  .cross{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;z-index:10}
  .cross i{width:18px;height:18px;position:relative;display:block}
  .cross i::before,.cross i::after{content:\"\";position:absolute;background:rgba(255,255,255,.75);box-shadow:0 1px 6px rgba(0,0,0,.35)}
  .cross i::before{left:0;right:0;top:50%;height:1px;transform:translateY(-50%)}
  .cross i::after{top:0;bottom:0;left:50%;width:1px;transform:translateX(-50%)}
  .cross b{position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:rgba(255,255,255,.95);box-shadow:0 0 10px rgba(255,255,255,.9)}
  .joy{position:absolute;left:18px;bottom:18px;z-index:16;touch-action:none;user-select:none}
  .joy .ring{width:120px;height:120px;border-radius:50%;border:2px solid rgba(255,255,255,.28);background:rgba(0,0,0,.22);backdrop-filter:blur(10px);position:relative}
  .joy .thumb{position:absolute;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.92);border:1px solid rgba(255,255,255,.95);box-shadow:0 6px 18px rgba(0,0,0,.25);display:grid;place-items:center}
  .joy .thumb span{width:14px;height:2px;background:rgba(0,0,0,.25);border-radius:999px;display:block}
  .joy .hint{position:absolute;inset:-18px;display:grid;place-items:center;pointer-events:none;color:rgba(255,255,255,.35);font-size:10px}
  @media (max-width:640px){ .bar{gap:6px} .pill{padding:6px 8px} }
</style>
</head>
<body>
<div class="wrap" id="wrap">
  <model-viewer id="mv"
    src="${modelSrcForHtml}"
    alt="${escAttr(state.modelAlt)}"
    ${state.cameraControls ? 'camera-controls' : ''}
    ${state.autoRotate ? 'auto-rotate' : ''} ${state.autoRotateDelay ? `auto-rotate-delay=\"${state.autoRotateDelay}\"` : ''}
    ${state.disableZoom ? 'disable-zoom' : ''}
    ${state.environmentImage ? `environment-image=\"${escAttr(state.environmentImage)}\"` : ''}
    ${state.skyboxImage ? `skybox-image=\"${escAttr(state.skyboxImage)}\"` : ''}
    exposure="${state.exposure}"
    shadow-intensity="${state.shadowIntensity}"
    shadow-softness="${state.shadowSoftness}"
    camera-orbit="${escAttr(state.cameraOrbit)}"
    camera-target="${escAttr(state.cameraTarget)}"
    field-of-view="${escAttr(state.fieldOfView)}"
    ${state.animationName ? `animation-name=\"${escAttr(state.animationName)}\"` : ''} ${state.autoplay ? 'autoplay' : ''} animation-crossfade-duration="${state.animationCrossfadeDuration}"
    ${state.variantName ? `variant-name=\"${escAttr(state.variantName)}\"` : ''}
    scale="${state.modelScale} ${state.modelScale} ${state.modelScale}"
    interaction-prompt="${escAttr(state.interactionPrompt)}"
    interaction-prompt-threshold="${state.interactionPromptThreshold}"
    style="background-color:${state.backgroundColor}"
  >
${hotspotsHtml}
  </model-viewer>

  <div class="bar">
    <div class="pill" role="toolbar" aria-label="Viewer controls">
      <button class="ghost" id="btnOrbit" title="Orbit mode">Orbit</button>
      <button class="ghost" id="btnFpv" title="First-person mode">FPV</button>
      <span style="width:1px;height:18px;background:rgba(0,0,0,.08)"></span>
      <button class="ghost" id="btnWalk" title="Play walkthrough">▶ Walkthrough</button>
      <button class="ghost" id="btnReset" title="Reset view">Reset</button>
    </div>
    <span class="badge" id="modeBadge">Orbit</span>
    <span class="badge" id="countBadge">${state.hotspots.length} hotspots · ${state.cameraPath.length} path</span>
  </div>

  <div class="cross" id="cross" style="display:none"><i><b></b></i></div>
  <div class="fpvHint" id="fpvHint" style="display:none">WASD look · Q/E up·down · drag joystick · +/- zoom</div>
  <div class="joy" id="joy" style="display:none">
    <div class="ring" id="joyRing"><div class="thumb" id="joyThumb"><span></span></div><div class="hint">drag to look</div></div>
  </div>

  <div class="scrubbar" id="scrubbar" style="display:none">
    <div class="scrubcard">
      <div class="scrubtrack" id="scrubTrack">
        <div class="scrubfill" id="scrubFill"></div>
        <div class="scrubthumb" id="scrubThumb" style="left:4px"></div>
      </div>
      <div class="scrubinfo"><span id="scrubLabel">—</span><span id="scrubTime">0s / 0s</span></div>
      <div class="scrubdots" id="scrubDots"></div>
    </div>
  </div>

  <div class="walkbar" id="walkbar" style="display:none">
    <div class="walkcard">
      <span class="dot"></span>
      <div class="meta">
        <div class="t" id="walkTitle">Walkthrough</div>
        <div class="s" id="walkSub">—</div>
        <div class="prog"><span id="walkProg"></span></div>
      </div>
      <button class="ghost" id="walkStop" style="border-radius:999px;padding:8px 10px;background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.18)">■ Stop</button>
    </div>
  </div>
</div>

<script type="module">
const mv = document.getElementById('mv');
const btnOrbit = document.getElementById('btnOrbit');
const btnFpv = document.getElementById('btnFpv');
const btnWalk = document.getElementById('btnWalk');
const btnReset = document.getElementById('btnReset');
const modeBadge = document.getElementById('modeBadge');
const cross = document.getElementById('cross');
const fpvHint = document.getElementById('fpvHint');
const joy = document.getElementById('joy');
const joyRing = document.getElementById('joyRing');
const joyThumb = document.getElementById('joyThumb');
const walkbar = document.getElementById('walkbar');
const walkTitle = document.getElementById('walkTitle');
const walkSub = document.getElementById('walkSub');
const walkProg = document.getElementById('walkProg');
const walkStop = document.getElementById('walkStop');

const waypoints = ${waypointsJson};
const collisionPadding = ${typeof state.collisionPadding === 'number' ? state.collisionPadding : 0.4};
let homeOrbit = "${escAttr(state.cameraOrbit)}";
let homeTarget = "${escAttr(state.cameraTarget)}";
let homeFov = "${escAttr(state.fieldOfView)}";
let mode = 'orbit'; // 'orbit' | 'fpv'
let walkRaf = 0;
let walkPlaying = false;
let walkSeg = 0; let walkT = 0; let walkLast = 0;
let walkLoop = false;
let walkSpeed = 1;
let fpvYaw = 0, fpvPhi = 85, fpvTarget = [0,1,0], fpvRadius = 'auto';
let joyActive = false;
let joyPos = {x:0,y:0};
let keys = new Set();

function getMinRadius(){
  try{
    const d = mv.getDimensions && mv.getDimensions();
    if(d){ const r = Math.sqrt(d.x*d.x + d.y*d.y + d.z*d.z)/2; return r*0.45 + collisionPadding; }
  }catch{}
  return 0.6 + collisionPadding;
}
function parseOrbit(s){
  const p = String(s).trim().split(/\\s+/);
  return { theta: parseFloat(p[0])||0, phi: parseFloat(p[1])||85, radius: p[2]||'auto' };
}
function parseTarget(s){
  const p = String(s).trim().split(/\\s+/);
  return [parseFloat(p[0])||0, parseFloat(p[1])||1, parseFloat(p[2])||0];
}
function clampRadius(radiusStr, minR){
  if(radiusStr==='auto') return 'auto';
  const n = parseFloat(String(radiusStr));
  if(isNaN(n)) return radiusStr;
  return Math.max(n, minR).toFixed(2)+'m';
}

mv.addEventListener('load', () => {
  try{
    homeOrbit = mv.getCameraOrbit().toString();
    homeTarget = mv.getCameraTarget().toString();
    homeFov = mv.getFieldOfView().toFixed(1) + 'deg';
  }catch{}
  if(mode==='fpv') enterFpv();
});

function updateModeUI(){
  modeBadge.textContent = walkPlaying ? 'Walkthrough' : (mode==='fpv' ? 'FPV' : 'Orbit');
  btnOrbit.style.background = mode==='orbit' && !walkPlaying ? '#111827' : 'rgba(255,255,255,.9)';
  btnOrbit.style.color = mode==='orbit' && !walkPlaying ? '#fff' : '#111827';
  btnFpv.style.background = mode==='fpv' && !walkPlaying ? '#111827' : 'rgba(255,255,255,.9)';
  btnFpv.style.color = mode==='fpv' && !walkPlaying ? '#fff' : '#111827';
  btnWalk.style.background = walkPlaying ? '#111827' : 'rgba(255,255,255,.9)';
  btnWalk.style.color = walkPlaying ? '#fff' : '#111827';
  cross.style.display = mode==='fpv' && !walkPlaying ? 'grid' : 'none';
  fpvHint.style.display = mode==='fpv' && !walkPlaying ? 'block' : 'none';
  joy.style.display = mode==='fpv' && !walkPlaying ? 'block' : 'none';
  walkbar.style.display = walkPlaying ? 'block' : 'none';
  if(scrubBar) scrubBar.style.display = walkPlaying ? 'none' : (waypoints.length>=2 ? 'block' : 'none');
  // disable orbit controls interference during walkthrough
  if(walkPlaying){ mv.setAttribute('disable-pan',''); } else if(mode!=='fpv'){ mv.removeAttribute('disable-pan'); }
}

function enterFpv(){
  mode='fpv';
  try{
    const cur = mv.getCameraOrbit();
    fpvYaw = parseFloat(String(cur.theta))||0;
    fpvPhi = parseFloat(String(cur.phi))||85;
    fpvRadius = cur.radius ?? 'auto';
    const t = parseTarget(mv.getCameraTarget().toString());
    fpvTarget = t;
  }catch{}
  mv.setAttribute('disable-pan','');
  updateModeUI();
  // clamp
  const minR = getMinRadius();
  try{ mv.setAttribute('min-camera-orbit', 'auto auto '+minR.toFixed(2)+'m'); }catch{}
}
function enterOrbit(){
  mode='orbit';
  mv.removeAttribute('disable-pan');
  if(!mv.hasAttribute('disable-zoom')===false) {}
  updateModeUI();
}

// Controls
btnOrbit.addEventListener('click', ()=>{ stopWalk(); enterOrbit(); });
btnFpv.addEventListener('click', ()=>{ stopWalk(); enterFpv(); });
btnReset.addEventListener('click', ()=>{
  stopWalk();
  try{ mv.cameraOrbit = homeOrbit; mv.cameraTarget = homeTarget; mv.fieldOfView = homeFov; }catch{}
});
btnWalk.addEventListener('click', ()=>{ if(walkPlaying) stopWalk(); else startWalk(); });
walkStop.addEventListener('click', stopWalk);

// Hotspots
mv.querySelectorAll('.hs').forEach((btn)=>{
  btn.addEventListener('click', (e)=>{
    e.stopPropagation();
    stopWalk();
    const t = btn.dataset.focusTarget || btn.getAttribute('data-position') || '';
    const o = btn.dataset.focusOrbit || '';
    const f = btn.dataset.focusFov || '';
    try{
      if(t) mv.cameraTarget = t;
      if(o) mv.cameraOrbit = o;
      if(f) mv.fieldOfView = f;
    }catch{}
    mv.querySelectorAll('.hs').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    setTimeout(()=>btn.classList.remove('active'), 2200);
  });
});

// FPV joystick + keys
(function(){
  const JOY = 120, THUMB=44, DEAD=0.06, LOOK=0.7;
  const maxOff = (JOY - THUMB)/2;
  // center thumb
  function placeThumb(nx,ny){ joyThumb.style.left = (JOY/2 - THUMB/2 + nx*maxOff)+'px'; joyThumb.style.top=(JOY/2 - THUMB/2 + ny*maxOff)+'px'; }
  placeThumb(0,0);
  let start={x:0,y:0};
  joyRing.addEventListener('pointerdown', (e)=>{
    if(mode!=='fpv' || walkPlaying) return;
    e.preventDefault();
    joyRing.setPointerCapture(e.pointerId);
    joyActive=true;
    start={x:e.clientX,y:e.clientY};
    try{
      const o = parseOrbit(mv.getCameraOrbit().toString());
      fpvYaw=o.theta; fpvPhi=o.phi; fpvRadius=o.radius;
      const t = parseTarget(mv.getCameraTarget().toString()); fpvTarget=t;
    }catch{}
  });
  window.addEventListener('pointermove', (e)=>{
    if(!joyActive) return;
    const dx=e.clientX-start.x, dy=e.clientY-start.y;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const cl=Math.min(dist,maxOff);
    const ang=Math.atan2(dy,dx);
    const cx=cl*Math.cos(ang), cy=cl*Math.sin(ang);
    const nx=cx/maxOff, ny=cy/maxOff;
    joyPos={x:nx,y:ny};
    placeThumb(nx,ny);
  });
  window.addEventListener('pointerup', ()=>{
    if(!joyActive) return;
    joyActive=false;
    joyPos={x:0,y:0};
    placeThumb(0,0);
  });

  window.addEventListener('keydown', (e)=>{
    if(mode!=='fpv' || walkPlaying) return;
    const k=e.key.toLowerCase();
    if(['w','a','s','d','q','e','arrowup','arrowdown','arrowleft','arrowright','+','-','=','_','shift'].includes(k)){
      if(k.startsWith('arrow')) e.preventDefault();
      keys.add(k);
    }
    if(k==='escape'){ enterOrbit(); }
  });
  window.addEventListener('keyup', (e)=>{ keys.delete(e.key.toLowerCase()); });

  let raf=0;
  function tick(){
    if(mode==='fpv' && !walkPlaying){
      let dTheta=0,dPhi=0,dY=0,dZoom=0;
      if(joyActive){
        const m=Math.sqrt(joyPos.x*joyPos.x+joyPos.y*joyPos.y);
        if(m>DEAD){ dTheta -= joyPos.x * LOOK; dPhi += joyPos.y * LOOK; }
      }
      if(keys.has('a')||keys.has('arrowleft')) dTheta+=1.2;
      if(keys.has('d')||keys.has('arrowright')) dTheta-=1.2;
      if(keys.has('w')||keys.has('arrowup')) dPhi-=0.84;
      if(keys.has('s')||keys.has('arrowdown')) dPhi+=0.84;
      if(keys.has('q')) dY+=0.015;
      if(keys.has('e')) dY-=0.015;
      if(keys.has('+')||keys.has('=')||keys.has('shift')) dZoom-=0.02;
      if(keys.has('-')||keys.has('_')) dZoom+=0.02;
      if(dTheta||dPhi||dY||dZoom||joyActive){
        fpvYaw += dTheta;
        fpvPhi = Math.max(10, Math.min(170, fpvPhi + dPhi));
        fpvTarget[1] = Math.max(0.1, Math.min(4, fpvTarget[1] + dY));
        const minR = getMinRadius();
        let nextR = fpvRadius;
        if(nextR!=='auto'){
          const n=parseFloat(String(nextR));
          if(!isNaN(n)){ let v=n+dZoom; v=Math.max(minR,v); nextR=v.toFixed(2)+'m'; fpvRadius=nextR; }
        } else if(dZoom!==0){
          try{
            const cur = mv.getCameraOrbit().radius;
            const curN = typeof cur==='number'?cur:parseFloat(String(cur));
            if(!isNaN(curN)){ const v=Math.max(minR,curN+dZoom); nextR=v.toFixed(2)+'m'; fpvRadius=nextR; }
          }catch{}
        }
        if(nextR!=='auto'){ const n=parseFloat(String(nextR)); if(!isNaN(n) && n < minR){ nextR=minR.toFixed(2)+'m'; fpvRadius=nextR; } }
        try{
          mv.cameraOrbit = fpvYaw.toFixed(1)+'deg '+fpvPhi.toFixed(1)+'deg '+nextR;
          mv.cameraTarget = fpvTarget[0].toFixed(2)+' '+fpvTarget[1].toFixed(2)+' '+fpvTarget[2].toFixed(2);
          mv.setAttribute('min-camera-orbit','auto auto '+minR.toFixed(2)+'m');
        }catch{}
      }
    }
    raf=requestAnimationFrame(tick);
  }
  raf=requestAnimationFrame(tick);
})();

// Walkthrough
function lerp(a,b,t){return a+(b-a)*t}
function smooth(t){return t*t*(3-2*t)}
function lerpAngle(a,b,t){ let d=b-a; while(d>180)d-=360; while(d<-180)d+=360; return a+d*t; }
function parseOrbit2(s){ const p=String(s).trim().split(/\\s+/); return {theta:parseFloat(p[0])||0, phi:parseFloat(p[1])||85, radius:p[2]||'auto'}; }
function parseTarget2(s){ const p=String(s).trim().split(/\\s+/); return [parseFloat(p[0])||0, parseFloat(p[1])||1, parseFloat(p[2])||0]; }

function startWalk(){
  if(waypoints.length<2){ alert('Add at least 2 walkthrough points in the editor.'); return; }
  walkPlaying=true; walkSeg=0; walkT=0; walkLast=performance.now();
  const cur = waypoints[0];
  try{ mv.cameraOrbit=cur.orbit; mv.cameraTarget=cur.target; mv.fieldOfView=cur.fov; }catch{}
  updateModeUI();
  updateScrubBar();
  walkRaf = requestAnimationFrame(function loop(now){
    if(!walkPlaying) return;
    const dt=(now - walkLast)/1000 * walkSpeed;
    walkLast=now;
    const c = waypoints[walkSeg];
    const n = waypoints[walkSeg+1];
    if(!c || !n){
      if(walkLoop){ walkSeg=0; walkT=0; walkRaf=requestAnimationFrame(loop); return; }
      stopWalk(); return;
    }
    walkT += dt / n.duration;
    if(walkT >= 1){
      walkT=0; walkSeg+=1;
      if(walkSeg >= waypoints.length-1){
        if(walkLoop){ walkSeg=0; }
        else {
          try{ mv.cameraOrbit=n.orbit; mv.cameraTarget=n.target; mv.fieldOfView=n.fov; }catch{}
          stopWalk(); return;
        }
      }
      walkRaf=requestAnimationFrame(loop); return;
    }
    const u = smooth(walkT);
    const cO=parseOrbit2(c.orbit), nO=parseOrbit2(n.orbit);
    const cT=parseTarget2(c.target), nT=parseTarget2(n.target);
    const cF=parseFloat(c.fov)||45, nF=parseFloat(n.fov)||45;
    const minR=getMinRadius();
    const cR = cO.radius==='auto'? (minR+1) : (parseFloat(String(cO.radius))||minR+1);
    const nR = nO.radius==='auto'? (minR+1) : (parseFloat(String(nO.radius))||minR+1);
    let radius = lerp(cR,nR,u); radius=Math.max(minR,radius);
    const theta=lerpAngle(cO.theta,nO.theta,u), phi=lerp(cO.phi,nO.phi,u);
    const tx=lerp(cT[0],nT[0],u), ty=lerp(cT[1],nT[1],u), tz=lerp(cT[2],nT[2],u);
    const fov=lerp(cF,nF,u);
    try{
      mv.cameraOrbit = theta.toFixed(2)+'deg '+phi.toFixed(2)+'deg '+radius.toFixed(2)+'m';
      mv.cameraTarget = tx.toFixed(3)+' '+ty.toFixed(3)+' '+tz.toFixed(3);
      mv.fieldOfView = fov.toFixed(1)+'deg';
    }catch{}
    walkTitle.textContent = 'Walkthrough ' + (walkSeg+1) + ' / ' + waypoints.length;
    walkSub.textContent = (c.label||('Point '+(walkSeg+1))) + ' → ' + (n.label||('Point '+(walkSeg+2)));
    walkProg.style.width = ((walkSeg + u) / Math.max(1, waypoints.length-1) * 100).toFixed(1) + '%';
    // Sync scrub bar during playback
    const playProg = (walkSeg + u) / Math.max(1, waypoints.length-1);
    if(scrubFill) scrubFill.style.width = (playProg*100)+'%';
    if(scrubThumb) scrubThumb.style.left = 'calc('+playProg*100+'% - 14px)';
    if(scrubLabel) scrubLabel.textContent = (c.label||('Point '+(walkSeg+1)))+' \u2192 '+(n.label||('End'));
    const tDur2 = totalDur(); if(scrubTimeEl) scrubTimeEl.textContent = (playProg*tDur2).toFixed(1)+'s / '+tDur2.toFixed(1)+'s';
    walkRaf=requestAnimationFrame(loop);
  });
}
function stopWalk(){
  if(!walkPlaying) { updateModeUI(); updateScrubBar(); return; }
  walkPlaying=false;
  cancelAnimationFrame(walkRaf);
  updateModeUI();
  updateScrubBar();
}

// Scrub bar
const scrubBar = document.getElementById('scrubbar');
const scrubTrack = document.getElementById('scrubTrack');
const scrubFill = document.getElementById('scrubFill');
const scrubThumb = document.getElementById('scrubThumb');
const scrubLabel = document.getElementById('scrubLabel');
const scrubTimeEl = document.getElementById('scrubTime');
const scrubDotsEl = document.getElementById('scrubDots');

function totalDur(){ return waypoints.reduce((s,w)=>s+(w.duration||0),0); }
function seekToProgress(p){
  p = Math.max(0, Math.min(1, p));
  if(waypoints.length<2) return;
  const tDur = totalDur(); if(tDur<=0) return;
  const abs = p * tDur;
  let cum=0, seg=0;
  for(let i=1;i<waypoints.length;i++){ cum+=waypoints[i].duration; if(abs<=cum){ seg=i-1; break; } if(i===waypoints.length-1) seg=waypoints.length-2; }
  const segStartCum = (()=>{ let s=0; for(let i=1;i<=seg;i++) s+=waypoints[i].duration; return s; })();
  const segDur = waypoints[seg+1]?.duration||1;
  const localT = segDur<=0?0:Math.max(0,Math.min(1,(abs-segStartCum)/segDur));
  const u = localT*localT*(3-2*localT);
  const c=waypoints[seg], n=waypoints[seg+1];
  if(!c||!n) return;
  const cO=parseOrbit2(c.orbit),nO=parseOrbit2(n.orbit);
  const cT=parseTarget2(c.target),nT=parseTarget2(n.target);
  const cF=parseFloat(c.fov)||45,nF=parseFloat(n.fov)||45;
  const minR=getMinRadius();
  const cR=cO.radius==='auto'?(minR+1):(parseFloat(String(cO.radius))||minR+1);
  const nR=nO.radius==='auto'?(minR+1):(parseFloat(String(nO.radius))||minR+1);
  let radius=cR+(nR-cR)*u; radius=Math.max(minR,radius);
  let dTheta=nO.theta-cO.theta; while(dTheta>180)dTheta-=360; while(dTheta<-180)dTheta+=360;
  const theta=cO.theta+dTheta*u, phi=cO.phi+(nO.phi-cO.phi)*u;
  const tx=cT[0]+(nT[0]-cT[0])*u, ty=cT[1]+(nT[1]-cT[1])*u, tz=cT[2]+(nT[2]-cT[2])*u;
  const fov=cF+(nF-cF)*u;
  try{
    mv.cameraOrbit=theta.toFixed(2)+'deg '+phi.toFixed(2)+'deg '+radius.toFixed(2)+'m';
    mv.cameraTarget=tx.toFixed(3)+' '+ty.toFixed(3)+' '+tz.toFixed(3);
    mv.fieldOfView=fov.toFixed(1)+'deg';
    mv.setAttribute('min-camera-orbit','auto auto '+minR.toFixed(2)+'m');
  }catch{}
  if(scrubFill) scrubFill.style.width = (p*100)+'%';
  if(scrubThumb) scrubThumb.style.left = 'calc('+p*100+'% - 14px)';
  if(scrubTimeEl) scrubTimeEl.textContent = (p*tDur).toFixed(1)+'s / '+tDur.toFixed(1)+'s';
  let activeIdx=0; let cc=0;
  for(let i=1;i<waypoints.length;i++){ cc+=waypoints[i].duration; if(abs<=cc+1e-6){ activeIdx=i-1; break; } if(i===waypoints.length-1) activeIdx=waypoints.length-2; }
  if(scrubLabel) scrubLabel.textContent = (waypoints[activeIdx]?.label||('Point '+(activeIdx+1)))+' \u2192 '+(waypoints[activeIdx+1]?.label||'End');
  if(scrubDotsEl){ const dots=scrubDotsEl.children; for(let i=0;i<dots.length;i++) dots[i].className='scrubdot'+(i===activeIdx?' active':''); }
}
function updateScrubBar(){
  const hasPath = waypoints.length>=2;
  if(scrubBar) scrubBar.style.display = hasPath && !walkPlaying ? 'block' : 'none';
  if(scrubDotsEl && hasPath){
    scrubDotsEl.innerHTML='';
    for(let i=0;i<waypoints.length;i++){
      const d=document.createElement('div'); d.className='scrubdot';
      let cum=0; for(let k=1;k<=i;k++) cum+=waypoints[k]?.duration||0;
      const pos=totalDur()>0?cum/totalDur():0;
      d.addEventListener('click',()=>{ stopWalk(); seekToProgress(pos); });
      scrubDotsEl.appendChild(d);
    }
  }
  seekToProgress(0);
}
(function(){
  let scrubDrag=false;
  function seekFromClientX(cx){
    if(!scrubTrack) return;
    const rect=scrubTrack.getBoundingClientRect(); seekToProgress((cx-rect.left)/rect.width);
  }
  if(scrubTrack){
    scrubTrack.addEventListener('pointerdown',(e)=>{
      if(waypoints.length<2) return;
      e.preventDefault();
      try{ scrubTrack.setPointerCapture(e.pointerId); }catch{}
      scrubDrag=true; seekFromClientX(e.clientX);
    });
    window.addEventListener('pointermove',(e)=>{ if(scrubDrag) seekFromClientX(e.clientX); });
    window.addEventListener('pointerup',()=>{ scrubDrag=false; });
  }
})();

updateModeUI();
updateScrubBar();
</script>
</body>
</html>
`;

  zip.file('index.html', html);
  // Add a tiny README
  zip.file(
    'README.txt',
    `Standalone 3D Viewer\n===================\n- Open index.html in a browser (or host the folder).\n- Model: ${modelBlob ? modelFilename + ' (bundled)' : state.modelSrc || '(remote URL — requires network)' }\n- Hotspots: ${state.hotspots.length}\n- Walkthrough points: ${state.cameraPath.length}\n- FPV: click FPV, use WASD/QE/joystick/+/-. Walkthrough is collision-aware (no clip through walls).\n`
  );

  return zip.generateAsync({ type: 'blob' });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
