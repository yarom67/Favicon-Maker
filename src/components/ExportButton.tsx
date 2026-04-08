import { useState } from 'react'
import { toast } from 'sonner'
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
      toast.success('favicon-export.zip downloaded', {
        description: 'All sizes ready — drop them in your project.',
        duration: 4000,
      })
    } catch {
      toast.error('Export failed', { description: 'Something went wrong. Please try again.' })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <span aria-live="polite" className="sr-only">
        {isExporting ? 'Exporting favicon ZIP, please wait.' : ''}
      </span>
      <button
        onClick={handleExport}
        disabled={disabled}
        aria-busy={isExporting}
        className={`
          w-full py-3.5 rounded-xl font-display font-bold text-white text-sm tracking-wide
          transition-all duration-200
          ${disabled
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 shadow-md shadow-orange-200 hover:shadow-lg hover:shadow-orange-300 active:scale-[0.98]'
          }
        `}
      >
        {isExporting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Exporting…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export ZIP
          </span>
        )}
      </button>
    </>
  )
}
