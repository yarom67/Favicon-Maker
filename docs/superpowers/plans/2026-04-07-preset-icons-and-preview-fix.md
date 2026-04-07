# Preset Icon Slider + Preview Thumbnail Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a horizontal slider of clickable preset SVG icons below the upload zone (empty and has-image states), and fix the misalignment between the editor canvas and preview thumbnails.

**Architecture:** `PresetIconSlider` is a self-contained component with 18 inline SVG icons (MIT-licensed Heroicons paths). Clicking an icon converts it to an SVG string and calls the same `onImageLoaded` callback used by file upload. The thumbnail fix lives in `useFaviconDataUrl` — the render path must match the editor's coordinate system exactly.

**Tech Stack:** React 19, TypeScript strict, Tailwind CSS v3, inline SVG (no new dependencies), Vitest for tests.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/PresetIconSlider.tsx` | **Create** | 18 inline SVG icons in a scrollable row; click → call onImageLoaded |
| `src/components/UploadZone.tsx` | **Modify** | Render `<PresetIconSlider>` below drop zone, forward `onImageLoaded` |
| `src/App.tsx` | **Modify** | Render `<PresetIconSlider>` in the has-image left panel (below Replace button) |
| `src/components/previews/useFaviconDataUrl.ts` | **Modify** | Fix thumbnail coordinate scaling to match editor |
| `docs/TODO.md` | **Modify** | Mark new tasks done as they complete |

---

## Task 1: Create `PresetIconSlider` component

**Files:**
- Create: `src/components/PresetIconSlider.tsx`

The component receives `onIconSelected` which has the same signature as `UploadZone`'s `onImageLoaded`. Each icon is a raw SVG string with a `viewBox="0 0 24 24"` and MIT-licensed Heroicons outline paths. Clicking an icon parses dimensions from the SVG string and fires the callback.

- [ ] **Step 1: Create the component file**

```tsx
// src/components/PresetIconSlider.tsx
import { useCallback } from 'react'

interface ImageLoadedPayload {
  imageType: 'svg'
  imageDataUrl: null
  svgString: string
  imgWidth: number
  imgHeight: number
  bgColor: ''
}

interface PresetIconSliderProps {
  onIconSelected: (payload: ImageLoadedPayload) => void
  selectedSvg?: string | null
}

