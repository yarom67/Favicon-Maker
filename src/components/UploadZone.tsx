import React, { useRef, useState, useCallback } from 'react'
import type { ImageType } from '../types'
import { PresetIconSlider } from './PresetIconSlider'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog'

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

    const w = parseFloat(svg.getAttribute('width') || '0')
    const h = parseFloat(svg.getAttribute('height') || '0')
    if (w > 0 && h > 0) return { width: w, height: h }

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
          min-h-[200px] gap-4
          ${isDragging
            ? 'border-orange-400 bg-orange-50'
            : 'border-slate-200 bg-slate-50/50 hover:border-orange-300 hover:bg-orange-50/30'}
        `}
      >
        {/* Upload icon */}
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
          isDragging ? 'bg-orange-100 text-orange-500' : 'bg-slate-100 text-slate-400'
        }`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div className="text-center">
          <p className="font-display font-semibold text-slate-800 text-base">
            Drop your logo here
          </p>
          <p className="text-slate-400 text-sm mt-1">
            PNG, JPG, or SVG · or{' '}
            <span className="text-orange-500 font-medium underline underline-offset-2">browse files</span>
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

      {/* JPEG background color picker — shadcn Dialog */}
      <Dialog open={!!jpegPending} onOpenChange={(open) => { if (!open) setJpegPending(null) }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-slate-900">Choose a background color</DialogTitle>
            <DialogDescription className="text-slate-500 text-sm leading-relaxed">
              Your image doesn&apos;t support transparency. Pick a background color before we continue.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 my-2">
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer"
            />
            <span className="text-slate-500 font-mono text-sm">{bgColor}</span>
          </div>
          <div className="flex gap-3 mt-1">
            <button
              onClick={() => setJpegPending(null)}
              className="flex-1 py-2.5 rounded-xl font-display font-semibold text-slate-500 text-sm bg-slate-100 hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={confirmJpegBg}
              className="flex-1 py-2.5 rounded-xl font-display font-semibold text-white text-sm
                         bg-gradient-to-r from-orange-400 to-orange-500
                         hover:from-orange-500 hover:to-orange-600 transition-all"
            >
              Continue
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
