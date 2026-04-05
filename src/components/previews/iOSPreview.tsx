import type { EditState } from '../../types'
import { useFaviconDataUrl } from './useFaviconDataUrl'

const PLACEHOLDER_ICONS = [
  { color: '#3b82f6' }, { color: '#10b981' }, { color: '#f59e0b' },
  { color: '#6366f1' }, { color: '#ec4899' }, { color: '#14b8a6' },
  { color: '#f97316' }, { color: '#8b5cf6' },
]

export function iOSPreview({ state }: { state: EditState }) {
  const favicon = useFaviconDataUrl(state, 180)

  return (
    <div>
      <p className="text-xs text-slate-400 font-medium mb-2 font-display uppercase tracking-wide">iPhone home screen</p>
      <div
        className="rounded-2xl p-4"
        style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #4a2c6e 100%)' }}
      >
        <div className="grid grid-cols-4 gap-3">
          <div className="flex flex-col items-center gap-1">
            {favicon
              ? <img src={favicon} alt="Your icon" className="w-14 h-14 rounded-[22%] shadow-md" />
              : <div className="w-14 h-14 rounded-[22%] bg-white/20" />
            }
            <span className="text-white/80 text-[9px] truncate w-14 text-center">My Website</span>
          </div>
          {PLACEHOLDER_ICONS.slice(0, 7).map(({ color }, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 rounded-[22%] shadow-sm" style={{ backgroundColor: color }} />
              <span className="text-white/60 text-[9px]">App</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
