import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildFaviconZip } from '../zipBuilder'
import { DEFAULT_EDIT_STATE } from '../../types'

// Mock FileSaver
vi.mock('file-saver', () => ({ saveAs: vi.fn() }))

// Mock applyEdits to avoid drawImage type restrictions in jsdom
vi.mock('../applyEdits', () => ({
  applyEdits: vi.fn(),
}))

// Mock generateIco to avoid real ICO generation
vi.mock('../icoGenerator', () => ({
  generateIco: vi.fn().mockResolvedValue(new Blob(['ico'], { type: 'image/x-icon' })),
}))

// Mock JSZip to avoid base64 validation issues with jsdom canvas
vi.mock('jszip', () => {
  class MockJSZip {
    file = vi.fn().mockReturnThis()
    folder = vi.fn().mockReturnThis()
    generateAsync = vi.fn().mockResolvedValue(new Blob(['zip'], { type: 'application/zip' }))
  }
  return { default: MockJSZip }
})

function makeCanvas(size: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  return c
}

beforeEach(() => {
  vi.spyOn(global, 'Image').mockImplementation(function(this: any) {
    this.onload = null
    this.onerror = null
    this._src = ''
    Object.defineProperty(this, 'src', {
      set(val: string) {
        this._src = val
        setTimeout(() => this.onload?.(), 0)
      },
      get() { return this._src },
      configurable: true,
    })
  } as any)
})

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