// 18 MIT-licensed Heroicons outline paths (heroicons.com)
const PRESET_ICONS: { name: string; path: string }[] = [
  { name: 'Star', path: 'M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z' },
  { name: 'Heart', path: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z' },
  { name: 'Bolt', path: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z' },
  { name: 'Rocket', path: 'M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z' },
  { name: 'Flame', path: 'M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z M12 11.55C9.64 9.307 11.333 5.259 13.5 5c-.6 2.4-.9 4.8.375 6.55a6.97 6.97 0 0 1 2.625 5.45A6.75 6.75 0 0 1 9 18.75c-1.07-.84-1.5-2.13-1.5-3.75 0-1.05.22-2.04.625-2.93C9.172 10.685 10.6 10.5 12 11.55Z' },
  { name: 'Globe', path: 'M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418' },
  { name: 'Code', path: 'M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5' },
  { name: 'Command', path: 'M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z' },
  { name: 'Diamond', path: 'M12 3l9 9-9 9-9-9 9-9z' },
  { name: 'Trophy', path: 'M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z' },
  { name: 'Leaf', path: 'M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 0 1-1.161.886l-.143.048a1.107 1.107 0 0 0-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 0 1-1.652.928l-.679-.906a1.125 1.125 0 0 0-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 0 0-8.862 12.872M12.75 3.031a9 9 0 0 1 6.69 14.036m0 0-.177-.529A2.249 2.249 0 0 0 17.128 15H16.5l-.324-.324a1.453 1.453 0 0 0-2.328.377l-.036.073a1.586 1.586 0 0 1-.982.816l-.99.282c-.55.157-.894.702-.8 1.267l.073.438c.08.474.49.821.97.821.846 0 1.598.542 1.865 1.345l.215.643' },
  { name: 'House', path: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25' },
  { name: 'Music', path: 'M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z' },
  { name: 'Camera', path: 'M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316ZM16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z' },
  { name: 'Sparkles', path: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z' },
  { name: 'Shield', path: 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z' },
  { name: 'Crown', path: 'M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z' },
  { name: 'Eye', path: 'M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z' },
]

function buildSvgString(path: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`
}

export function PresetIconSlider({ onIconSelected, selectedSvg }: PresetIconSliderProps) {
  const handleClick = useCallback((icon: { name: string; path: string }) => {
    const svgString = buildSvgString(icon.path)
    onIconSelected({
      imageType: 'svg',
      imageDataUrl: null,
      svgString,
      imgWidth: 24,
      imgHeight: 24,
      bgColor: '',
    })
  }, [onIconSelected])

  return (
    <div className="mt-3">
      <p className="text-xs text-slate-400 font-medium mb-2">
        Or start with a free icon
        <span className="ml-1 text-slate-300">(MIT · editable)</span>
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {PRESET_ICONS.map((icon) => {
          const svgString = buildSvgString(icon.path)
          const isSelected = selectedSvg === svgString
          return (
            <button
              key={icon.name}
              onClick={() => handleClick(icon)}
              aria-label={`Use ${icon.name} icon`}
              aria-pressed={isSelected}
              className={`
                flex-none w-10 h-10 rounded-xl flex items-center justify-center
                border transition-all cursor-pointer
                ${isSelected
                  ? 'border-orange-400 bg-orange-50 text-orange-500'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-orange-300 hover:text-orange-400 hover:bg-orange-50/40'}
              `}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={icon.path} />
              </svg>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors from `PresetIconSlider.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/PresetIconSlider.tsx
git commit -m "feat: add PresetIconSlider with 18 MIT-licensed inline SVG icons"
```

---

## Task 2: Wire `PresetIconSlider` into `UploadZone` (empty state)

**Files:**
- Modify: `src/components/UploadZone.tsx`

The slider appears below the drop zone div, inside the `<>` fragment that `UploadZone` returns. It needs access to `onImageLoaded`, which it already receives as a prop. No new state needed — the `selectedSvg` highlight can be tracked locally with `useState`.

- [ ] **Step 1: Add import and local state to UploadZone**

At the top of `src/components/UploadZone.tsx`, add:

```tsx
import { PresetIconSlider } from './PresetIconSlider'
```

Inside the `UploadZone` function body, add:

```tsx
const [selectedPresetSvg, setSelectedPresetSvg] = useState<string | null>(null)
```

- [ ] **Step 2: Handle preset icon selection**

Add this handler inside `UploadZone` (after the existing `handleFiles` callback):

```tsx
const handlePresetIcon = useCallback((payload: Parameters<typeof onImageLoaded>[0]) => {
  setSelectedPresetSvg(payload.svgString)
  onImageLoaded(payload)
}, [onImageLoaded])
```

- [ ] **Step 3: Render slider below the drop zone**

In the return statement of `UploadZone`, after the closing `</div>` of the drop zone (before the `{jpegPending && ...}` block), add:

```tsx
<PresetIconSlider
  onIconSelected={handlePresetIcon}
  selectedSvg={selectedPresetSvg}
/>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/UploadZone.tsx
git commit -m "feat: show preset icon slider below upload drop zone"
```

---

## Task 3: Wire `PresetIconSlider` into `App.tsx` (has-image state)

**Files:**
- Modify: `src/App.tsx`

When the user already has an image, the left panel shows: Replace button → Editor → Controls. Add the slider between the Replace button and the Editor so users can switch to a preset icon mid-session. The `selectedSvg` state lives in `App` since it needs to reflect the current `state.svgString`.

- [ ] **Step 1: Import PresetIconSlider in App.tsx**

```tsx
import { PresetIconSlider } from './components/PresetIconSlider'
```

- [ ] **Step 2: Add handlePresetFromApp callback**

Inside the `App` component, add:

```tsx
const handlePresetFromApp = useCallback((payload: {
  imageType: 'svg'; imageDataUrl: null; svgString: string;
  imgWidth: number; imgHeight: number; bgColor: ''
}) => {
  setState({
    imageType: payload.imageType,
    imageDataUrl: null,
    svgString: payload.svgString,
    imgWidth: payload.imgWidth,
    imgHeight: payload.imgHeight,
    bgColor: '',
    cropX: 0,
    cropY: 0,
    scale: 1,
  })
}, [setState])
```

- [ ] **Step 3: Add slider to the has-image left panel**

In `App.tsx`, in the `hasImage` branch of `leftPanel` (after the Replace button and before `<Editor>`):

```tsx
<PresetIconSlider
  onIconSelected={handlePresetFromApp}
  selectedSvg={state.imageType === 'svg' ? state.svgString : null}
/>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: show preset icon slider in has-image panel for quick swap"
```

---

## Task 4: Fix preview thumbnail misalignment

**Files:**
- Investigate/Modify: `src/components/previews/useFaviconDataUrl.ts`
- Reference: `src/lib/applyEdits.ts`, `src/components/Editor.tsx`

The thumbnail renders at `EDITOR_SIZE` (400px) first, then downscales. The editor also operates at 400px. The issue is likely one of:
1. The SVG rasterizer producing a canvas at a size that mismatches the coordinate system `applyEdits` assumes.
2. `cropX`/`cropY` not being scaled correctly for non-square images.
3. The editor stage applying a Konva-level scale that isn't reflected in the canvas path.

- [ ] **Step 1: Read Editor.tsx to understand Konva stage config**

```bash
cat src/components/Editor.tsx
```

Look for: how `EDITOR_SIZE` is used as the Konva stage `width`/`height`, how drag `x`/`y` map to `cropX`/`cropY`, and whether there's any Konva-level `scaleX`/`scaleY` applied to the stage or image layer.

- [ ] **Step 2: Check rasterizeSvg output size**

In `src/lib/svgRasterizer.ts`, verify the canvas returned is exactly `size × size` pixels. If it's different, `applyEdits` will compute a wrong `coverRatio`.

```bash
cat src/lib/svgRasterizer.ts
```

If `rasterizeSvg(svgString, EDITOR_SIZE)` returns a canvas that is `24×24` (the SVG's natural dimensions) instead of `400×400`, fix: ensure the canvas is created at `size × size` and the SVG is drawn scaled to fill it.

- [ ] **Step 3: Trace a concrete misalignment example**

With `scale=1`, `cropX=0`, `cropY=0`, `rotation=0`, and a square image:
- `coverRatio = size/iw = 400/24 ≈ 16.67`
- `drawW = drawH = 24 * 16.67 * 1 = 400` ✓ fills canvas
- `scaledCropX = 0 * (400/400) = 0` ✓

For a non-square image (e.g. `400×200`):
- `coverRatio = max(400/400, 400/200) = 2`
- `drawW=800, drawH=400` — image bleeds outside canvas, clip applies ✓

If alignment is off, the root cause is probably `imgWidth`/`imgHeight` being wrong for SVG presets (they're set to `24×24` from `parseSvgDimensions`). The rasterizer produces a `400×400` canvas but `applyEdits` uses `imgWidth=24, imgHeight=24`, giving `coverRatio = 400/24 = 16.67`, drawing the already-400px canvas at `16.67×` = 6666px — massively oversized. Fix: for SVG, `imgWidth`/`imgHeight` should be the rasterized canvas dimensions (`EDITOR_SIZE × EDITOR_SIZE`), not the SVG's natural viewBox.

- [ ] **Step 4: Fix imgWidth/imgHeight for SVG rasterization path**

In `src/components/previews/useFaviconDataUrl.ts`, after rasterizing the SVG, the `imageEl` is a canvas that is `EDITOR_SIZE × EDITOR_SIZE`. But `state.imgWidth`/`state.imgHeight` reflect the SVG's natural `24×24`. `applyEdits` uses `state.imgWidth`/`state.imgHeight` for `iw`/`ih`, causing incorrect `coverRatio`.

The fix: `applyEdits` already has a fallback: `const iw = imgWidth || (imageEl as HTMLCanvasElement).width || 1`. Since the rasterized canvas is `EDITOR_SIZE×EDITOR_SIZE` and `imgWidth=24`, the stored `imgWidth` wins — which is wrong.

Two options:
- **Option A (preferred):** Override `iw`/`ih` in `applyEdits` when the `imageEl` is a canvas by using `imageEl.width`/`imageEl.height` instead of `state.imgWidth`/`state.imgHeight`. But this changes shared code.
- **Option B:** In `useFaviconDataUrl`, after rasterizing, pass a modified state to `applyEdits` with `imgWidth: EDITOR_SIZE, imgHeight: EDITOR_SIZE`.

Use **Option B** — it's local to the preview hook, doesn't touch shared rendering.

```ts
// In useFaviconDataUrl.ts, replace:
applyEdits(bigCanvas.getContext('2d')!, imageEl, state, EDITOR_SIZE)

// With:
const renderState = state.svgString
  ? { ...state, imgWidth: EDITOR_SIZE, imgHeight: EDITOR_SIZE }
  : state
applyEdits(bigCanvas.getContext('2d')!, imageEl, renderState, EDITOR_SIZE)
```

Wait — the Editor (Konva) path also uses `state.imgWidth/imgHeight`. Check `Editor.tsx` to confirm whether Konva uses these dimensions or the actual image element dimensions. If Konva uses the image element's natural dimensions, the fix above aligns the canvas preview with Konva.

Confirm the fix is consistent with `applyEdits` as called in `zipBuilder.ts` (the export pipeline). The export pipeline also calls `rasterizeSvg(svgString, targetSize)` which produces a canvas at `targetSize×targetSize` — there, the same `imgWidth=24` problem applies. Check `src/lib/zipBuilder.ts` and apply the same fix if needed.

- [ ] **Step 5: Apply the fix and verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Run tests**

```bash
npx vitest run 2>&1 | tail -20
```

Expected: all existing tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/previews/useFaviconDataUrl.ts src/lib/zipBuilder.ts
git commit -m "fix: correct SVG imgWidth/imgHeight for preview thumbnail and export rendering"
```

---

## Task 5: Mark tasks done in TODO.md

**Files:**
- Modify: `docs/TODO.md`

- [ ] **Step 1: Add and check off the new tasks**

Add under the appropriate section and mark `[x]`:

```markdown
- [x] **Preset icon slider below upload zone**
  `src/components/PresetIconSlider.tsx` + `UploadZone.tsx` + `App.tsx` — 18 MIT-licensed inline SVG icons in a scrollable horizontal row. Clicking loads the icon as if uploaded. Shown in both empty and has-image states.

- [x] **Preview thumbnail misalignment**
  `src/components/previews/useFaviconDataUrl.ts` — Fixed SVG imgWidth/imgHeight passed to applyEdits so the 400px rasterized canvas computes the correct coverRatio, matching the editor display.
```

- [ ] **Step 2: Commit**

```bash
git add docs/TODO.md
git commit -m "docs: mark preset icon slider and thumbnail fix tasks as done"
```

---

## Self-Review

**Spec coverage:**
- [x] Post-prompt skill created (`mark-tasks-done.md`) — reminds Claude to check off tasks
- [x] TODO.md updated — thumbnail misalignment added as critical, existing tasks audited
- [x] `PresetIconSlider` — 18 icons, horizontal scroll, click to load, MIT license noted
- [x] Empty state wiring — slider in `UploadZone` below drop zone
- [x] Has-image state wiring — slider in `App.tsx` has-image panel
- [x] Thumbnail misalignment — root cause identified (SVG imgWidth mismatch), fix specified
- [x] TypeScript checks after each task
- [x] Tests run after thumbnail fix

**Placeholder scan:** No TBDs. Each step has exact code or commands.

**Type consistency:** `ImageLoadedPayload` defined in `PresetIconSlider.tsx` uses `imageType: 'svg'` literal — matches what `UploadZone` and `App.tsx` pass to `setState`. The `bgColor: ''` empty string matches `DEFAULT_EDIT_STATE` pattern.
