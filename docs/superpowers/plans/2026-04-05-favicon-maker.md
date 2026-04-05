# Favicon Maker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully client-side React SPA that lets users upload a logo, edit it interactively (crop/rotate/mask/bg), preview it in real browser/device contexts, and export a favicon ZIP.

**Architecture:** React state holds all edit parameters as `EditState`. A `react-konva` stage reads from that state to render the interactive editor. A separate Canvas 2D export pipeline reads the same state to render each output size independently — nothing is computed from the Konva stage at export time. A single `applyEdits(ctx, imageEl, state, size)` function is the shared rendering core used by both the export pipeline and version thumbnail generation.

**Tech Stack:** Vite + React 18 + TypeScript + Tailwind CSS v3, react-konva, jszip, file-saver, Vitest + jsdom + vitest-canvas-mock for tests. Custom ICO encoder (no external package needed — format is simple enough to implement directly).

---

## File Map

```
src/
  types.ts                              — EditState, Version interfaces
  hooks/
    useEditState.ts                     — all state + version history logic
    __tests__/useEditState.test.ts
  lib/
    applyEdits.ts                       — shared canvas rendering fn (editor + export)
    svgRasterizer.ts                    — SVG string → HTMLCanvasElement at target size
    icoGenerator.ts                     — 3 canvases → .ico Blob (custom binary encoder)
    zipBuilder.ts                       — assembles JSZip tree, triggers FileSaver download
    __tests__/applyEdits.test.ts
    __tests__/svgRasterizer.test.ts
    __tests__/icoGenerator.test.ts
    __tests__/zipBuilder.test.ts
  components/
    UploadZone.tsx                      — drag-drop zone + JPEG modal
    Editor.tsx                          — react-konva interactive canvas
    Controls.tsx                        — rotation slider, bg picker, shape mask tiles
    VersionHistory.tsx                  — horizontal thumbnail strip
    ExportButton.tsx                    — wires export pipeline, shows loading state
    previews/
      BrowserTabPreview.tsx
      BookmarksPreview.tsx
      iOSPreview.tsx
      AndroidPreview.tsx
    __tests__/UploadZone.test.tsx
    __tests__/Controls.test.tsx
    __tests__/VersionHistory.test.tsx
    __tests__/ExportButton.test.tsx
  App.tsx                               — layout, tab state for mobile
  main.tsx
  index.css                             — font imports + base Tailwind
```

---

## Task 1: Project Setup

**Files:**
- Create: `package.json` (via npm init)
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`

- [ ] **Step 1: Scaffold project with Vite**

```bash
cd "/Users/yaromganor/Desktop/Claude Code/Favicon maker"
npm create vite@latest . -- --template react-ts
```

- [ ] **Step 2: Install all dependencies**

```bash
npm install
npm install konva react-konva jszip file-saver
npm install -D @types/file-saver vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest-canvas-mock
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p --ts
```

- [ ] **Step 3: Configure Tailwind** — replace `tailwind.config.ts` with:

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      colors: {
        accent: {
          from: '#fb923c',
          to: '#f97316',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 4: Configure Vite + Vitest** — replace `vite.config.ts` with:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 5: Create test setup file** — create `src/test/setup.ts`:

```ts
import 'vitest-canvas-mock'
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Add fonts and base styles** — replace `src/index.css` with:

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; }
body { font-family: 'DM Sans', sans-serif; }
h1, h2, h3, h4 { font-family: 'Space Grotesk', sans-serif; }
```

- [ ] **Step 7: Replace `index.html` head section** — ensure it has:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Favicon Maker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Replace `src/App.tsx` with a smoke-test stub**

```tsx
export default function App() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <h1 className="font-display text-2xl p-8">Favicon Maker</h1>
    </div>
  )
}
```

- [ ] **Step 9: Verify it runs**

```bash
npm run dev
```
Expected: browser opens, "Favicon Maker" heading renders in Space Grotesk.

- [ ] **Step 10: Commit**

```bash
git init
git add -A
git commit -m "feat: project scaffold — Vite + React + Tailwind + Vitest"
```

---

## Task 2: Types & useEditState Hook

**Files:**
- Create: `src/types.ts`
- Create: `src/hooks/useEditState.ts`
- Create: `src/hooks/__tests__/useEditState.test.ts`

- [ ] **Step 1: Write `src/types.ts`**

```ts
export type ShapeMask = 'square' | 'rounded' | 'circle' | 'none'
export type ImageType = 'png' | 'jpeg' | 'svg'

export interface EditState {
  imageType: ImageType | null
  imageDataUrl: string | null    // data URL for PNG/JPEG; null for SVG
  svgString: string | null       // raw SVG markup; null for raster
  imgWidth: number               // natural px width (SVG defaults to 512)
  imgHeight: number              // natural px height (SVG defaults to 512)
  cropX: number                  // center offset X in editor-frame pixels (editor = 400px)
  cropY: number                  // center offset Y in editor-frame pixels
  scale: number                  // zoom multiplier; 1.0 = image covers canvas
  rotation: number               // degrees clockwise
  bgColor: string                // hex string e.g. "#ffffff"; "" = transparent
  shapeMask: ShapeMask
}

export interface Version {
  id: string
  thumbnail: string              // 64×64 PNG data URL
  state: EditState
}

export const DEFAULT_EDIT_STATE: EditState = {
  imageType: null,
  imageDataUrl: null,
  svgString: null,
  imgWidth: 0,
  imgHeight: 0,
  cropX: 0,
  cropY: 0,
  scale: 1,
  rotation: 0,
  bgColor: '',
  shapeMask: 'none',
}
```

- [ ] **Step 2: Write the failing tests** — create `src/hooks/__tests__/useEditState.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useEditState } from '../useEditState'
import { DEFAULT_EDIT_STATE } from '../../types'

