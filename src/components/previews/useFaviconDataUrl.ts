import { useState, useEffect, useRef } from 'react'
import type { EditState } from '../../types'
import { applyEdits } from '../../lib/applyEdits'
import { rasterizeSvg } from '../../lib/svgRasterizer'
import { EDITOR_SIZE } from '../Editor'

export function useFaviconDataUrl(state: EditState, size: number): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!state.imageType) {
      setDataUrl(null)
      return
    }

    // Debounce: wait 150ms after last change before rendering
    if (timerRef.current) clearTimeout(timerRef.current)

    let cancelled = false

    timerRef.current = setTimeout(async () => {
      let imageEl: HTMLImageElement | HTMLCanvasElement

      try {
        if (state.svgString) {
          // Always rasterize SVG at EDITOR_SIZE — same as the interactive Editor.
          // This ensures sub-pixel SVG rendering is identical between the two paths.
          imageEl = await rasterizeSvg(state.svgString, EDITOR_SIZE)
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

      if (cancelled) return

      // Render at EDITOR_SIZE — exactly matches the Editor's rendering path.
      const bigCanvas = document.createElement('canvas')
      bigCanvas.width = EDITOR_SIZE
      bigCanvas.height = EDITOR_SIZE
      applyEdits(bigCanvas.getContext('2d')!, imageEl, state, EDITOR_SIZE)

      // Downscale to the target display size.
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      canvas.getContext('2d')!.drawImage(bigCanvas, 0, 0, size, size)
      setDataUrl(canvas.toDataURL('image/png'))
    }, 150)

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [state, size])

  return dataUrl
}
