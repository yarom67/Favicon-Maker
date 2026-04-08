import React, { useState, useCallback, useRef } from 'react'
import { useEditState } from './hooks/useEditState'
import { UploadZone } from './components/UploadZone'
import { Editor } from './components/Editor'
import { Controls } from './components/Controls'
import { ExportButton } from './components/ExportButton'
import { PresetIconSlider } from './components/PresetIconSlider'
import { BrowserTabPreview } from './components/previews/BrowserTabPreview'
import { BookmarksPreview } from './components/previews/BookmarksPreview'
import { MobileBrowserPreview } from './components/previews/MobileBrowserPreview'
import { Badge } from './components/ui/badge'
import { Toaster } from './components/ui/sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './components/ui/dialog'
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
    if (replaceInputRef.current) replaceInputRef.current.value = ''
  }, [setState])

  const handlePresetFromApp = useCallback((payload: {
    imageType: 'svg'; imageDataUrl: null; svgString: string;
    imgWidth: number; imgHeight: number; bgColor: ''
  }) => {
    setState({
      imageType: payload.imageType,
      imageDataUrl: null,
      svgString: payload.svgString,
      imgWidth: payload.imgWidth,
      imgHeight: payload.imgHeight,
      bgColor: '',
      cropX: 0,
      cropY: 0,
      scale: 1,
    })
  }, [setState])

  const confirmReplaceJpeg = useCallback(() => {
    if (!replaceJpegPending) return
    setState({ imageType: 'jpeg', imageDataUrl: replaceJpegPending.dataUrl, svgString: null,
               imgWidth: replaceJpegPending.width, imgHeight: replaceJpegPending.height,
               bgColor: replaceJpegBgColor, cropX: 0, cropY: 0, scale: 1 })
    setReplaceJpegPending(null)
  }, [replaceJpegPending, replaceJpegBgColor, setState])

  const leftPanel = (
    <div className="flex flex-col gap-6 overflow-y-auto h-full pb-4">
      {!hasImage && (
        <UploadZone onImageLoaded={(payload) => setState(payload)} />
      )}
      {hasImage && (
        <>
          <button
            onClick={() => replaceInputRef.current?.click()}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium self-start
                       border border-slate-200 hover:border-slate-300 rounded-full px-3 py-1.5 transition-all bg-white hover:bg-slate-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Replace image
          </button>
          <PresetIconSlider
            onIconSelected={handlePresetFromApp}
            selectedSvg={state.imageType === 'svg' ? state.svgString : null}
          />
          <Editor
            state={state}
            onStateChange={setState}
            onCommit={handleCommit}
          />
          <Controls state={state} onChange={setState} />
        </>
      )}
    </div>
  )

  const features = [
    {
      label: 'Browser & Bookmarks',
      desc: '16×16, 32×32 + ICO bundle',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      ),
    },
    {
      label: 'iOS & Android',
      desc: '180×180, 192×192, 512×512',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
          <line x1="12" y1="18" x2="12.01" y2="18"/>
        </svg>
      ),
    },
    {
      label: 'Live preview',
      desc: 'See changes in real time',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      ),
    },
    {
      label: 'One-click export',
      desc: 'ZIP with all sizes + README',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      ),
    },
  ]

  const rightPanel = hasImage ? (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest font-display">Previews</span>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </span>
          Live
        </span>
      </div>
      <BrowserTabPreview state={state} />
      <BookmarksPreview state={state} />
      <MobileBrowserPreview state={state} />
    </div>
  ) : (
    <div className="h-full flex flex-col gap-4">
      {/* Static output preview mockup */}
      <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest font-display mb-4">What you&apos;ll get</p>
        <div className="flex items-start gap-6">
          {/* Browser tab mockup */}
          <div className="flex-1 min-w-0">
            <div className="bg-slate-100 rounded-xl p-2.5">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="flex items-center bg-slate-100 px-2 pt-1.5 gap-1">
                  <div className="flex items-center gap-1.5 bg-white rounded-t-md px-2.5 py-1 text-[10px] text-slate-700 font-medium shadow-sm min-w-0 max-w-[140px]">
                    <div className="w-3.5 h-3.5 rounded-sm flex-none bg-gradient-to-br from-orange-400 to-orange-500" />
                    <span className="truncate">My Website</span>
                  </div>
                </div>
                <div className="px-2.5 py-2 space-y-1.5">
                  <div className="h-1.5 bg-slate-100 rounded w-3/4" />
                  <div className="h-1.5 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center font-mono">Browser tab</p>
          </div>
          {/* Mobile icon mockup */}
          <div className="flex-none">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 shadow-md flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
                <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
              </svg>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center font-mono">Home screen</p>
          </div>
        </div>
      </div>

      {/* Feature grid */}
      <div className="flex-1 rounded-2xl border border-slate-100 p-7 flex flex-col justify-center bg-white shadow-sm"
        style={{ backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        <div className="bg-white/90 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="font-display font-bold text-slate-900 text-2xl tracking-tight mb-1.5">
            Your logo, every platform
          </h2>
          <p className="text-[15px] text-slate-500 mb-6 leading-relaxed">
            Upload a PNG, JPG, or SVG — get a complete favicon set in seconds.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {features.map(f => (
              <div key={f.label} className="bg-slate-50 rounded-xl p-4 flex gap-3 items-start border border-slate-100">
                <div className="text-orange-500 mt-0.5 flex-none">
                  {React.cloneElement(f.icon as React.ReactElement<React.SVGProps<SVGSVGElement>>, { width: 18, height: 18 })}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-700 mb-0.5 font-display">{f.label}</div>
                  <div className="text-xs text-slate-400 leading-relaxed">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAFAF8] font-sans">
      <Toaster />

      {/* Hidden file input for non-destructive image replace */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml"
        className="hidden"
        onChange={(e) => handleReplaceFile(e.target.files)}
      />

      {/* JPEG replace color picker modal — shadcn Dialog */}
      <Dialog open={!!replaceJpegPending} onOpenChange={(open) => { if (!open) setReplaceJpegPending(null) }}>
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
              value={replaceJpegBgColor}
              onChange={(e) => setReplaceJpegBgColor(e.target.value)}
              className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer"
            />
            <span className="text-slate-500 font-mono text-sm">{replaceJpegBgColor}</span>
          </div>
          <div className="flex gap-3 mt-1">
            <button
              onClick={() => setReplaceJpegPending(null)}
              className="flex-1 py-2.5 rounded-xl font-display font-semibold text-slate-500 text-sm
                         bg-slate-100 hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={confirmReplaceJpeg}
              className="flex-1 py-2.5 rounded-xl font-display font-semibold text-white text-sm
                         bg-gradient-to-r from-orange-400 to-orange-500
                         hover:from-orange-500 hover:to-orange-600 transition-all"
            >
              Continue
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="border-b border-slate-200 px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-sm shadow-orange-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="white" stroke="none"/>
              <polyline points="21 15 16 10 5 21" strokeWidth="2.5"/>
            </svg>
          </div>
          <h1 className="font-display font-bold text-lg text-slate-900 tracking-tight">
            Favicon Maker
          </h1>
        </div>
        <Badge variant="outline" className="text-slate-500 border-slate-200 font-sans font-medium text-xs gap-1.5">
          <span className="text-green-500">✓</span> Free · No account needed
        </Badge>
      </header>

      {/* Desktop layout */}
      <div className="hidden md:flex h-[calc(100vh-57px)] max-w-7xl mx-auto border-x border-slate-200">
        {/* Left panel */}
        <div className="w-[440px] flex-none border-r border-slate-200 overflow-hidden px-5 py-6 flex flex-col relative bg-white">
          {leftPanel}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
        </div>
        {/* Right panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={`flex-1 p-6 bg-[#FAFAF8] ${hasImage ? 'overflow-y-auto' : 'overflow-hidden'}`}>
            {rightPanel}
          </div>
          {hasImage && (
            <div className="flex-none p-4 border-t border-slate-200 bg-white">
              <ExportButton state={state} />
            </div>
          )}
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden pb-20">
        <div className="p-4 flex flex-col gap-5">
          {mobileTab === 'edit' ? leftPanel : (
            <>
              {rightPanel}
              <ExportButton state={state} />
            </>
          )}
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex">
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
