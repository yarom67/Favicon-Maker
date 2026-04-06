import type { EditState } from '../types'

const EDITOR_SIZE = 400

function applyClipPath(
  ctx: CanvasRenderingContext2D,
  size: number,
  mask: EditState['shapeMask']
): void {
  if (mask === 'square') {
    ctx.beginPath()
    ctx.rect(0, 0, size, size)
    ctx.clip()
  } else if (mask === 'rounded') {
    const r = size * 0.2
    ctx.beginPath()
    ;(ctx as any).roundRect(0, 0, size, size, r)
    ctx.clip()
  } else if (mask === 'circle') {
    ctx.beginPath()
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

  // High-quality interpolation for all scaling operations
  ctx.imageSmoothingEnabled = true
  ;(ctx as CanvasRenderingContext2D & { imageSmoothingQuality: string }).imageSmoothingQuality = 'high'

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
  ctx.translate(size / 2 + scaledCropX, size / 2 + scaledCropY)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(imageEl, -drawW / 2, -drawH / 2, drawW, drawH)

  ctx.restore()

  // Expose fillStyle after restore for observability (re-set if bgColor was used)
  if (bgColor) {
    ctx.fillStyle = bgColor
  }
}
