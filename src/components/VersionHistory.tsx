import type { Version } from '../types'

interface VersionHistoryProps {
  versions: Version[]
  activeId: string | null
  onRestore: (id: string) => void
}

export function VersionHistory({ versions, activeId, onRestore }: VersionHistoryProps) {
  if (versions.length === 0) return null

  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 font-display">
        Previous versions
      </p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {versions.map(v => (
          <button
            key={v.id}
            onClick={() => onRestore(v.id)}
            className={`flex-none w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
              v.id === activeId
                ? 'border-orange-400 ring-2 ring-orange-300 ring-offset-1'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <img
              src={v.thumbnail}
              alt="Version preview"
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
