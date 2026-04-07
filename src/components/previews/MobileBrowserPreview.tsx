import type { EditState } from '../../types'
import { useFaviconDataUrl } from './useFaviconDataUrl'

export function MobileBrowserPreview({ state }: { state: EditState }) {
  const favicon = useFaviconDataUrl(state, 32)

  return (
    <div>
      <div className="bg-slate-100 rounded-2xl p-3">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden max-w-[240px] mx-auto">
          {/* Status bar */}
          <div className="bg-white px-4 pt-3 pb-1 flex justify-between items-center">
            <span className="text-[9px] font-semibold text-slate-700">9:41</span>
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5 items-end h-3">
                <div className="w-0.5 h-1 bg-slate-700 rounded-full" />
                <div className="w-0.5 h-1.5 bg-slate-700 rounded-full" />
                <div className="w-0.5 h-2 bg-slate-700 rounded-full" />
                <div className="w-0.5 h-3 bg-slate-700 rounded-full" />
              </div>
              <div className="w-3 h-2 border border-slate-700 rounded-[2px] relative">
                <div className="absolute inset-[1px] bg-slate-700 rounded-[1px]" />
              </div>
            </div>
          </div>
          {/* URL bar */}
          <div className="px-3 pb-3">
            <div className="bg-slate-100 rounded-xl px-3 py-2 flex items-center gap-2">
              {favicon
                ? <img src={favicon} alt="" className="w-3.5 h-3.5 rounded-sm flex-none" />
                : <div className="w-3.5 h-3.5 bg-slate-300 rounded-sm flex-none" />
              }
              <span className="text-[10px] text-slate-500 flex-1 truncate">mywebsite.com</span>
              <span className="text-[9px] text-slate-400">↻</span>
            </div>
          </div>
          {/* Page content */}
          <div className="px-3 pb-4 space-y-2">
            <div className="h-2 bg-slate-100 rounded w-3/4" />
            <div className="h-2 bg-slate-100 rounded w-1/2" />
            <div className="h-2 bg-slate-100 rounded w-5/6" />
          </div>
        </div>
      </div>
    </div>
  )
}
