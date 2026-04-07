import React, { useRef, useState, useCallback } from 'react'
import type { ImageType } from '../types'
import { PresetIconSlider } from './PresetIconSlider'

interface ImageLoadedPayload {
  imageType: ImageType
  imageDataUrl: string | null
  svgString: string | null
  imgWidth: number
  imgHeight: number
  bgColor: string
}

interface UploadZoneProps {
  onImageLoaded: (payload: ImageLoadedPayload) => void
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve({ width: 512, height: 512 })
    img.src = dataUrl
  })
}

function parseSvgDimensions(svgString: string): { width: number; height: number } {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgString, 'image/svg+xml')
    const svg = doc.querySelector('svg')
    if (!svg) return { width: 512, height: 512 }

    // Try width/height attributes first
    const w = parseFloat(svg.getAttribute('width') || '0')
    const h = parseFloat(svg.getAttribute('height') || '0')
    if (w > 0 && h > 0) return { width: w, height: h }

    // Fall back to viewBox
    const viewBox = svg.getAttribute('viewBox')
    if (viewBox) {
      const parts = viewBox.trim().split(/[\s,]+/)
      const vw = parseFloat(parts[2])
      const vh = parseFloat(parts[3])
      if (vw > 0 && vh > 0) return { width: vw, height: vh }
    }
  } catch {
    // ignore parse errors
  }
  return { width: 512, height: 512 }
}

export function UploadZone({ onImageLoaded }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedPresetSvg, setSelectedPresetSvg] = useState<string | null>(null)
  const [jpegPending, setJpegPending] = useState<{
    dataUrl: string
    width: number
    height: number
  } | null>(null)
  const [bgColor, setBgColor] = useState('#ffffff')

  const processFile = useCallback(async (file: File) => {
    const type = file.type

    if (type === 'image/svg+xml') {
      const text = await file.text()
      const { width, height } = parseSvgDimensions(text)
      onImageLoaded({
        imageType: 'svg',
        imageDataUrl: null,
        svgString: text,
        imgWidth: width,
        imgHeight: height,
        bgColor: '',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = (e.target as { result: string }).result
      const { width, height } = await getImageDimensions(dataUrl)
      if (type === 'image/jpeg') {
        setJpegPending({ dataUrl, width, height })
      } else {
        onImageLoaded({
          imageType: 'png',
          imageDataUrl: dataUrl,
          svgString: null,
          imgWidth: width,
          imgHeight: height,
          bgColor: '',
        })
      }
    }
    reader.readAsDataURL(file)
  }, [onImageLoaded])

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml']
    if (!allowed.includes(file.type)) return
    processFile(file)
  }, [processFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const confirmJpegBg = useCallback(() => {
    if (!jpegPending) return
    onImageLoaded({
      imageType: 'jpeg',
      imageDataUrl: jpegPending.dataUrl,
      svgString: null,
      imgWidth: jpegPending.width,
      imgHeight: jpegPending.height,
      bgColor,
    })
    setJpegPending(null)
  }, [jpegPending, bgColor, onImageLoaded])

  const handlePresetIcon = useCallback((payload: Parameters<typeof onImageLoaded>[0]) => {
    setSelectedPresetSvg(payload.svgString)
    onImageLoaded(payload)
  }, [onImageLoaded])

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload image — drop here or click to browse. Supports PNG, JPEG, SVG"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center w-full cursor-pointer
          rounded-2xl border-2 border-dashed transition-all select-none
          min-h-[220px] gap-3
          ${isDragging
            ? 'border-orange-400 bg-orange-50'
            : 'border-slate-200 bg-slate-50 hover:border-orange-300 hover:bg-orange-50/40'}
        `}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <div className="text-center">
          <p className="font-display font-semibold text-slate-800 text-base">
            Drop your logo here
          </p>
          <p className="text-slate-400 text-sm mt-1">
            PNG, JPG, or SVG · or{' '}
            <span className="text-orange-500 underline underline-offset-2">browse files</span>
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <PresetIconSlider
        onIconSelected={handlePresetIcon}
        selectedSvg={selectedPresetSvg}
      />

      {jpegPending && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-display font-semibold text-slate-900 text-lg mb-2">
              Choose a background color
            </h3>
            <p className="text-slate-500 text-sm mb-5">
              Your image doesn&apos;t support transparency. Pick a background color before we continue.
            </p>
            <div className="flex items-center gap-3 mb-6">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer"
              />
              <span className="text-slate-600 font-mono text-sm">{bgColor}</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setJpegPending(null)}
                className="flex-1 py-3 rounded-xl font-display font-semibold text-slate-500 text-sm bg-slate-100 hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmJpegBg}
                className="flex-1 py-3 rounded-xl font-display font-semibold text-white text-sm
                           bg-gradient-to-r from-orange-400 to-orange-500
                           hover:from-orange-500 hover:to-orange-600 transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
