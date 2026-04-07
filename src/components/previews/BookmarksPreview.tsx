import type { EditState } from '../../types'
import { useFaviconDataUrl } from './useFaviconDataUrl'

export function BookmarksPreview({ state }: { state: EditState }) {
  const favicon = useFaviconDataUrl(state, 16)
  const bookmarks = ['My Website', 'GitHub', 'Figma', 'Notion']

  return (
    <div>
      <div className="bg-slate-100 rounded-2xl p-3">
        <div className="bg-white rounded-xl px-3 py-2 flex items-center gap-3 overflow-x-auto">
          {bookmarks.map((label, i) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-slate-700 flex-none">
              {i === 0
                ? (favicon
                    ? <img src={favicon} alt="" className="w-4 h-4 rounded-sm flex-none" />
                    : <div className="w-4 h-4 bg-slate-200 rounded-sm flex-none" />)
                : <div className="w-4 h-4 bg-slate-200 rounded-sm flex-none" />
              }
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
