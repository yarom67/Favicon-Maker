# Favicon Maker — Design Spec
Date: 2026-04-05

## Overview

A single-page web application that lets non-technical users upload a logo, edit it interactively, preview it in real browser/device contexts, and export a ready-to-use favicon ZIP. Everything runs in the browser — no backend, no server.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Build | Vite + React + TypeScript |
| Styling | Tailwind CSS |
| Interactive editor | react-konva (Konva.js) |
| ZIP generation | jszip |
| File download | file-saver |
| ICO generation | ico-endec (browser-native) |
| Fonts | Space Grotesk (headings/display), DM Sans (UI/body) — Google Fonts |

---

## Architecture

**Approach B: React state as source of truth, Konva for editing UX, Canvas 2D API for export.**

- All edit parameters live in React state (`EditState`)
- Konva reads from that state to render the interactive editor
- The export pipeline reads the same state and renders each output size independently using the native Canvas 2D API
- Nothing is computed from the Konva stage itself at export time
- A single shared `applyEdits(ctx, state, size)` function is used by both the export pipeline and thumbnail generation

---

## State Shape

```typescript
interface EditState {
  imageType: 'png' | 'jpeg' | 'svg' | null
  imageDataUrl: string | null      // rasterized data URL for PNG/JPEG
  svgString: string | null         // raw SVG text, kept for per-size rasterization
  cropX: number                    // image center offset X within frame
  cropY: number                    // image center offset Y within frame
  scale: number                    // zoom level (1 = fit to frame)
  rotation: number                 // degrees, range -180 to +180
  bgColor: string                  // hex string, e.g. "#ffffff". Empty string = transparent
  shapeMask: 'square' | 'rounded' | 'circle' | 'none'
}

interface Version {
  id: string
  thumbnail: string                // 64×64 PNG data URL
  state: EditState
}
```

---

## Upload

- Drag-and-drop zone + fallback "browse files" button
- Accepted formats: PNG, JPEG, SVG
- **PNG**: preserve transparency throughout. No background added unless user explicitly picks one.
- **SVG**: store raw SVG string. Rasterize fresh at every render size (editor, export, thumbnails).
- **JPEG**: on upload, immediately show a modal — "Your image doesn't support transparency. Pick a background color before we continue." User must pick a color before proceeding. The chosen color becomes the initial `bgColor`. No silent failures or broken empty states.

---

## Editor (Left Panel — Konva)

The editor displays the image inside a fixed square frame (400×400 on desktop, viewport-width on mobile).

### Interactions
- **Drag**: reposition image within frame (Konva drag)
- **Rotation**: slider (-180° to +180°) + rotation handle on the canvas corner
- **Scale/zoom**: scroll wheel on desktop; pinch-to-zoom on mobile (Konva touch events)
- **Background color**: color picker. Updates `bgColor` in state. Rendered as a filled rect behind the image layer in Konva.
- **Shape mask**: 4 icon tile options — Square, Rounded Square, Circle, None. Applied as a Konva clipping region so the user sees the masked result live.

### Version Snapshot
A version snapshot is captured (and 64×64 thumbnail generated) on every **commit gesture**:
- mouseup / touchend after drag or scale
- Rotation slider release (mouseup / touchend)
- Color picker close
- Shape mask tile click

Snapshots are prepended to the version history strip (newest on left). Max 20 versions — oldest dropped beyond that.

---

## Version History Strip

- Horizontal scrollable strip below the editor in the left panel
- Each entry: 64×64 thumbnail rendered via `applyEdits` at 64px
- Active version shown with an orange ring
- Clicking a thumbnail restores that `EditState` as the current working state

---

## Live Previews (Right Panel)

Four context mocks, each with a label. All update in real time as the user edits.

1. **Browser tab** — realistic mocked browser tab bar with favicon + "My Website" placeholder title
2. **Bookmarks bar** — favicon + "My Site" label as a bookmarks bar entry
3. **iPhone home screen** — iOS-style home screen grid; favicon rendered as app icon (rounded square mask), surrounded by placeholder app icons, blurred wallpaper background
4. **Android home screen** — same concept with Android-style rounded square icons

Each preview reads the current `EditState` and renders the favicon using `applyEdits` at the appropriate display size.

---

## Export Pipeline

Triggered by the "Export ZIP" button. All processing is synchronous on the client.

