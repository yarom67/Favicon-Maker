// Inject explicit dimensions into SVG markup so the browser renders at `renderSize`
// without relying on the SVG's own width/height attributes.
function setSvgRenderSize(svgString: string, renderSize: number): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgString, 'image/svg+xml')
  const svg = doc.documentElement
  svg.setAttribute('width', String(renderSize))
  svg.setAttribute('height', String(renderSize))
  return new XMLSerializer().serializeToString(doc)
}

function loadImageFromBlob(svgString: string, renderSize: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const sized = setSvgRenderSize(svgString, renderSize)
    const blob = new Blob([sized], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Failed to rasterize SVG at size ${renderSize}`)) }
    img.src = url
  })
}

// Rasterize SVG to a canvas at `size` px using supersampling for small sizes.
// Small sizes (≤ 256) render at 512 px then scale down — gives much better
// anti-aliasing than drawing the SVG directly at 16/32/48 px.
export function rasterizeSvg(svgString: string, size: number): Promise<HTMLCanvasElement> {
  const renderSize = size < 512 ? 512 : size

  return loadImageFromBlob(svgString, renderSize).then(img => {
    if (renderSize === size) {
      // No downscaling needed — draw directly
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = true
      ;(ctx as CanvasRenderingContext2D & { imageSmoothingQuality: string }).imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, size, size)
      return canvas
    }

    // Render at high res, then scale down
    const hiRes = document.createElement('canvas')
    hiRes.width = renderSize
    hiRes.height = renderSize
    const hiCtx = hiRes.getContext('2d')!
    hiCtx.imageSmoothingEnabled = true
    ;(hiCtx as CanvasRenderingContext2D & { imageSmoothingQuality: string }).imageSmoothingQuality = 'high'
    hiCtx.drawImage(img, 0, 0, renderSize, renderSize)

    const out = document.createElement('canvas')
    out.width = size
    out.height = size
    const outCtx = out.getContext('2d')!
    outCtx.imageSmoothingEnabled = true
    ;(outCtx as CanvasRenderingContext2D & { imageSmoothingQuality: string }).imageSmoothingQuality = 'high'
    outCtx.drawImage(hiRes, 0, 0, size, size)
    return out
  })
}
