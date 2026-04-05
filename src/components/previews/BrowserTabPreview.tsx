import type { EditState } from '../../types'
import { useFaviconDataUrl } from './useFaviconDataUrl'

export function BrowserTabPreview({ state }: { state: EditState }) {
  const favicon = useFaviconDataUrl(state, 32)

  return (
    <div>
      <p className="text-xs text-slate-400 font-medium mb-2 font-display uppercase tracking-wide">Browser tab</p>
      <div className="bg-slate-100 rounded-2xl p-3">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center bg-slate-100 px-2 pt-2 gap-1">
            <div className="flex items-center gap-1.5 bg-white rounded-t-lg px-3 py-1.5 text-xs text-slate-700 font-medium shadow-sm min-w-0 max-w-[200px]">
              {favicon
                ? <img src={favicon} alt="" className="w-4 h-4 rounded-sm flex-none" />
                : <div className="w-4 h-4 bg-slate-200 rounded-sm flex-none" />
              }
              <span className="truncate">My Website</span>
            </div>
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 text-xs">+</div>
          </div>
          <div className="bg-white px-3 py-2 border-b border-slate-100 flex items-center gap-2">
            <span className="text-slate-400 text-xs">🔒</span>
            <div className="flex-1 bg-slate-50 rounded-lg px-3 py-1 text-xs text-slate-400">
              mywebsite.com
            </div>
          </div>
          <div className="p-4 space-y-2">
            <div className="h-2 bg-slate-100 rounded w-3/4" />
            <div className="h-2 bg-slate-100 rounded w-1/2" />
          </div>
        </div>
      </div>
    </div>
  )
}
