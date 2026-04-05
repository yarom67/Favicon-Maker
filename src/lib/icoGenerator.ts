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
