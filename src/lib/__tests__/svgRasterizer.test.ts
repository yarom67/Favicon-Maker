import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rasterizeSvg } from '../svgRasterizer'

// Mock URL methods not available in jsdom
global.URL.createObjectURL = vi.fn(() => 'blob:mock')
global.URL.revokeObjectURL = vi.fn()

describe('rasterizeSvg', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns a canvas of the requested size', async () => {
    const svgString = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>'

    // Mock Image load to fire onload immediately
    const origImage = global.Image
    global.Image = class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      private _src = ''
      get src() { return this._src }
      set src(val: string) {
        this._src = val
        setTimeout(() => this.onload?.(), 0)
      }
      width = 100
      height = 100
    } as unknown as typeof Image

    // Mock drawImage to avoid type validation in vitest-canvas-mock
    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreateElement(tag)
      if (tag === 'canvas') {
        const origGetContext = el.getContext.bind(el)
        ;(el as HTMLCanvasElement).getContext = (contextId: string, ...args: unknown[]) => {
          const ctx = origGetContext(contextId as '2d', ...(args as [])) as CanvasRenderingContext2D | null
          if (ctx && contextId === '2d') {
            ctx.drawImage = vi.fn() as unknown as typeof ctx.drawImage
          }
          return ctx
        }
      }
      return el
    })

    const canvasPromise = rasterizeSvg(svgString, 64)
    await vi.runAllTimersAsync()
    const canvas = await canvasPromise
    expect(canvas.width).toBe(64)
    expect(canvas.height).toBe(64)

    global.Image = origImage
    vi.restoreAllMocks()
  })

  it('rejects on image error', async () => {
    const origImage = global.Image
    global.Image = class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_: string) {
        setTimeout(() => this.onerror?.(), 0)
      }
    } as unknown as typeof Image

    const rejectPromise = expect(rasterizeSvg('not valid svg', 64)).rejects.toThrow()
    await vi.runAllTimersAsync()
    await rejectPromise

    global.Image = origImage
  })
})
