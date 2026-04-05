import { useState, useCallback } from 'react'
import { useEditState } from './hooks/useEditState'
import { UploadZone } from './components/UploadZone'
import { Editor } from './components/Editor'
import { Controls } from './components/Controls'
import { VersionHistory } from './components/VersionHistory'
import { ExportButton } from './components/ExportButton'
import { BrowserTabPreview } from './components/previews/BrowserTabPreview'
import { BookmarksPreview } from './components/previews/BookmarksPreview'
import { iOSPreview as IOSPreview } from './components/previews/iOSPreview'
import { AndroidPreview } from './components/previews/AndroidPreview'
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

export default function App() {
  const { state, setState, versions, addVersion, restoreVersion } = useEditState()
  const [mobileTab, setMobileTab] = useState<MobileTab>('edit')
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null)
  const hasImage = !!state.imageType

  const handleCommit = useCallback(async () => {
    const thumbnail = await captureVersionThumbnail(state)
    if (thumbnail) addVersion(thumbnail)
  }, [state, addVersion])

  const handleRestore = useCallback((id: string) => {
    restoreVersion(id)
    setActiveVersionId(id)
  }, [restoreVersion])

  const leftPanel = (
    <div className="flex flex-col gap-6">
      {!hasImage && (
        <UploadZone onImageLoaded={(payload) => setState(payload)} />
      )}

      {hasImage && (
        <>
          <Editor
            state={state}
            onStateChange={setState}
            onCommit={handleCommit}
          />
          <Controls state={state} onChange={setState} />
          <VersionHistory
            versions={versions}
            activeId={activeVersionId}
            onRestore={handleRestore}
          />
          <button
            onClick={() => setState({
              imageType: null,
              imageDataUrl: null,
              svgString: null,
              imgWidth: 0,
              imgHeight: 0,
              cropX: 0,
              cropY: 0,
              scale: 1,
              rotation: 0,
              bgColor: '',
            })}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors text-center"
          >
            ← Upload a different image
          </button>
        </>
      )}

      <ExportButton state={state} />
    </div>
  )

  const rightPanel = (
    <div className="flex flex-col gap-6">
      <BrowserTabPreview state={state} />
      <BookmarksPreview state={state} />
      <IOSPreview state={state} />
      <AndroidPreview state={state} />
    </div>
  )

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <header className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <h1 className="font-display font-bold text-xl text-slate-900 tracking-tight">
          Favicon Maker
        </h1>
        <span className="text-xs text-slate-400 font-medium">Free · No account needed</span>
      </header>

      {/* Desktop layout */}
      <div className="hidden md:flex h-[calc(100vh-65px)]">
        {/* Left panel */}
        <div className="w-[440px] flex-none border-r border-slate-100 overflow-y-auto p-6 flex flex-col gap-6">
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