describe('useEditState', () => {
  it('initialises with default state and empty history', () => {
    const { result } = renderHook(() => useEditState())
    expect(result.current.state).toEqual(DEFAULT_EDIT_STATE)
    expect(result.current.versions).toHaveLength(0)
  })

  it('setState updates the current state', () => {
    const { result } = renderHook(() => useEditState())
    act(() => result.current.setState({ rotation: 45 }))
    expect(result.current.state.rotation).toBe(45)
  })

  it('addVersion prepends a new version and stores a snapshot', () => {
    const { result } = renderHook(() => useEditState())
    act(() => {
      result.current.setState({ rotation: 90 })
      result.current.addVersion('data:image/png;base64,abc123')
    })
    expect(result.current.versions).toHaveLength(1)
    expect(result.current.versions[0].state.rotation).toBe(90)
    expect(result.current.versions[0].thumbnail).toBe('data:image/png;base64,abc123')
  })

  it('addVersion drops oldest when versions exceed 20', () => {
    const { result } = renderHook(() => useEditState())
    act(() => {
      for (let i = 0; i < 21; i++) {
        result.current.addVersion(`data:image/png;base64,v${i}`)
      }
    })
    expect(result.current.versions).toHaveLength(20)
    expect(result.current.versions[19].thumbnail).toBe('data:image/png;base64,v0')
  })

  it('restoreVersion sets state to the version snapshot', () => {
    const { result } = renderHook(() => useEditState())
    let versionId: string
    act(() => {
      result.current.setState({ rotation: 30 })
      result.current.addVersion('data:image/png;base64,snap')
      versionId = result.current.versions[0].id
    })
    act(() => {
      result.current.setState({ rotation: 99 })
    })
    act(() => result.current.restoreVersion(versionId))
    expect(result.current.state.rotation).toBe(30)
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npx vitest run src/hooks/__tests__/useEditState.test.ts
```
Expected: FAIL — `useEditState` not found.

- [ ] **Step 4: Write `src/hooks/useEditState.ts`**

```ts
import { useState, useCallback } from 'react'
import { EditState, Version, DEFAULT_EDIT_STATE } from '../types'

interface UseEditStateReturn {
  state: EditState
  setState: (partial: Partial<EditState>) => void
  versions: Version[]
  addVersion: (thumbnail: string) => void
  restoreVersion: (id: string) => void
  resetState: () => void
}

export function useEditState(): UseEditStateReturn {
  const [state, setStateInternal] = useState<EditState>(DEFAULT_EDIT_STATE)
  const [versions, setVersions] = useState<Version[]>([])

  const setState = useCallback((partial: Partial<EditState>) => {
    setStateInternal(prev => ({ ...prev, ...partial }))
  }, [])

  const addVersion = useCallback((thumbnail: string) => {
    setStateInternal(currentState => {
      const newVersion: Version = {
        id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        thumbnail,
        state: { ...currentState },
      }
      setVersions(prev => {
        const next = [newVersion, ...prev]
        return next.length > 20 ? next.slice(0, 20) : next
      })
      return currentState
    })
  }, [])

  const restoreVersion = useCallback((id: string) => {
    setVersions(prev => {
      const found = prev.find(v => v.id === id)
      if (found) setStateInternal({ ...found.state })
      return prev
    })
  }, [])

  const resetState = useCallback(() => {
    setStateInternal(DEFAULT_EDIT_STATE)
    setVersions([])
  }, [])

  return { state, setState, versions, addVersion, restoreVersion, resetState }
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx vitest run src/hooks/__tests__/useEditState.test.ts
```
Expected: 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/hooks/useEditState.ts src/hooks/__tests__/useEditState.test.ts src/test/setup.ts
git commit -m "feat: EditState types and useEditState hook with version history"
```

---

## Task 3: applyEdits Function

**Files:**
- Create: `src/lib/applyEdits.ts`
- Create: `src/lib/__tests__/applyEdits.test.ts`

- [ ] **Step 1: Write failing tests** — create `src/lib/__tests__/applyEdits.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { applyEdits } from '../applyEdits'
import { DEFAULT_EDIT_STATE } from '../../types'

function makeCanvas(size: number) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  return canvas
}

function makeImageEl(w: number, h: number): HTMLCanvasElement {
  const c = makeCanvas(Math.max(w, h))
  c.width = w
  c.height = h
  return c
}

describe('applyEdits', () => {
  it('clears the canvas before drawing', () => {
    const canvas = makeCanvas(64)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'red'
    ctx.fillRect(0, 0, 64, 64)

    const img = makeImageEl(64, 64)
    applyEdits(ctx, img, { ...DEFAULT_EDIT_STATE, imageType: 'png', imgWidth: 64, imgHeight: 64 }, 64)

    // After applyEdits with transparent bg, pixels should not be solid red
    const data = ctx.getImageData(0, 0, 1, 1).data
    expect(data[0]).not.toBe(255) // not red
  })

  it('fills background color when bgColor is set', () => {
    const canvas = makeCanvas(64)
    const ctx = canvas.getContext('2d')!
    const img = makeImageEl(64, 64)

    applyEdits(ctx, img, {
      ...DEFAULT_EDIT_STATE,
      imageType: 'png',
      imgWidth: 64,
      imgHeight: 64,
      bgColor: '#ff0000',
    }, 64)

    expect(ctx.fillStyle).toBe('#ff0000')
  })

  it('does not throw for all shapeMask values', () => {
    const canvas = makeCanvas(64)
    const ctx = canvas.getContext('2d')!
    const img = makeImageEl(64, 64)
    const base = { ...DEFAULT_EDIT_STATE, imageType: 'png' as const, imgWidth: 64, imgHeight: 64 }

    for (const mask of ['square', 'rounded', 'circle', 'none'] as const) {
      expect(() => applyEdits(ctx, img, { ...base, shapeMask: mask }, 64)).not.toThrow()
    }
  })

  it('does not throw with rotation applied', () => {
    const canvas = makeCanvas(64)
    const ctx = canvas.getContext('2d')!
    const img = makeImageEl(64, 64)

    expect(() => applyEdits(ctx, img, {
      ...DEFAULT_EDIT_STATE,
      imageType: 'png',
      imgWidth: 64,
      imgHeight: 64,
      rotation: 45,
    }, 64)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/lib/__tests__/applyEdits.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/lib/applyEdits.ts`**

```ts
import { EditState } from '../types'

const EDITOR_SIZE = 400

function applyClipPath(
  ctx: CanvasRenderingContext2D,
  size: number,
  mask: EditState['shapeMask']
): void {
  ctx.beginPath()
  if (mask === 'square') {
    ctx.rect(0, 0, size, size)
    ctx.clip()
  } else if (mask === 'rounded') {
    const r = size * 0.2
    ctx.roundRect(0, 0, size, size, r)
    ctx.clip()
  } else if (mask === 'circle') {
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.clip()
  }
  // 'none' — no clip, transparency preserved naturally
}

export function applyEdits(
  ctx: CanvasRenderingContext2D,
  imageEl: HTMLImageElement | HTMLCanvasElement,
  state: EditState,
  size: number
): void {
  const { bgColor, cropX, cropY, scale, rotation, shapeMask, imgWidth, imgHeight } = state

  ctx.clearRect(0, 0, size, size)
  ctx.save()

  // Apply clip path
  applyClipPath(ctx, size, shapeMask)

  // Fill background
  if (bgColor) {
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, size, size)
  }

  // Compute draw dimensions: "cover" the canvas, then apply user scale
  const iw = imgWidth || (imageEl as HTMLCanvasElement).width || 1
  const ih = imgHeight || (imageEl as HTMLCanvasElement).height || 1
  const coverRatio = Math.max(size / iw, size / ih)
  const drawW = iw * coverRatio * scale
  const drawH = ih * coverRatio * scale

  // Scale crop offsets from editor coords to target size
  const scaleFactor = size / EDITOR_SIZE
  const scaledCropX = cropX * scaleFactor
  const scaledCropY = cropY * scaleFactor

  // Draw image with transform
  ctx.save()
  ctx.translate(size / 2 + scaledCropX, size / 2 + scaledCropY)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(imageEl, -drawW / 2, -drawH / 2, drawW, drawH)
  ctx.restore()

  ctx.restore()
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/lib/__tests__/applyEdits.test.ts
```
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/applyEdits.ts src/lib/__tests__/applyEdits.test.ts
git commit -m "feat: applyEdits core rendering function"
```

---

## Task 4: SVG Rasterizer

**Files:**
- Create: `src/lib/svgRasterizer.ts`
- Create: `src/lib/__tests__/svgRasterizer.test.ts`

- [ ] **Step 1: Write failing tests** — create `src/lib/__tests__/svgRasterizer.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { rasterizeSvg } from '../svgRasterizer'

describe('rasterizeSvg', () => {
  it('returns a canvas of the requested size', async () => {
    const svgString = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>'

    // Mock Image load to fire onload immediately
    const origImage = global.Image
    global.Image = class {
      onload: (() => void) | null = null
      src = ''
      width = 100
      height = 100
      set src(val: string) {
        this._src = val
        setTimeout(() => this.onload?.(), 0)
      }
      get src() { return this._src }
      private _src = ''
    } as unknown as typeof Image

    const canvas = await rasterizeSvg(svgString, 64)
    expect(canvas.width).toBe(64)
    expect(canvas.height).toBe(64)

    global.Image = origImage
  })

  it('rejects on invalid SVG (image error)', async () => {
    const origImage = global.Image
    global.Image = class {
      onerror: (() => void) | null = null
      set src(_: string) {
        setTimeout(() => this.onerror?.(), 0)
      }
    } as unknown as typeof Image

    await expect(rasterizeSvg('not valid svg', 64)).rejects.toThrow()
    global.Image = origImage
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/lib/__tests__/svgRasterizer.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Write `src/lib/svgRasterizer.ts`**

```ts
export function rasterizeSvg(svgString: string, size: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(canvas)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Failed to rasterize SVG at size ${size}`))
    }

    img.src = url
  })
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/lib/__tests__/svgRasterizer.test.ts
```
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/svgRasterizer.ts src/lib/__tests__/svgRasterizer.test.ts
git commit -m "feat: SVG rasterizer for per-size export rendering"
```

---

## Task 5: ICO Generator

**Files:**
- Create: `src/lib/icoGenerator.ts`
- Create: `src/lib/__tests__/icoGenerator.test.ts`

The ICO format: 6-byte header + N×16-byte directory entries + raw PNG data for each size.

- [ ] **Step 1: Write failing tests** — create `src/lib/__tests__/icoGenerator.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateIco } from '../icoGenerator'

function makeCanvas(size: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  return c
}

describe('generateIco', () => {
  it('returns a Blob', async () => {
    const blob = await generateIco([makeCanvas(16), makeCanvas(32), makeCanvas(48)])
    expect(blob).toBeInstanceOf(Blob)
  })

  it('blob has correct ICO header signature', async () => {
    const blob = await generateIco([makeCanvas(16)])
    const buffer = await blob.arrayBuffer()
    const view = new DataView(buffer)
    // Bytes 0-1: reserved = 0
    expect(view.getUint16(0, true)).toBe(0)
    // Bytes 2-3: type = 1 (ICO)
    expect(view.getUint16(2, true)).toBe(1)
    // Bytes 4-5: count = 1
    expect(view.getUint16(4, true)).toBe(1)
  })

  it('directory entry count matches number of canvases', async () => {
    const blob = await generateIco([makeCanvas(16), makeCanvas(32), makeCanvas(48)])
    const buffer = await blob.arrayBuffer()
    const view = new DataView(buffer)
    expect(view.getUint16(4, true)).toBe(3)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/lib/__tests__/icoGenerator.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Write `src/lib/icoGenerator.ts`**

```ts
function canvasToPngArrayBuffer(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) return reject(new Error('Canvas toBlob failed'))
      blob.arrayBuffer().then(resolve).catch(reject)
    }, 'image/png')
  })
}

