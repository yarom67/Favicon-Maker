import { useState, useCallback, useRef } from 'react'
import { useEditState } from './hooks/useEditState'
import { UploadZone } from './components/UploadZone'
import { Editor } from './components/Editor'
import { Controls } from './components/Controls'
import { ExportButton } from './components/ExportButton'
import { BrowserTabPreview } from './components/previews/BrowserTabPreview'
import { BookmarksPreview } from './components/previews/BookmarksPreview'
import { MobileBrowserPreview } from './components/previews/MobileBrowserPreview'
import { FaviconScore } from './components/FaviconScore'
import { applyEdits } from './lib/applyEdits'
import { rasterizeSvg } from './lib/svgRasterizer'
import type { EditState } from './types'

type MobileTab = 'edit' | 'preview'

async function captureVersionThumbnail(state: EditState): Promise<string | null> {
  if (!state.imageType) return null

  let imageEl: HTMLImageElement | HTMLCanvasElement
  try {
    if (state.svgString) {
      imageEl = await rasterizeSvg(state.svgString, 64)
    } else {
      imageEl = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = state.imageDataUrl!
      })
    }
  } catch {
    return null
  }

  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  applyEdits(ctx, imageEl, state, 64)
  return canvas.toDataURL('image/png')
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
  } catch { /* ignore */ }
  return { width: 512, height: 512 }
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve({ width: 512, height: 512 })
    img.src = dataUrl
  })
}

export default function App() {
  const { state, setState, addVersion } = useEditState()
  const [mobileTab, setMobileTab] = useState<MobileTab>('edit')
  const hasImage = !!state.imageType

  // Non-destructive image replace
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const [replaceJpegPending, setReplaceJpegPending] = useState<{
    dataUrl: string; width: number; height: number
  } | null>(null)
  const [replaceJpegBgColor, setReplaceJpegBgColor] = useState('#ffffff')

  const handleCommit = useCallback(async () => {
    const thumbnail = await captureVersionThumbnail(state)
    if (thumbnail) addVersion(thumbnail)
  }, [state, addVersion])

  const handleReplaceFile = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml']
    if (!allowed.includes(file.type)) return

    if (file.type === 'image/svg+xml') {
      const text = await file.text()
      const { width, height } = parseSvgDimensions(text)
      setState({ imageType: 'svg', imageDataUrl: null, svgString: text,
                 imgWidth: width, imgHeight: height, cropX: 0, cropY: 0, scale: 1 })
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = (e.target as { result: string }).result
      const { width, height } = await getImageDimensions(dataUrl)
      if (file.type === 'image/jpeg') {
        setReplaceJpegPending({ dataUrl, width, height })
      } else {
        setState({ imageType: 'png', imageDataUrl: dataUrl, svgString: null,
                   imgWidth: width, imgHeight: height, cropX: 0, cropY: 0, scale: 1 })
      }
    }
    reader.readAsDataURL(file)
    // Reset input so selecting the same file again still fires onChange
    if (replaceInputRef.current) replaceInputRef.current.value = ''
  }, [setState])

  const confirmReplaceJpeg = useCallback(() => {
    if (!replaceJpegPending) return
    setState({ imageType: 'jpeg', imageDataUrl: replaceJpegPending.dataUrl, svgString: null,
               imgWidth: replaceJpegPending.width, imgHeight: replaceJpegPending.height,
               bgColor: replaceJpegBgColor, cropX: 0, cropY: 0, scale: 1 })
    setReplaceJpegPending(null)
  }, [replaceJpegPending, replaceJpegBgColor, setState])

  const leftPanel = (
    <div className="flex flex-col gap-6">
      {!hasImage && (
        <UploadZone onImageLoaded={(payload) => setState(payload)} />
      )}

      {hasImage && (
        <>
          <button
            onClick={() => replaceInputRef.current?.click()}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors text-center"
          >
            ← Upload a different image
          </button>
          <Editor
            state={state}
            onStateChange={setState}
            onCommit={handleCommit}
          />
          <Controls state={state} onChange={setState} />
        </>
      )}

      <ExportButton state={state} />
    </div>
  )

  const rightPanel = (
    <div className="flex flex-col gap-5">
      <FaviconScore state={state} />
      <div className="grid grid-cols-2 gap-4">
        <BrowserTabPreview state={state} />
        <BookmarksPreview state={state} />
      </div>
      <div className="flex justify-center">
        <div className="w-1/2">
          <MobileBrowserPreview state={state} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Hidden file input for non-destructive image replace */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml"
        className="hidden"
        onChange={(e) => handleReplaceFile(e.target.files)}
      />

      {/* JPEG replace color picker modal */}
      {replaceJpegPending && (
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
                value={replaceJpegBgColor}
                onChange={(e) => setReplaceJpegBgColor(e.target.value)}
                className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer"
              />
              <span className="text-slate-600 font-mono text-sm">{replaceJpegBgColor}</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setReplaceJpegPending(null)}
                className="flex-1 py-3 rounded-xl font-display font-semibold text-slate-500 text-sm
                           bg-slate-100 hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmReplaceJpeg}
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

      {/* Header */}
      <header className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <h1 className="font-display font-bold text-xl text-slate-900 tracking-tight">
          Favicon Maker
        </h1>
        <span className="text-xs text-slate-400 font-medium">Free · No account needed</span>
      </header>

      {/* Desktop layout */}
      <div className="hidden md:flex h-[calc(100vh-65px)] max-w-5xl mx-auto border-x border-slate-100">
        {/* Left panel */}
        <div className="w-[440px] flex-none border-r border-slate-100 overflow-y-auto px-5 py-6 flex flex-col gap-6">
          {leftPanel}
        </div>
        {/* Right panel */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <h2 className="font-display font-semibold text-slate-800 text-sm mb-5 uppercase tracking-wide">
            Live preview
          </h2>
          {rightPanel}
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden pb-20">
        <div className="p-4">
          {mobileTab === 'edit' ? leftPanel : rightPanel}
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex">
          {(['edit', 'preview'] as MobileTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`flex-1 py-4 font-display font-semibold text-sm capitalize transition-colors ${
                mobileTab === tab
                  ? 'text-orange-500 border-t-2 border-orange-500'
                  : 'text-slate-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
