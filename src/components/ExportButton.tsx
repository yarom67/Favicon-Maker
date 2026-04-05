import { useState } from 'react'
import type { EditState } from '../types'
import { buildFaviconZip } from '../lib/zipBuilder'

interface ExportButtonProps {
  state: EditState
}

export function ExportButton({ state }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const disabled = !state.imageType || isExporting

  const handleExport = async () => {
    if (disabled) return
    setIsExporting(true)
    try {
      await buildFaviconZip(state)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      className={`
        w-full py-4 rounded-2xl font-display font-semibold text-white text-base
        transition-all duration-200 shadow-sm
        ${disabled
          ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          : 'bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 shadow-orange-200 hover:shadow-orange-300 hover:shadow-md active:scale-[0.98]'
        }
      `}
    >
      {isExporting ? (
        <span className="flex items-center justify-center gap-2">
          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Exporting…
        </span>
      ) : (
        '↓ Export ZIP'
      )}
    </button>
  )
}