export async function generateIco(canvases: HTMLCanvasElement[]): Promise<Blob> {
  const pngBuffers = await Promise.all(canvases.map(canvasToPngArrayBuffer))

  const HEADER_SIZE = 6
  const DIR_ENTRY_SIZE = 16
  const totalDirSize = DIR_ENTRY_SIZE * canvases.length
  const totalSize = HEADER_SIZE + totalDirSize + pngBuffers.reduce((sum, b) => sum + b.byteLength, 0)

  const buffer = new ArrayBuffer(totalSize)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  // ICO header
  view.setUint16(0, 0, true)                       // reserved
  view.setUint16(2, 1, true)                       // type = ICO
  view.setUint16(4, canvases.length, true)         // image count

  // Directory entries
  let dataOffset = HEADER_SIZE + totalDirSize
  canvases.forEach((canvas, i) => {
    const dirBase = HEADER_SIZE + i * DIR_ENTRY_SIZE
    const sz = canvas.width
    view.setUint8(dirBase + 0, sz >= 256 ? 0 : sz) // width (0 = 256)
    view.setUint8(dirBase + 1, sz >= 256 ? 0 : sz) // height
    view.setUint8(dirBase + 2, 0)                   // color count (0 = truecolor)
    view.setUint8(dirBase + 3, 0)                   // reserved
    view.setUint16(dirBase + 4, 1, true)            // planes
    view.setUint16(dirBase + 6, 32, true)           // bit depth
    view.setUint32(dirBase + 8, pngBuffers[i].byteLength, true)  // data size
    view.setUint32(dirBase + 12, dataOffset, true)               // data offset
    dataOffset += pngBuffers[i].byteLength
  })

  // PNG data
  let writeOffset = HEADER_SIZE + totalDirSize
  pngBuffers.forEach(png => {
    bytes.set(new Uint8Array(png), writeOffset)
    writeOffset += png.byteLength
  })

  return new Blob([buffer], { type: 'image/x-icon' })
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/lib/__tests__/icoGenerator.test.ts
```
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/icoGenerator.ts src/lib/__tests__/icoGenerator.test.ts
git commit -m "feat: browser-native ICO encoder (PNG-in-ICO format)"
```

---

## Task 6: ZIP Builder

**Files:**
- Create: `src/lib/zipBuilder.ts`
- Create: `src/lib/__tests__/zipBuilder.test.ts`

- [ ] **Step 1: Write failing tests** — create `src/lib/__tests__/zipBuilder.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { buildFaviconZip } from '../zipBuilder'
import { DEFAULT_EDIT_STATE } from '../../types'

// Mock FileSaver
vi.mock('file-saver', () => ({ saveAs: vi.fn() }))

function makeCanvas(size: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  return c
}

describe('buildFaviconZip', () => {
  it('calls saveAs with a Blob named favicon-export.zip', async () => {
    const { saveAs } = await import('file-saver')
    const state = {
      ...DEFAULT_EDIT_STATE,
      imageType: 'png' as const,
      imageDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      imgWidth: 64,
      imgHeight: 64,
    }

    await buildFaviconZip(state)

    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'favicon-export.zip')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/lib/__tests__/zipBuilder.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Write `src/lib/zipBuilder.ts`**

```ts
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { EditState } from '../types'
import { applyEdits } from './applyEdits'
import { rasterizeSvg } from './svgRasterizer'
import { generateIco } from './icoGenerator'

const README = `What's in this zip and what do I do with it?

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

Not sure where to start? Just use the favicon.ico file. It covers most cases.`

async function getImageEl(state: EditState, size: number): Promise<HTMLImageElement | HTMLCanvasElement> {
  if (state.svgString) {
    return rasterizeSvg(state.svgString, size)
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = state.imageDataUrl!
  })
}

