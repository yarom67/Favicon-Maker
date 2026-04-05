import { useState, useEffect, useRef } from 'react'
import type { EditState } from '../../types'
import { applyEdits } from '../../lib/applyEdits'
import { rasterizeSvg } from '../../lib/svgRasterizer'

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
          imageEl = await rasterizeSvg(state.svgString, size)
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

      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      applyEdits(ctx, imageEl, state, size)
      setDataUrl(canvas.toDataURL('image/png'))
    }, 150)

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [state, size])

  return dataUrl
}