### Output files
```
favicon-export.zip
├── favicon.ico              (16×16, 32×32, 48×48 bundled via ico-endec)
├── browsers/
│   ├── favicon-16x16.png
│   └── favicon-32x32.png
├── ios/
│   └── apple-touch-icon.png (180×180)
├── android/
│   ├── android-chrome-192x192.png
│   └── android-chrome-512x512.png
└── README.txt
```

### Rendering process
1. For each target size, create an offscreen `<canvas>` at that exact pixel dimension
2. Call `applyEdits(ctx, state, size)` — applies background, shape mask clip, image (rasterizing SVG fresh if needed), crop offset, scale, rotation
3. For `.ico`: generate three canvases (16, 32, 48) → pass PNGs to ico-endec → produce `.ico` blob
4. For PNGs: `canvas.toDataURL('image/png')`
5. Assemble JSZip structure, add `README.txt` verbatim (see below)
6. `FileSaver.saveAs(blob, 'favicon-export.zip')`

### SVG rasterization
For SVG inputs, at each render size: construct a Blob URL from `svgString`, load into an `<img>` element, draw to offscreen canvas at exact target dimensions, then proceed with `applyEdits`.

### README.txt content
```
What's in this zip and what do I do with it?

favicon.ico
Drop this file in the root folder of your website. This is the main favicon
that shows up in browser tabs. Most website builders let you upload this directly
in their settings.

browsers/
Use these PNG files if your website builder asks for a PNG favicon instead of an
.ico file. Use favicon-32x32.png for the best quality.

ios/
This is what shows up when someone saves your website to their iPhone or iPad home
screen. Place it in your website's root folder and add this line to your HTML <head>:
<link rel="apple-touch-icon" href="/apple-touch-icon.png">

android/
Same idea but for Android devices and Progressive Web Apps (PWAs). Add these lines
to your HTML <head>:
<link rel="icon" sizes="192x192" href="/android/android-chrome-192x192.png">
<link rel="icon" sizes="512x512" href="/android/android-chrome-512x512.png">

Not sure where to start? Just use the favicon.ico file. It covers most cases.
```

---

## Layout

### Desktop
Two-column split, fixed height:
- **Left panel** (scrollable): Upload zone (before upload) → Editor + Controls + Version history + Export button (after upload)
- **Right panel** (scrollable): All four preview mocks stacked

Export button: full-width, pinned at bottom of left panel, always visible.

### Mobile
Vertically stacked. Tab toggle fixed at bottom switches between "Edit" and "Preview" views. Konva stage resizes to viewport width. Touch gestures (drag, pinch, rotate handle) feel natural.

---

## Visual Design

| Token | Value |
|---|---|
| Background | `#ffffff` |
| Panel surface | `#f8fafc` |
| Primary text | `#0f172a` |
| Secondary text | `#64748b` |
| Border | `#e2e8f0` |
| Accent / CTA | gradient `from-orange-400 to-orange-500` (#fb923c → #f97316) |
| Border radius | `rounded-2xl` (panels, cards), `rounded-xl` (controls), `rounded-full` (pills) |
| Heading font | Space Grotesk (Google Fonts) |
| Body/UI font | DM Sans (Google Fonts) |

**Tone:** Clean, professional, straightforward. Nothing intimidating. No jargon. Generous whitespace. Rounded corners throughout for a friendly but polished feel.

**Upload zone:** Large, centered, dashed border with subtle orange hover tint. Icon + "Drop your logo here" + "or browse files" link.

**Shape mask picker:** 4 rounded tile buttons showing actual shape previews, not a dropdown.

**Export button:** Full-width, orange gradient, large (`py-4`), prominent label "Export ZIP".

---

## File Structure

```
src/
  components/
    UploadZone.tsx
    Editor.tsx
    Controls.tsx
    VersionHistory.tsx
    ExportButton.tsx
    previews/
      BrowserTabPreview.tsx
      BookmarksPreview.tsx
      iOSPreview.tsx
      AndroidPreview.tsx
  lib/
    applyEdits.ts       — shared fn: draws edit state onto any canvas ctx at any size
    svgRasterizer.ts    — SVG string → ImageBitmap at target px dimensions
    icoGenerator.ts     — ico-endec wrapper: 3 canvases → .ico blob
    zipBuilder.ts       — assembles JSZip tree + triggers FileSaver download
  hooks/
    useEditState.ts     — EditState, setters, version history (capture + restore)
  App.tsx
  main.tsx
  index.css
```

---

## Out of Scope

- No backend / server of any kind
- No user accounts or saved projects (sessions are ephemeral)
- No undo/redo stack (replaced by version history thumbnails)
- No batch upload
- No custom export size configuration