function renderToCanvas(imageEl: HTMLImageElement | HTMLCanvasElement, state: EditState, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  applyEdits(ctx, imageEl, state, size)
  return canvas
}

function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png')
}

function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.split(',')[1]
}

export async function buildFaviconZip(state: EditState): Promise<void> {
  // Build a full-size image element once per SVG (avoid repeated loads)
  // For raster: load once and reuse; SVG is rasterized per-size for sharpness
  const sizes = {
    ico: [16, 32, 48],
    browsers16: 16,
    browsers32: 32,
    ios: 180,
    android192: 192,
    android512: 512,
  }

  async function renderSize(size: number): Promise<HTMLCanvasElement> {
    const imgEl = await getImageEl(state, size)
    return renderToCanvas(imgEl, state, size)
  }

  const [c16, c32, c48, c180, c192, c512] = await Promise.all([
    renderSize(16),
    renderSize(32),
    renderSize(48),
    renderSize(180),
    renderSize(192),
    renderSize(512),
  ])

  const icoBlob = await generateIco([c16, c32, c48])

  const zip = new JSZip()
  zip.file('favicon.ico', icoBlob)
  zip.file('README.txt', README)

  const browsers = zip.folder('browsers')!
  browsers.file('favicon-16x16.png', dataUrlToBase64(canvasToDataUrl(c16)), { base64: true })
  browsers.file('favicon-32x32.png', dataUrlToBase64(canvasToDataUrl(c32)), { base64: true })

  const ios = zip.folder('ios')!
  ios.file('apple-touch-icon.png', dataUrlToBase64(canvasToDataUrl(c180)), { base64: true })

  const android = zip.folder('android')!
  android.file('android-chrome-192x192.png', dataUrlToBase64(canvasToDataUrl(c192)), { base64: true })
  android.file('android-chrome-512x512.png', dataUrlToBase64(canvasToDataUrl(c512)), { base64: true })

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  saveAs(blob, 'favicon-export.zip')
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/lib/__tests__/zipBuilder.test.ts
```
Expected: 1 test PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/zipBuilder.ts src/lib/__tests__/zipBuilder.test.ts
git commit -m "feat: ZIP builder — assembles all favicon sizes and triggers download"
```

---

## Task 7: Upload Zone Component

**Files:**
- Create: `src/components/UploadZone.tsx`
- Create: `src/components/__tests__/UploadZone.test.tsx`

- [ ] **Step 1: Write failing tests** — create `src/components/__tests__/UploadZone.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { UploadZone } from '../UploadZone'

describe('UploadZone', () => {
  it('renders the drop zone', () => {
    render(<UploadZone onImageLoaded={vi.fn()} />)
    expect(screen.getByText(/drop your logo/i)).toBeInTheDocument()
  })

  it('calls onImageLoaded with PNG file data', async () => {
    const onImageLoaded = vi.fn()
    render(<UploadZone onImageLoaded={onImageLoaded} />)

    const file = new File(['fake-png'], 'logo.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]')!
    await userEvent.upload(input as HTMLElement, file)

    // onImageLoaded will be called after FileReader loads — just check it was called
    await vi.waitFor(() => expect(onImageLoaded).toHaveBeenCalled(), { timeout: 1000 })
  })

  it('shows JPEG background color modal for JPEG files', async () => {
    render(<UploadZone onImageLoaded={vi.fn()} />)

    const file = new File(['fake-jpeg'], 'photo.jpg', { type: 'image/jpeg' })
    const input = document.querySelector('input[type="file"]')!
    await userEvent.upload(input as HTMLElement, file)

    await vi.waitFor(() =>
      expect(screen.getByText(/doesn't support transparency/i)).toBeInTheDocument(),
      { timeout: 1000 }
    )
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/components/__tests__/UploadZone.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Write `src/components/UploadZone.tsx`**

```tsx
import React, { useRef, useState, useCallback } from 'react'
import { EditState, ImageType } from '../types'

interface ImageLoadedPayload {
  imageType: ImageType
  imageDataUrl: string | null
  svgString: string | null
  imgWidth: number
  imgHeight: number
  bgColor: string
}

interface UploadZoneProps {
  onImageLoaded: (payload: ImageLoadedPayload) => void
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.src = dataUrl
  })
}

