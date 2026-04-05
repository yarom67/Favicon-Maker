import React, { useRef, useState, useCallback } from 'react'
import type { ImageType } from '../types'

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

export function UploadZone({ onImageLoaded }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
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
      onImageLoaded({
        imageType: 'svg',
        imageDataUrl: null,
        svgString: text,
        imgWidth: 512,
        imgHeight: 512,
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

  return (
    <>
      <div
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
        <div className="text-4xl">🖼️</div>
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
            <button
              onClick={confirmJpegBg}
              className="w-full py-3 rounded-xl font-display font-semibold text-white text-sm
                         bg-gradient-to-r from-orange-400 to-orange-500
                         hover:from-orange-500 hover:to-orange-600 transition-all"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </>
  )
}
