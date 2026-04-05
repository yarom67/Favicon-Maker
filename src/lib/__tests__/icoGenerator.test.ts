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
    expect(view.getUint16(0, true)).toBe(0)   // reserved = 0
    expect(view.getUint16(2, true)).toBe(1)   // type = 1 (ICO)
    expect(view.getUint16(4, true)).toBe(1)   // count = 1
  })

  it('directory entry count matches number of canvases', async () => {
    const blob = await generateIco([makeCanvas(16), makeCanvas(32), makeCanvas(48)])
    const buffer = await blob.arrayBuffer()
    const view = new DataView(buffer)
    expect(view.getUint16(4, true)).toBe(3)
  })
})
