# Live View 360

A feature-rich 3D model viewer and walkthrough builder built with React, TypeScript, Vite, and [\<model-viewer\>](https://modelviewer.dev/). Import GLB/glTF models, explore them with orbit and first-person cameras, annotate with hotspots, build camera-path walkthroughs, and export a standalone 3D web experience as a ZIP.

---

## Features

### 🏗️ Demo Building

On launch the app loads a **procedurally generated 3-story office building** (GLB, created at runtime — no external asset needed). The demo includes:

- Multi-story glass-window facades on all four sides
- Colored window panels with frames
- Roof slab, entrance door, canopy, and ground plane
- PBR metallic-roughness material with vertex colors

Users can immediately interact with the building using orbit controls before importing their own model.

---

### 🌤️ Skybox & Environment Presets

Choose from **7 realistic HDR environment + skybox image presets** that provide both physically-based lighting and a visible panoramic background:

| Preset | Source | Description |
|--------|--------|-------------|
| None | — | No environment lighting or skybox |
| Studio | Poly Haven | Neutral studio lighting |
| Sunrise | spruit_sunrise | Golden hour field panorama |
| Park | whipple_creek | Overcast woodland environment |
| Clear Sky | kloofendal | Bright blue sky panorama |
| Dusk | kiara_1_dawn | Twilight horizon scene |
| Night | dikhololo_night | Dark starry sky |
| Winter | pillars | Snowy landscape |

Each preset sets both `environment-image` (HDR for PBR reflections) and `skybox-image` (panorama for visible background) together with matching exposure and fallback background color.

#### Custom Panorama Upload

Upload your own **equirectangular 360×180 panorama** image (PNG, JPG, HDR, or EXR) or paste a remote URL. The panorama wraps around the scene as a proper 3D skybox inside model-viewer. Clear it anytime with the "Remove" button or by selecting a preset.

---

### 🎥 Camera System

#### Orbit Mode (Default)

Standard orbit camera with:
- **Pan** — drag to pan across the scene
- **Zoom** — scroll or pinch to zoom in/out
- **Rotate** — drag to orbit around the model
- Auto-rotate option with configurable delay

#### FPV (First-Person View) Mode

Switch to first-person perspective for an immersive walkthrough experience:

- **Human-eye-level default** — camera starts at ~1.7 m height looking forward
- **90° field of view** for natural first-person perspective
- **Virtual joystick** (bottom-left) for smooth look control
  - Horizontal drag = left/right rotation
  - Vertical drag = up/down look
  - Dead zone to prevent accidental drift
  - Phi clamping (5°–170°) to prevent camera flipping
  - Pointer capture for smooth dragging beyond ring bounds
- **WASD / Arrow keys** for keyboard look control
- **Q / E** for vertical camera adjustment
- **+ / -** for zoom in/out
- **Crosshair** overlay for immersion
- **No-clip safety** — collision padding keeps camera outside model geometry
- **Show/Hide toggle** in the Camera panel

#### Camera Settings

- **Field of View** — adjustable FOV
- **Auto-rotate** — continuous rotation with delay
- **Disable zoom** — lock zoom level
- **Camera controls** — enable/disable orbit controls

---

### 📍 Hotspots

Annotate your 3D model with interactive hotspots that provide contextual information.

#### Creation Methods

1. **Pick on Model** — Click the "Pick on Model" button, then click anywhere on the model surface. Uses `positionAndNormalFromPoint` for precise placement along the surface normal.
2. **Manual Coordinates** — Enter position (x y z) and normal vector (nx ny nz) directly.

#### Hotspot Customization

- **6 Icon Types**: pin, dot, info, eye, star, arrow
- **8 Colors**: blue, red, green, amber, purple, cyan, pink, orange
- **Pulse glow** toggle — animated expanding halo effect
- **Title & description** — rich text labels shown on hover/click

#### Focus View

Each hotspot can store a **camera focus pose** (orbit, target, FOV) that the camera flies to when the hotspot is clicked:
- **Capture Focus View** — saves the current camera position
- **Re-capture** — update to a new view
- Clicking the hotspot smoothly transitions the camera to the saved pose
- Clicking an active hotspot again closes its info card

---

### 🚶 Camera Path Walkthrough

Build and play animated camera tours through your 3D scene.

#### Waypoint System

- **Capture Current View** — saves the current camera orbit, target, and FOV as a waypoint
- **Ordered waypoints** — points play in sequence with smooth interpolation
- **Re-order** — move waypoints up/down in the list
- **Re-capture** — update any waypoint's camera pose
- **Go** — jump the camera to any waypoint instantly
- **Duration per point** — configurable time (0.2s–10s) for each segment

#### Playback

- **Play / Stop** — toggle walkthrough playback
- **Smooth interpolation** — smoothstep easing between waypoints with shortest-angle lerp for rotations
- **Loop** — toggle continuous looping
- **Speed control** — 0.25× to 2× playback speed
- **Collision-aware** — camera radius is automatically clamped to stay outside the model geometry during playback, preventing wall/floor clipping

#### Walk Path Scrub

A horizontal **scrub track** (joystick) for seeking to any position along the camera path:
- **Drag** the thumb to scrub through the timeline
- **Click waypoint dots** to jump directly to a segment
- **Progress fill** shows current position
- **Time display** shows current / total duration
- **Segment labels** show current → next waypoint names
- Available as a **floating overlay** in the viewport and as an **inline widget** in the Walkthrough panel

#### Safe Distance Slider

Adjustable collision padding (0–1.5 m) that determines how close the camera can get to the model surface. Increase if you see wall clipping during playback.

---

### 🎬 Animation Controls

For models with embedded animations:
- **Animation selector** — dropdown of available animations
- **Autoplay** — toggle automatic playback on load
- **Crossfade duration** — transition time between animation clips

---

### 🎨 Materials Inspector

View and modify PBR materials on the loaded model:
- Browse all materials detected on the model
- Edit base color, metalness, roughness, and other material properties
- Changes render in real-time in the viewport

---

### 📐 Model Scaling

- **Uniform scale** — scale the model up or down with a slider
- **Preset buttons** — quick scale presets (50%, 100%, 200%)
- **Auto-reframing** — camera automatically adjusts framing after scale change
- **Imperative application** — scale updates are applied directly to model-viewer for instant visual feedback

---

### 🖥️ Viewport Layouts

- **Single** — one viewport (default)
- **Split** — side-by-side dual viewport
- **Quad** — four-viewport layout

Each viewport can be independently navigated with orbit controls.

---

### 📦 Import / Export

#### Import

- **GLB / glTF** — drag-and-drop or file picker for 3D model files
- Demo building loaded by default

#### Export Options

1. **Export Scene JSON** — save the complete editor state (camera, hotspots, walkthrough, materials, skybox) as a JSON file for later import
2. **Export HTML Snippet** — copy a `<model-viewer>` embed code with all current settings
3. **Export 3D Web ZIP** — build a standalone ZIP package:

##### 3D Web ZIP Export

Creates a self-contained ZIP with:
- **`index.html`** — standalone viewer with all features baked in
- **`model.glb`** — the 3D model file (bundled locally)
- **`README.txt`** — usage instructions

The exported `index.html` includes:
- **Orbit / FPV / Walkthrough** mode switching via toolbar
- **Crosshair + virtual joystick + WASD** in FPV mode
- **Hotspot click-to-focus** with labels
- **Walkthrough playback** with progress bar and stop button
- **Scrub track** for seeking to any position along the camera path
- **Collision-aware** camera movement throughout
- **Skybox and environment** lighting preserved
- Works offline — just open `index.html` in any browser

---

### 🏛️ Scene Settings

- **Background color** — solid color fallback when no skybox is set
- **Exposure** — HDR environment exposure multiplier
- **Shadow intensity** — ground shadow darkness
- **Shadow softness** — shadow edge diffusion
- **Auto-rotate** — continuous model rotation
- **Auto-rotate delay** — delay before rotation starts

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + TypeScript |
| Bundler | Vite 7 |
| 3D Viewer | [\<model-viewer\>](https://modelviewer.dev/) v4 |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui |
| ZIP Builder | JSZip |
| State | React Context + useReducer |
| Package Manager | Bun |

---

## Getting Started

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Type-check
./node_modules/.bin/tsc -b --noEmit
```

---

## Keyboard Shortcuts

### Orbit Mode
| Key | Action |
|-----|--------|
| Left drag | Rotate |
| Right drag | Pan |
| Scroll | Zoom |

### FPV Mode
| Key | Action |
|-----|--------|
| W / ↑ | Look up |
| S / ↓ | Look down |
| A / ← | Look left |
| D / → | Look right |
| Q | Move camera up |
| E | Move camera down |
| + / = | Zoom in |
| - | Zoom out |
| Escape | Exit FPV → Orbit |

---

## License

MIT
