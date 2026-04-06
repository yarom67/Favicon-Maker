import { useState, useEffect } from 'react'
import type { EditState } from '../types'
import { useFaviconDataUrl } from './previews/useFaviconDataUrl'

interface Metrics {
  simplicity: number
  contrast: number
  legibility: number
  overall: number
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function relativeLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

function computeMetrics(data32: ImageData, data16: ImageData): Metrics {
  const px32 = data32.data
  const px16 = data16.data
  const n32 = data32.width * data32.height
  const n16 = data16.width * data16.height

  // --- Simplicity: edge density at 16×16 ---
  let edgeCount = 0
  const w16 = data16.width
  for (let y = 0; y < data16.height; y++) {
    for (let x = 0; x < w16; x++) {
      const i = (y * w16 + x) * 4
      const a = px16[i + 3]
      if (a < 10) continue
      const lum = (px16[i] * 299 + px16[i + 1] * 587 + px16[i + 2] * 114) / 1000
      // compare to right neighbor
      if (x + 1 < w16) {
        const j = (y * w16 + x + 1) * 4
        const lumR = (px16[j] * 299 + px16[j + 1] * 587 + px16[j + 2] * 114) / 1000
        if (Math.abs(lum - lumR) > 30) edgeCount++
      }
      // compare to bottom neighbor
      if (y + 1 < data16.height) {
        const j = ((y + 1) * w16 + x) * 4
        const lumB = (px16[j] * 299 + px16[j + 1] * 587 + px16[j + 2] * 114) / 1000
        if (Math.abs(lum - lumB) > 30) edgeCount++
      }
    }
  }
  const edgeFraction = edgeCount / (n16 * 2)
  const simplicity = clamp(100 - edgeFraction * 300, 0, 100)

  // --- Contrast: brightest vs darkest luminance at 32×32 ---
  let lMin = 1
  let lMax = 0
  for (let i = 0; i < n32 * 4; i += 4) {
    if (px32[i + 3] < 10) continue
    const l = relativeLuminance(px32[i], px32[i + 1], px32[i + 2])
    if (l < lMin) lMin = l
    if (l > lMax) lMax = l
  }
  const ratio = lMin === lMax ? 1 : (lMax + 0.05) / (lMin + 0.05)
  const contrast = clamp((ratio - 1) / 20 * 100, 0, 100)

  // --- Legibility: average local contrast at 16×16 ---
  // Measures how visually distinct the icon is at the smallest sizes (bookmarks/browser tab)
  let totalDiff = 0
  let pairCount = 0
  for (let y = 0; y < data16.height; y++) {
    for (let x = 0; x < w16; x++) {
      const i = (y * w16 + x) * 4
      if (px16[i + 3] < 10) continue
      const lum = (px16[i] * 299 + px16[i + 1] * 587 + px16[i + 2] * 114) / 1000
      if (x + 1 < w16) {
        const j = (y * w16 + x + 1) * 4
        if (px16[j + 3] >= 10) {
          const lumR = (px16[j] * 299 + px16[j + 1] * 587 + px16[j + 2] * 114) / 1000
          totalDiff += Math.abs(lum - lumR)
          pairCount++
        }
      }
      if (y + 1 < data16.height) {
        const j = ((y + 1) * w16 + x) * 4
        if (px16[j + 3] >= 10) {
          const lumB = (px16[j] * 299 + px16[j + 1] * 587 + px16[j + 2] * 114) / 1000
          totalDiff += Math.abs(lum - lumB)
          pairCount++
        }
      }
    }
  }
  const avgLocalContrast = pairCount > 0 ? totalDiff / pairCount : 0
  const legibility = clamp((avgLocalContrast / 80) * 100, 0, 100)

  const overall = Math.round(0.4 * simplicity + 0.4 * contrast + 0.2 * legibility)

  return {
    simplicity: Math.round(simplicity),
    contrast: Math.round(contrast),
    legibility: Math.round(legibility),
    overall,
  }
}

function gradeLabel(score: number): string {
  if (score >= 90) return 'Pixel perfect'
  if (score >= 80) return 'Looking great'
  if (score >= 70) return 'Solid work'
  if (score >= 60) return 'Getting there'
  if (score >= 40) return 'Could be better'
  return 'Needs some love'
}

function barColor(score: number): string {
  if (score >= 70) return 'bg-emerald-400'
  if (score >= 40) return 'bg-orange-400'
  return 'bg-red-400'
}

function MetricBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-20 flex-none font-medium">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 w-7 text-right">{score}</span>
    </div>
  )
}

interface FaviconScoreProps {
  state: EditState
}

export function FaviconScore({ state }: FaviconScoreProps) {
  const favicon32 = useFaviconDataUrl(state, 32)
  const favicon16 = useFaviconDataUrl(state, 16)
  const [metrics, setMetrics] = useState<Metrics | null>(null)

  useEffect(() => {
    if (!favicon32 || !favicon16) {
      setMetrics(null)
      return
    }

    let cancelled = false

    Promise.all([
      new Promise<ImageData>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = 32; canvas.height = 32
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0)
          resolve(ctx.getImageData(0, 0, 32, 32))
        }
        img.onerror = reject
        img.src = favicon32
      }),
      new Promise<ImageData>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = 16; canvas.height = 16
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0)
          resolve(ctx.getImageData(0, 0, 16, 16))
        }
        img.onerror = reject
        img.src = favicon16
      }),
    ]).then(([d32, d16]) => {
      if (!cancelled) setMetrics(computeMetrics(d32, d16))
    }).catch(() => {})

    return () => { cancelled = true }
  }, [favicon32, favicon16])

  if (!state.imageType) return null

  return (
    <div>
      <p className="text-xs text-slate-400 font-medium mb-2 font-display uppercase tracking-wide">Favicon quality</p>
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        {metrics ? (
          <div className="flex gap-5 items-start">
            {/* Score circle */}
            <div className="flex flex-col items-center flex-none">
              <span className={`text-4xl font-bold font-display tabular-nums ${
                metrics.overall >= 70 ? 'text-emerald-500' :
                metrics.overall >= 40 ? 'text-orange-500' : 'text-red-500'
              }`}>
                {metrics.overall}
              </span>
              <span className="text-xs text-slate-400 mt-0.5 text-center leading-tight">
                {gradeLabel(metrics.overall)}
              </span>
            </div>
            {/* Metric bars */}
            <div className="flex-1 flex flex-col gap-2.5 pt-1">
              <MetricBar label="Simplicity" score={metrics.simplicity} />
              <MetricBar label="Contrast" score={metrics.contrast} />
              <MetricBar label="Legibility" score={metrics.legibility} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-1.5 bg-slate-100 rounded-full w-full animate-pulse" />
              <div className="h-1.5 bg-slate-100 rounded-full w-3/4 animate-pulse" />
              <div className="h-1.5 bg-slate-100 rounded-full w-1/2 animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