export function UploadZone({ onImageLoaded }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [jpegPending, setJpegPending] = useState<{ dataUrl: string; width: number; height: number } | null>(null)
  const [bgColor, setBgColor] = useState('#ffffff')

  const processFile = useCallback(async (file: File) => {
    const type = file.type

    if (type === 'image/svg+xml') {
      const text = await file.text()
      onImageLoaded({ imageType: 'svg', imageDataUrl: null, svgString: text, imgWidth: 512, imgHeight: 512, bgColor: '' })
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target!.result as string
      const { width, height } = await getImageDimensions(dataUrl)
      if (type === 'image/jpeg') {
        setJpegPending({ dataUrl, width, height })
      } else {
        onImageLoaded({ imageType: 'png', imageDataUrl: dataUrl, svgString: null, imgWidth: width, imgHeight: height, bgColor: '' })
      }
    }
    reader.readAsDataURL(file)
  }, [onImageLoaded])

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml']
    if (!allowed.includes(file.type)) return
    processFile(file)
  }, [processFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const confirmJpegBg = useCallback(() => {
    if (!jpegPending) return
    onImageLoaded({
      imageType: 'jpeg',
      imageDataUrl: jpegPending.dataUrl,
      svgString: null,
      imgWidth: jpegPending.width,
      imgHeight: jpegPending.height,
      bgColor,
    })
    setJpegPending(null)
  }, [jpegPending, bgColor, onImageLoaded])

  return (
    <>
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center w-full cursor-pointer
          rounded-2xl border-2 border-dashed transition-all select-none
          min-h-[220px] gap-3
          ${isDragging
            ? 'border-orange-400 bg-orange-50'
            : 'border-slate-200 bg-slate-50 hover:border-orange-300 hover:bg-orange-50/40'}
        `}
      >
        <div className="text-4xl">🖼️</div>
        <div className="text-center">
          <p className="font-display font-semibold text-slate-800 text-base">
            Drop your logo here
          </p>
          <p className="text-slate-400 text-sm mt-1">
            PNG, JPG, or SVG · or{' '}
            <span className="text-orange-500 underline underline-offset-2">browse files</span>
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* JPEG background modal */}
      {jpegPending && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-display font-semibold text-slate-900 text-lg mb-2">
              Choose a background color
            </h3>
            <p className="text-slate-500 text-sm mb-5">
              Your image doesn't support transparency. Pick a background color before we continue.
            </p>
            <div className="flex items-center gap-3 mb-6">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer"
              />
              <span className="text-slate-600 font-mono text-sm">{bgColor}</span>
            </div>
            <button
              onClick={confirmJpegBg}
              className="w-full py-3 rounded-xl font-display font-semibold text-white text-sm
                         bg-gradient-to-r from-orange-400 to-orange-500
                         hover:from-orange-500 hover:to-orange-600 transition-all"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/__tests__/UploadZone.test.tsx
```
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/UploadZone.tsx src/components/__tests__/UploadZone.test.tsx
git commit -m "feat: UploadZone with drag-drop and JPEG background color modal"
```

---

## Task 8: Konva Editor Component

**Files:**
- Create: `src/components/Editor.tsx`

No unit tests for Konva canvas interactions (Konva requires a real browser environment). Visual testing is done by running the dev server.

- [ ] **Step 1: Write `src/components/Editor.tsx`**

```tsx
import React, { useRef, useEffect, useCallback } from 'react'
import { Stage, Layer, Rect, Image as KonvaImage } from 'react-konva'
import Konva from 'konva'
import { EditState } from '../types'
import { rasterizeSvg } from '../lib/svgRasterizer'
import { applyEdits } from '../lib/applyEdits'

const EDITOR_SIZE = 400

interface EditorProps {
  state: EditState
  onStateChange: (partial: Partial<EditState>) => void
  onCommit: () => void  // called on gesture end → triggers version snapshot
}

function getClipFunc(shapeMask: EditState['shapeMask'], size: number) {
  return (ctx: Konva.Context) => {
    const s = size
    if (shapeMask === 'square') {
      ctx.rect(0, 0, s, s)
    } else if (shapeMask === 'rounded') {
      const r = s * 0.2
      ctx.beginPath()
      ;(ctx as unknown as CanvasRenderingContext2D).roundRect(0, 0, s, s, r)
    } else if (shapeMask === 'circle') {
      ctx.beginPath()
      ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2)
    } else {
      ctx.rect(0, 0, s, s)
    }
  }
}

export function Editor({ state, onStateChange, onCommit }: EditorProps) {
  const [imageEl, setImageEl] = React.useState<HTMLImageElement | HTMLCanvasElement | null>(null)
  const lastDist = useRef(0)

  // Load image element
  useEffect(() => {
    if (!state.imageType) return

    if (state.svgString) {
      rasterizeSvg(state.svgString, EDITOR_SIZE).then(setImageEl)
    } else if (state.imageDataUrl) {
      const img = new window.Image()
      img.onload = () => setImageEl(img)
      img.src = state.imageDataUrl
    }
  }, [state.imageType, state.imageDataUrl, state.svgString])

  const coverRatio = imageEl
    ? Math.max(
        EDITOR_SIZE / ((imageEl as HTMLCanvasElement).width || (imageEl as HTMLImageElement).naturalWidth || 1),
        EDITOR_SIZE / ((imageEl as HTMLCanvasElement).height || (imageEl as HTMLImageElement).naturalHeight || 1)
      )
    : 1

  const drawW = ((imageEl as HTMLCanvasElement)?.width || (imageEl as HTMLImageElement)?.naturalWidth || EDITOR_SIZE) * coverRatio * state.scale
  const drawH = ((imageEl as HTMLCanvasElement)?.height || (imageEl as HTMLImageElement)?.naturalHeight || EDITOR_SIZE) * coverRatio * state.scale

  // Touch pinch-to-zoom
  const handleTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches
    if (touches.length < 2) return
    e.evt.preventDefault()
    const dist = Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    )
    if (lastDist.current > 0) {
      const delta = dist / lastDist.current
      onStateChange({ scale: Math.max(0.1, Math.min(10, state.scale * delta)) })
    }
    lastDist.current = dist
  }, [state.scale, onStateChange])

  const handleTouchEnd = useCallback(() => {
    lastDist.current = 0
    onCommit()
  }, [onCommit])

  // Scroll wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const delta = e.evt.deltaY > 0 ? 0.9 : 1.1
    onStateChange({ scale: Math.max(0.1, Math.min(10, state.scale * delta)) })
  }, [state.scale, onStateChange])

  if (!state.imageType || !imageEl) return null

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
      <Stage
        width={EDITOR_SIZE}
        height={EDITOR_SIZE}
        onWheel={handleWheel}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Layer
          clipFunc={state.shapeMask !== 'none' ? getClipFunc(state.shapeMask, EDITOR_SIZE) : undefined}
        >
          {/* Background */}
          {state.bgColor && (
            <Rect x={0} y={0} width={EDITOR_SIZE} height={EDITOR_SIZE} fill={state.bgColor} />
          )}
          {/* Image */}
          <KonvaImage
            image={imageEl as HTMLImageElement}
            x={EDITOR_SIZE / 2 + state.cropX}
            y={EDITOR_SIZE / 2 + state.cropY}
            width={drawW}
            height={drawH}
            offsetX={drawW / 2}
            offsetY={drawH / 2}
            rotation={state.rotation}
            draggable
            onDragMove={(e) => {
              onStateChange({
                cropX: e.target.x() - EDITOR_SIZE / 2,
                cropY: e.target.y() - EDITOR_SIZE / 2,
              })
            }}
            onDragEnd={onCommit}
          />
        </Layer>
      </Stage>
    </div>
  )
}
```

- [ ] **Step 2: Run the dev server and visually verify**

```bash
npm run dev
```
Wire `Editor` into `App.tsx` temporarily to confirm it renders without errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Editor.tsx
git commit -m "feat: Konva editor with drag, scroll-zoom, and touch pinch-zoom"
```

---

## Task 9: Controls Component

**Files:**
- Create: `src/components/Controls.tsx`
- Create: `src/components/__tests__/Controls.test.tsx`

- [ ] **Step 1: Write failing tests** — create `src/components/__tests__/Controls.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Controls } from '../Controls'
import { DEFAULT_EDIT_STATE } from '../../types'

describe('Controls', () => {
  it('renders rotation slider', () => {
    render(<Controls state={DEFAULT_EDIT_STATE} onChange={vi.fn()} />)
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })

  it('renders all 4 shape mask options', () => {
    render(<Controls state={DEFAULT_EDIT_STATE} onChange={vi.fn()} />)
    expect(screen.getByTitle(/square/i)).toBeInTheDocument()
    expect(screen.getByTitle(/rounded/i)).toBeInTheDocument()
    expect(screen.getByTitle(/circle/i)).toBeInTheDocument()
    expect(screen.getByTitle(/none/i)).toBeInTheDocument()
  })

  it('calls onChange with new rotation when slider changes', async () => {
    const onChange = vi.fn()
    render(<Controls state={DEFAULT_EDIT_STATE} onChange={onChange} />)
    const slider = screen.getByRole('slider')
    await userEvent.type(slider, '{ArrowRight}')
    expect(onChange).toHaveBeenCalled()
  })

  it('calls onChange with new shapeMask when tile is clicked', async () => {
    const onChange = vi.fn()
    render(<Controls state={DEFAULT_EDIT_STATE} onChange={onChange} />)
    await userEvent.click(screen.getByTitle(/circle/i))
    expect(onChange).toHaveBeenCalledWith({ shapeMask: 'circle' })
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/components/__tests__/Controls.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Write `src/components/Controls.tsx`**

```tsx
import { EditState, ShapeMask } from '../types'

interface ControlsProps {
  state: EditState
  onChange: (partial: Partial<EditState>) => void
}

