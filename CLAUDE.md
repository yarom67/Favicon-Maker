# Favicon Maker — CLAUDE.md

## What this is

A fully client-side SPA that lets users upload a logo (PNG/JPEG/SVG), edit it interactively, preview it in realistic browser/device contexts, and export a production-ready favicon ZIP. No backend. Everything runs in the browser.

## Commands

```bash
npm run dev       # start dev server
npm run build     # TypeScript check + Vite production build
npm run preview   # preview production build
npx vitest run    # run all tests
npx tsc --noEmit  # type-check only
```

## Architecture

**Core principle:** React state is the single source of truth. Konva reads from state for the interactive editor. The export pipeline reads from the same state independently using the native Canvas 2D API. Nothing is computed from the Konva stage at export time.

**The shared rendering core:** `src/lib/applyEdits.ts` — `applyEdits(ctx, imageEl, state, size)` is called by both the export pipeline and the preview thumbnails. If you change how rendering works, change it here.

**Coordinate system for crop:** `cropX`/`cropY` are pixel offsets from canvas center in editor-space (400px frame). When exporting at a different size, they are scaled by `targetSize / EDITOR_SIZE`. Don't store them as absolute pixel positions from the top-left.

**Scale definition:** `scale = 1.0` means the image covers the canvas exactly (cover behavior). It's a zoom multiplier on top of the cover ratio, not a raw pixel size.

## File map

```
src/
  types.ts                    — EditState, Version interfaces, DEFAULT_EDIT_STATE
  hooks/
    useEditState.ts           — all state + version history (useRef pattern for stateRef)
  lib/
    applyEdits.ts             — SHARED rendering core: bg fill, clip, draw with transforms
    svgRasterizer.ts          — SVG string → HTMLCanvasElement at target size
    icoGenerator.ts           — custom PNG-in-ICO binary encoder, no external lib
    zipBuilder.ts             — renders all export sizes, assembles JSZip, triggers FileSaver
  components/
    UploadZone.tsx            — drag-drop, JPEG detection → color modal before proceeding
    Editor.tsx                — react-konva stage: drag, scroll-zoom, pinch-zoom
    Controls.tsx              — rotation slider, bg color picker, shape mask tiles
    VersionHistory.tsx        — thumbnail strip, click to restore
    ExportButton.tsx          — orange gradient button, disabled without image
    previews/
      useFaviconDataUrl.ts    — debounced hook (150ms) that renders favicon at a given size
      BrowserTabPreview.tsx   — 32px
      BookmarksPreview.tsx    — 16px
      iOSPreview.tsx          — 180px
      AndroidPreview.tsx      — 192px
  App.tsx                     — two-panel desktop layout, tab-toggle mobile
```

## Key behaviors to preserve

**JPEG uploads must always show the background color modal.** There is no path to proceed without picking a color. The `UploadZone` sets `jpegPending` state — only the "Continue" button calls `onImageLoaded`.

**PNG and SVG must preserve transparency.** `bgColor: ''` (empty string) means transparent. `applyEdits` only calls `fillRect` when `bgColor` is truthy. Never default to white for these types.

**SVG dimensions are parsed from the markup** (width/height attributes, then viewBox) — not hardcoded. See `parseSvgDimensions` in `UploadZone.tsx`. This affects the cover-ratio calculation in `applyEdits`.

**Version history** captures a 64×64 thumbnail on every commit gesture (drag end, rotation release, color picker close, shape tile click). Max 20 entries, oldest dropped with `slice(0, 20)` after prepend.

## Tech stack

- Vite + React 18 + TypeScript (strict + verbatimModuleSyntax)
- Tailwind CSS v3 — Space Grotesk (display/headings), DM Sans (body)
- react-konva + konva for interactive editor
- jszip + file-saver for export
- Custom ICO encoder (no external ico package)
- Vitest + jsdom + vitest-canvas-mock + @testing-library/react

## Testing

Tests live in `src/**/__tests__/`. Run with `npx vitest run`.

Canvas operations are mocked via `vitest-canvas-mock` (loaded in `src/test/setup.ts`). Konva components have no unit tests — test visually via the dev server.

When writing tests for async browser APIs (FileReader, Image.onload), use microtask-based mocks (`Promise.resolve().then(...)`) rather than fake timers — `userEvent` relies on real timers internally.

## Design tokens

| Token | Value |
|---|---|
| Primary text | `text-slate-900` |
| Secondary text | `text-slate-500` / `text-slate-400` |
| Borders | `border-slate-100` / `border-slate-200` |
| CTA / accent | `bg-gradient-to-r from-orange-400 to-orange-500` |
| Panel bg | `bg-white` / `bg-slate-50/50` |
| Border radius | `rounded-2xl` panels, `rounded-xl` controls |

## Export ZIP structure

```
favicon-export.zip
├── favicon.ico           (16×16 + 32×32 + 48×48 bundled, PNG-in-ICO format)
├── browsers/
│   ├── favicon-16x16.png
│   └── favicon-32x32.png
├── ios/
│   └── apple-touch-icon.png  (180×180)
├── android/
│   ├── android-chrome-192x192.png
│   └── android-chrome-512x512.png
└── README.txt
```
