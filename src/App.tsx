import React, { useState, useCallback, useRef } from 'react'
import { useEditState } from './hooks/useEditState'
import { UploadZone } from './components/UploadZone'
import { Editor } from './components/Editor'
import { Controls } from './components/Controls'
import { ExportButton } from './components/ExportButton'
import { BrowserTabPreview } from './components/previews/BrowserTabPreview'
import { BookmarksPreview } from './components/previews/BookmarksPreview'
import { MobileBrowserPreview } from './components/previews/MobileBrowserPreview'
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
    <div className="flex flex-col gap-6 overflow-y-auto h-full pb-4">
      {!hasImage && (
        <UploadZone onImageLoaded={(payload) => setState(payload)} />
      )}
      {hasImage && (
        <>
          <button
            onClick={() => replaceInputRef.current?.click()}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors font-medium self-start"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Replace image
          </button>
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      ),
    },
    {
      label: 'iOS & Android',
      desc: '180×180, 192×192, 512×512',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
          <line x1="12" y1="18" x2="12.01" y2="18"/>
        </svg>
      ),
    },
    {
      label: 'Live preview',
      desc: 'See changes in real time',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      ),
    },
    {
      label: 'One-click export',
      desc: 'ZIP with all sizes + README',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      ),
    },
  ]

  const rightPanel = hasImage ? (
    <div className="flex flex-col gap-5">
      <BrowserTabPreview state={state} />
      <BookmarksPreview state={state} />
      <MobileBrowserPreview state={state} />
    </div>
  ) : (
    <div className="h-full flex flex-col">
      <div className="flex-1 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50/60 border border-orange-100 p-8 flex flex-col justify-center">
        <h2 className="font-display font-bold text-slate-800 text-2xl mb-2">
          Your logo, every platform
        </h2>
        <p className="text-base text-slate-500 mb-8">
          Upload a PNG, JPG, or SVG — get a complete favicon set in seconds.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {features.map(f => (
            <div key={f.label} className="bg-white/70 rounded-2xl p-5 flex gap-4 items-start">
              <div className="text-orange-400 mt-0.5 flex-none">
                {React.cloneElement(f.icon as React.ReactElement<React.SVGProps<SVGSVGElement>>, { width: 22, height: 22 })}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-700 mb-0.5">{f.label}</div>
                <div className="text-sm text-slate-400">{f.desc}</div>
              </div>
            </div>
          ))}
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
        <span className="text-sm text-slate-500 font-medium">✓ Free · No account needed</span>
      </header>

      {/* Desktop layout */}
      <div className="hidden md:flex h-[calc(100vh-65px)] max-w-5xl mx-auto border-x border-slate-100">
        {/* Left panel */}
        <div className="w-[440px] flex-none border-r border-slate-100 overflow-hidden px-5 py-6 flex flex-col">
          {leftPanel}
        </div>
        {/* Right panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={`flex-1 p-6 bg-slate-50/50 ${hasImage ? 'overflow-y-auto' : 'overflow-hidden'}`}>
            {rightPanel}
          </div>
          {hasImage && (
            <div className="flex-none p-4 border-t border-slate-100 bg-white">
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