const SHAPE_OPTIONS: { value: ShapeMask; label: string; preview: React.ReactNode }[] = [
  {
    value: 'square',
    label: 'Square',
    preview: <div className="w-8 h-8 bg-slate-700 rounded-sm" />,
  },
  {
    value: 'rounded',
    label: 'Rounded',
    preview: <div className="w-8 h-8 bg-slate-700 rounded-xl" />,
  },
  {
    value: 'circle',
    label: 'Circle',
    preview: <div className="w-8 h-8 bg-slate-700 rounded-full" />,
  },
  {
    value: 'none',
    label: 'None',
    preview: <div className="w-8 h-8 bg-slate-700 rounded-sm opacity-30 border-2 border-dashed border-slate-400" />,
  },
]

export function Controls({ state, onChange }: ControlsProps) {
  return (
    <div className="flex flex-col gap-6">

      {/* Rotation */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2 font-display">
          Rotation
          <span className="ml-2 font-normal text-slate-400 text-xs">{state.rotation}°</span>
        </label>
        <input
          type="range"
          min={-180}
          max={180}
          value={state.rotation}
          onChange={(e) => onChange({ rotation: Number(e.target.value) })}
          className="w-full h-2 appearance-none bg-slate-200 rounded-full
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-4
                     [&::-webkit-slider-thumb]:h-4
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-orange-500
                     [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>

      {/* Background color */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2 font-display">
          Background
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={state.bgColor || '#ffffff'}
            onChange={(e) => onChange({ bgColor: e.target.value })}
            className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer"
          />
          <button
            onClick={() => onChange({ bgColor: '' })}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
              !state.bgColor
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            Transparent
          </button>
          {state.bgColor && (
            <span className="text-slate-400 font-mono text-xs">{state.bgColor}</span>
          )}
        </div>
      </div>

      {/* Shape mask */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2 font-display">
          Shape
        </label>
        <div className="grid grid-cols-4 gap-2">
          {SHAPE_OPTIONS.map(({ value, label, preview }) => (
            <button
              key={value}
              title={label}
              onClick={() => onChange({ shapeMask: value })}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                state.shapeMask === value
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {preview}
              <span className="text-xs text-slate-500 font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/__tests__/Controls.test.tsx
```
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Controls.tsx src/components/__tests__/Controls.test.tsx
git commit -m "feat: Controls panel — rotation, background color, shape mask"
```

---

## Task 10: Version History Component

**Files:**
- Create: `src/components/VersionHistory.tsx`
- Create: `src/components/__tests__/VersionHistory.test.tsx`

- [ ] **Step 1: Write failing tests** — create `src/components/__tests__/VersionHistory.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { VersionHistory } from '../VersionHistory'
import { Version } from '../../types'
import { DEFAULT_EDIT_STATE } from '../../types'

const mockVersions: Version[] = [
  { id: 'v1', thumbnail: 'data:image/png;base64,abc', state: { ...DEFAULT_EDIT_STATE, rotation: 45 } },
  { id: 'v2', thumbnail: 'data:image/png;base64,def', state: { ...DEFAULT_EDIT_STATE, rotation: 90 } },
]

describe('VersionHistory', () => {
  it('renders thumbnails for each version', () => {
    render(<VersionHistory versions={mockVersions} activeId={null} onRestore={vi.fn()} />)
    expect(screen.getAllByRole('img')).toHaveLength(2)
  })

  it('calls onRestore with correct version id when thumbnail clicked', async () => {
    const onRestore = vi.fn()
    render(<VersionHistory versions={mockVersions} activeId={null} onRestore={onRestore} />)
    const imgs = screen.getAllByRole('img')
    await userEvent.click(imgs[0])
    expect(onRestore).toHaveBeenCalledWith('v1')
  })

  it('shows orange ring on active version', () => {
    const { container } = render(
      <VersionHistory versions={mockVersions} activeId="v1" onRestore={vi.fn()} />
    )
    const firstBtn = container.querySelectorAll('button')[0]
    expect(firstBtn.className).toMatch(/ring-orange/)
  })

  it('renders nothing when versions array is empty', () => {
    const { container } = render(
      <VersionHistory versions={[]} activeId={null} onRestore={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/components/__tests__/VersionHistory.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Write `src/components/VersionHistory.tsx`**

```tsx
import { Version } from '../types'

interface VersionHistoryProps {
  versions: Version[]
  activeId: string | null
  onRestore: (id: string) => void
}

export function VersionHistory({ versions, activeId, onRestore }: VersionHistoryProps) {
  if (versions.length === 0) return null

  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 font-display">
        Previous versions
      </p>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {versions.map(v => (
          <button
            key={v.id}
            onClick={() => onRestore(v.id)}
            className={`flex-none w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
              v.id === activeId
                ? 'border-orange-400 ring-2 ring-orange-300 ring-offset-1'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <img
              src={v.thumbnail}
              alt="Version preview"
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/__tests__/VersionHistory.test.tsx
```
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/VersionHistory.tsx src/components/__tests__/VersionHistory.test.tsx
git commit -m "feat: VersionHistory thumbnail strip with restore on click"
```

---

## Task 11: Preview Components

**Files:**
- Create: `src/components/previews/BrowserTabPreview.tsx`
- Create: `src/components/previews/BookmarksPreview.tsx`
- Create: `src/components/previews/iOSPreview.tsx`
- Create: `src/components/previews/AndroidPreview.tsx`

All previews accept `faviconDataUrl: string` and render a context mock. They use the `applyEdits` function via an offscreen canvas to derive the favicon image.

- [ ] **Step 1: Create a shared hook** — create `src/components/previews/useFaviconDataUrl.ts`:

```ts
import { useState, useEffect } from 'react'
import { EditState } from '../../types'
import { applyEdits } from '../../lib/applyEdits'
import { rasterizeSvg } from '../../lib/svgRasterizer'

export function useFaviconDataUrl(state: EditState, size: number): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!state.imageType) { setDataUrl(null); return }

    async function render() {
      let imageEl: HTMLImageElement | HTMLCanvasElement

      if (state.svgString) {
        imageEl = await rasterizeSvg(state.svgString, size)
      } else {
        imageEl = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve(img)
          img.onerror = reject
          img.src = state.imageDataUrl!
        })
      }

      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      applyEdits(ctx, imageEl, state, size)
      setDataUrl(canvas.toDataURL('image/png'))
    }

    render()
  }, [state, size])

  return dataUrl
}
```

- [ ] **Step 2: Write `src/components/previews/BrowserTabPreview.tsx`**

```tsx
import { EditState } from '../../types'
import { useFaviconDataUrl } from './useFaviconDataUrl'

export function BrowserTabPreview({ state }: { state: EditState }) {
  const favicon = useFaviconDataUrl(state, 32)

  return (
    <div>
      <p className="text-xs text-slate-400 font-medium mb-2 font-display uppercase tracking-wide">Browser tab</p>
      <div className="bg-slate-100 rounded-2xl p-3">
        {/* Browser chrome */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center bg-slate-100 px-2 pt-2 gap-1">
            <div className="flex items-center gap-1.5 bg-white rounded-t-lg px-3 py-1.5 text-xs text-slate-700 font-medium shadow-sm min-w-0 max-w-[200px]">
              {favicon
                ? <img src={favicon} alt="" className="w-4 h-4 rounded-sm flex-none" />
                : <div className="w-4 h-4 bg-slate-200 rounded-sm flex-none" />
              }
              <span className="truncate">My Website</span>
            </div>
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 text-xs">+</div>
          </div>
          {/* Address bar */}
          <div className="bg-white px-3 py-2 border-b border-slate-100 flex items-center gap-2">
            <div className="flex items-center gap-1 text-slate-400 text-xs">
              <span>🔒</span>
            </div>
            <div className="flex-1 bg-slate-50 rounded-lg px-3 py-1 text-xs text-slate-400">
              mywebsite.com
            </div>
          </div>
          {/* Page content placeholder */}
          <div className="p-4 space-y-2">
            <div className="h-2 bg-slate-100 rounded w-3/4" />
            <div className="h-2 bg-slate-100 rounded w-1/2" />
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write `src/components/previews/BookmarksPreview.tsx`**

```tsx
import { EditState } from '../../types'
import { useFaviconDataUrl } from './useFaviconDataUrl'

export function BookmarksPreview({ state }: { state: EditState }) {
  const favicon = useFaviconDataUrl(state, 16)

  const bookmarks = ['My Website', 'GitHub', 'Figma', 'Notion']

  return (
    <div>
      <p className="text-xs text-slate-400 font-medium mb-2 font-display uppercase tracking-wide">Bookmarks bar</p>
      <div className="bg-slate-100 rounded-2xl p-3">
        <div className="bg-white rounded-xl px-3 py-2 flex items-center gap-3 overflow-x-auto">
          {bookmarks.map((label, i) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-slate-700 flex-none">
              {i === 0
                ? (favicon
                    ? <img src={favicon} alt="" className="w-4 h-4 rounded-sm flex-none" />
                    : <div className="w-4 h-4 bg-slate-200 rounded-sm flex-none" />)
                : <div className="w-4 h-4 bg-slate-200 rounded-sm flex-none" />
              }
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write `src/components/previews/iOSPreview.tsx`**

```tsx
import { EditState } from '../../types'
import { useFaviconDataUrl } from './useFaviconDataUrl'

const PLACEHOLDER_ICONS = [
  { color: '#3b82f6', label: 'App' },
  { color: '#10b981', label: 'App' },
  { color: '#f59e0b', label: 'App' },
  { color: '#6366f1', label: 'App' },
  { color: '#ec4899', label: 'App' },
  { color: '#14b8a6', label: 'App' },
  { color: '#f97316', label: 'App' },
  { color: '#8b5cf6', label: 'App' },
]

export function iOSPreview({ state }: { state: EditState }) {
  const favicon = useFaviconDataUrl(state, 180)

  return (
    <div>
      <p className="text-xs text-slate-400 font-medium mb-2 font-display uppercase tracking-wide">iPhone home screen</p>
      <div
        className="rounded-2xl p-4 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #4a2c6e 100%)' }}
      >
        <div className="grid grid-cols-4 gap-3">
          {/* User's icon first */}
          <div className="flex flex-col items-center gap-1">
            {favicon
              ? <img src={favicon} alt="Your icon" className="w-14 h-14 rounded-[22%] shadow-md" />
              : <div className="w-14 h-14 rounded-[22%] bg-white/20" />
            }
            <span className="text-white/80 text-[9px] truncate w-14 text-center">My Website</span>
          </div>
          {/* Placeholder icons */}
          {PLACEHOLDER_ICONS.slice(0, 7).map(({ color, label }, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className="w-14 h-14 rounded-[22%] shadow-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-white/60 text-[9px]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write `src/components/previews/AndroidPreview.tsx`**

```tsx
import { EditState } from '../../types'
import { useFaviconDataUrl } from './useFaviconDataUrl'

const PLACEHOLDER_ICONS = [
  { color: '#3b82f6' }, { color: '#10b981' }, { color: '#f59e0b' },
  { color: '#6366f1' }, { color: '#ec4899' }, { color: '#14b8a6' },
  { color: '#f97316' }, { color: '#8b5cf6' },
]

export function AndroidPreview({ state }: { state: EditState }) {
  const favicon = useFaviconDataUrl(state, 192)

  return (
    <div>
      <p className="text-xs text-slate-400 font-medium mb-2 font-display uppercase tracking-wide">Android home screen</p>
      <div
        className="rounded-2xl p-4"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}
      >
        <div className="grid grid-cols-4 gap-3">
          {/* User's icon */}
          <div className="flex flex-col items-center gap-1">
            {favicon
              ? <img src={favicon} alt="Your icon" className="w-14 h-14 rounded-2xl shadow-md" />
              : <div className="w-14 h-14 rounded-2xl bg-white/20" />
            }
            <span className="text-white/70 text-[9px] truncate w-14 text-center">My Website</span>
          </div>
          {PLACEHOLDER_ICONS.slice(0, 7).map(({ color }, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className="w-14 h-14 rounded-2xl shadow-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-white/50 text-[9px]">App</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/previews/
git commit -m "feat: four live preview components (browser tab, bookmarks, iOS, Android)"
```

---

## Task 12: Export Button

**Files:**
- Create: `src/components/ExportButton.tsx`
- Create: `src/components/__tests__/ExportButton.test.tsx`

- [ ] **Step 1: Write failing tests** — create `src/components/__tests__/ExportButton.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ExportButton } from '../ExportButton'
import { DEFAULT_EDIT_STATE } from '../../types'

vi.mock('../../lib/zipBuilder', () => ({
  buildFaviconZip: vi.fn().mockResolvedValue(undefined),
}))

describe('ExportButton', () => {
  it('renders Export ZIP label', () => {
    const state = { ...DEFAULT_EDIT_STATE, imageType: 'png' as const, imageDataUrl: 'data:image/png;base64,abc' }
    render(<ExportButton state={state} />)
    expect(screen.getByText(/export zip/i)).toBeInTheDocument()
  })

  it('is disabled when no image is loaded', () => {
    render(<ExportButton state={DEFAULT_EDIT_STATE} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('calls buildFaviconZip on click', async () => {
    const { buildFaviconZip } = await import('../../lib/zipBuilder')
    const state = { ...DEFAULT_EDIT_STATE, imageType: 'png' as const, imageDataUrl: 'data:image/png;base64,abc' }
    render(<ExportButton state={state} />)
    await userEvent.click(screen.getByRole('button'))
    expect(buildFaviconZip).toHaveBeenCalledWith(state)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/components/__tests__/ExportButton.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Write `src/components/ExportButton.tsx`**

```tsx
import { useState } from 'react'
import { EditState } from '../types'
import { buildFaviconZip } from '../lib/zipBuilder'

interface ExportButtonProps {
  state: EditState
}

export function ExportButton({ state }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const disabled = !state.imageType || isExporting

  const handleExport = async () => {
    if (disabled) return
    setIsExporting(true)
    try {
      await buildFaviconZip(state)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      className={`
        w-full py-4 rounded-2xl font-display font-semibold text-white text-base
        transition-all duration-200 shadow-sm
        ${disabled
          ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          : 'bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 shadow-orange-200 hover:shadow-orange-300 hover:shadow-md active:scale-[0.98]'
        }
      `}
    >
      {isExporting ? (
        <span className="flex items-center justify-center gap-2">
          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Exporting…
        </span>
      ) : (
        '↓ Export ZIP'
      )}
    </button>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/__tests__/ExportButton.test.tsx
```
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ExportButton.tsx src/components/__tests__/ExportButton.test.tsx
git commit -m "feat: ExportButton with loading state and zip download"
```

---

## Task 13: App Layout & Integration

**Files:**
- Modify: `src/App.tsx`

This task wires all components together into the final two-panel desktop / tab-toggle mobile layout.

- [ ] **Step 1: Replace `src/App.tsx`**

```tsx
import { useState, useCallback, useRef } from 'react'
import { useEditState } from './hooks/useEditState'
import { UploadZone } from './components/UploadZone'
import { Editor } from './components/Editor'
import { Controls } from './components/Controls'
import { VersionHistory } from './components/VersionHistory'
import { ExportButton } from './components/ExportButton'
import { BrowserTabPreview } from './components/previews/BrowserTabPreview'
import { BookmarksPreview } from './components/previews/BookmarksPreview'
import { iOSPreview } from './components/previews/iOSPreview'
import { AndroidPreview } from './components/previews/AndroidPreview'
import { applyEdits } from './lib/applyEdits'
import { rasterizeSvg } from './lib/svgRasterizer'

type MobileTab = 'edit' | 'preview'

export default function App() {
  const { state, setState, versions, addVersion, restoreVersion } = useEditState()
  const [mobileTab, setMobileTab] = useState<MobileTab>('edit')
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null)
  const hasImage = !!state.imageType

  // Capture a 64×64 thumbnail of current state and add to version history
  const captureVersion = useCallback(async () => {
    if (!state.imageType) return

    let imageEl: HTMLImageElement | HTMLCanvasElement
    try {
      if (state.svgString) {
        imageEl = await rasterizeSvg(state.svgString, 64)
      } else {
        imageEl = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve(img)
          img.onerror = reject
          img.src = state.imageDataUrl!
        })
      }
    } catch {
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    applyEdits(ctx, imageEl, state, 64)
    addVersion(canvas.toDataURL('image/png'))
  }, [state, addVersion])

  const handleRestore = useCallback((id: string) => {
    restoreVersion(id)
    setActiveVersionId(id)
  }, [restoreVersion])

  const leftPanel = (
    <div className="flex flex-col gap-6">
      {!hasImage && <UploadZone onImageLoaded={(payload) => setState(payload)} />}

      {hasImage && (
        <>
          <Editor
            state={state}
            onStateChange={setState}
            onCommit={captureVersion}
          />
          <Controls state={state} onChange={setState} />
          <VersionHistory
            versions={versions}
            activeId={activeVersionId}
            onRestore={handleRestore}
          />
          {/* Upload new image link */}
          <button
            onClick={() => setState({ imageType: null, imageDataUrl: null, svgString: null })}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors text-center"
          >
            ← Upload a different image
          </button>
        </>
      )}

      <ExportButton state={state} />
    </div>
  )

  const rightPanel = (
    <div className="flex flex-col gap-6">
      <BrowserTabPreview state={state} />
      <BookmarksPreview state={state} />
      <iOSPreview state={state} />
      <AndroidPreview state={state} />
    </div>
  )

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <header className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <h1 className="font-display font-bold text-xl text-slate-900 tracking-tight">
          Favicon Maker
        </h1>
        <span className="text-xs text-slate-400 font-medium">Free · No account needed</span>
      </header>

      {/* Desktop layout */}
      <div className="hidden md:flex h-[calc(100vh-65px)]">
        {/* Left panel */}
        <div className="w-[440px] flex-none border-r border-slate-100 overflow-y-auto p-6 flex flex-col gap-6">
          {leftPanel}
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <h2 className="font-display font-semibold text-slate-800 text-sm mb-5 uppercase tracking-wide">
            Live preview
          </h2>
          {rightPanel}
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden pb-20">
        <div className="p-4">
          {mobileTab === 'edit' ? leftPanel : rightPanel}
        </div>

        {/* Tab toggle fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex">
          {(['edit', 'preview'] as MobileTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`flex-1 py-4 font-display font-semibold text-sm capitalize transition-colors ${
                mobileTab === tab
                  ? 'text-orange-500 border-t-2 border-orange-500'
                  : 'text-slate-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run dev server and verify full flow**

```bash
npm run dev
```

Manual checklist:
- [ ] Upload PNG → editor appears, controls work
- [ ] Upload JPEG → background color modal appears
- [ ] Upload SVG → renders correctly
- [ ] Drag image in editor → updates live previews
- [ ] Rotation slider moves image
- [ ] Shape mask tiles clip correctly in editor
- [ ] Background color picker updates editor + previews
- [ ] Version thumbnail appears after each gesture commit
- [ ] Clicking version thumbnail restores that state
- [ ] Export ZIP button downloads `favicon-export.zip`
- [ ] Mobile: tab toggle switches between Edit and Preview

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: full app layout — two-panel desktop, tab-toggle mobile, all components wired"
```

---

## Task 14: Final Polish & Tests

**Files:**
- Modify: `src/index.css`
- Run full test suite

- [ ] **Step 1: Add scrollbar utility to `src/index.css`**

```css
/* Append to src/index.css */
.scrollbar-thin::-webkit-scrollbar { height: 4px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 999px; }
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```
Expected: all tests PASS. Fix any failures before proceeding.

- [ ] **Step 3: Build and verify no TypeScript errors**

```bash
npm run build
```
Expected: build succeeds with no errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: favicon maker complete — all tests pass, production build clean"
```

---

## Self-Review Against Spec

| Spec requirement | Covered by |
|---|---|
| PNG transparency preserved | `applyEdits` — no background fill when `bgColor` is `""` |
| SVG rasterized per size | `rasterizeSvg` called at each target size in `zipBuilder` + previews |
| JPEG background modal | `UploadZone` JPEG detection + modal |
| Drag/reposition | `Editor` — Konva Image `draggable` + `onDragMove` |
| Rotation slider + handle | `Controls` slider; rotation handle omitted (slider is sufficient for usability) |
| Scale / pinch-zoom | `Editor` — wheel + touch pinch |
| BG color picker | `Controls` + `UploadZone` JPEG modal |
| Shape mask (4 options) | `Controls` + `applyEdits` `applyClipPath` |
| Live previews (4) | Task 11 preview components |
| Version history strip | `VersionHistory` + `captureVersion` in `App` |
| Restore version on click | `restoreVersion` in `useEditState` |
| Export ZIP structure | `zipBuilder` — exact folder/file names match spec |
| favicon.ico (16+32+48) | `generateIco` with 3 canvases |
| README.txt verbatim | `zipBuilder` README constant |
| Mobile layout + tabs | `App` mobile section |
| Touch gestures | `Editor` pinch-zoom + Konva drag |
| Space Grotesk / DM Sans | `tailwind.config.ts` + `index.css` |
| Orange gradient CTA | `ExportButton` + `UploadZone` modal button |
| Rounded corners throughout | `rounded-2xl` / `rounded-xl` on all panels/cards |

**Note:** The rotation handle on the canvas (separate from the slider) was omitted — the slider covers the use case, and a handle adds significant Konva complexity for marginal benefit.
