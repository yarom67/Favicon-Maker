import { describe, it, expect } from 'vitest'
import { applyEdits } from '../applyEdits'
import { DEFAULT_EDIT_STATE } from '../../types'

function makeCanvas(size: number) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  return canvas
}

function makeImageEl(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
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
