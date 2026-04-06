import React, { useRef, useEffect, useCallback, useState } from 'react'
import { Stage, Layer, Rect, Image as KonvaImage, Group } from 'react-konva'
import Konva from 'konva'
import type { EditState } from '../types'
import { rasterizeSvg } from '../lib/svgRasterizer'

export const EDITOR_SIZE = 400

interface EditorProps {
  state: EditState
  onStateChange: (partial: Partial<EditState>) => void
  onCommit: () => void
}

function getClipFunc(shapeMask: EditState['shapeMask'], size: number) {
  return (ctx: Konva.Context) => {
    if (shapeMask === 'square') {
      ctx.rect(0, 0, size, size)
    } else if (shapeMask === 'rounded') {
      const r = size * 0.2
      ctx.beginPath()
      ;(ctx as unknown as CanvasRenderingContext2D).roundRect(0, 0, size, size, r)
    } else if (shapeMask === 'circle') {
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    } else {
      ctx.rect(0, 0, size, size)
    }
  }
}

export function Editor({ state, onStateChange, onCommit }: EditorProps) {
  const [imageEl, setImageEl] = React.useState<HTMLImageElement | HTMLCanvasElement | null>(null)
  const lastDist = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState(EDITOR_SIZE)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width
      if (w > 0) setContainerSize(Math.floor(w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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

  const iw = state.imgWidth || (imageEl ? ((imageEl as HTMLCanvasElement).width || EDITOR_SIZE) : EDITOR_SIZE)
  const ih = state.imgHeight || (imageEl ? ((imageEl as HTMLCanvasElement).height || EDITOR_SIZE) : EDITOR_SIZE)

  // Scale everything from EDITOR_SIZE coordinate space to actual container size
  const scale = containerSize / EDITOR_SIZE
  const coverRatio = Math.max(EDITOR_SIZE / iw, EDITOR_SIZE / ih)
  const drawW = iw * coverRatio * state.scale
  const drawH = ih * coverRatio * state.scale

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
      onStateChange({ scale: Math.max(0.25, Math.min(4, state.scale * delta)) })
    }
    lastDist.current = dist
  }, [state.scale, onStateChange])

  const handleTouchEnd = useCallback(() => {
    lastDist.current = 0
    onCommit()
  }, [onCommit])

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const delta = e.evt.deltaY > 0 ? 0.9 : 1.1
    onStateChange({ scale: Math.max(0.25, Math.min(4, state.scale * delta)) })
  }, [state.scale, onStateChange])

  if (!state.imageType || !imageEl) return null

  return (
    <div ref={containerRef} className="w-full aspect-square rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
      <Stage
        width={containerSize}
        height={containerSize}
        scaleX={scale}
        scaleY={scale}
        onWheel={handleWheel}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Layer>
          <Group
            clipFunc={state.shapeMask !== 'none' ? getClipFunc(state.shapeMask, EDITOR_SIZE) : undefined}
            width={EDITOR_SIZE}
            height={EDITOR_SIZE}
          >
            {state.bgColor && (
              <Rect x={0} y={0} width={EDITOR_SIZE} height={EDITOR_SIZE} fill={state.bgColor} />
            )}
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
          </Group>
        </Layer>
      </Stage>
    </div>
  )
}
