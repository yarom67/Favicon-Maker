import type { EditState, ShapeMask } from '../types'
import { useFaviconDataUrl } from './previews/useFaviconDataUrl'
import { Slider } from './ui/slider'
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import { RotateCcw } from 'lucide-react'

interface ControlsProps {
  state: EditState
  onChange: (partial: Partial<EditState>) => void
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest font-display mb-3">
      {children}
    </p>
  )
}

function ResetButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className="ml-auto p-1 rounded-md text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-all"
            aria-label={`Reset ${label}`}
          >
            <RotateCcw size={12} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Reset {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const SHAPE_OPTIONS: { value: ShapeMask; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'circle', label: 'Circle' },
]

export function Controls({ state, onChange }: ControlsProps) {
  const faviconUrl = useFaviconDataUrl(state, 32)

  return (
    <div className="flex flex-col divide-y divide-slate-100">

      {/* Zoom */}
      <div className="pb-6">
        <div className="flex items-center mb-3">
          <SectionLabel>Zoom</SectionLabel>
          <span className="ml-2 text-[11px] text-slate-400 font-mono -mt-0.5">{Math.round(state.scale * 100)}%</span>
          <ResetButton label="zoom" onClick={() => onChange({ scale: 1 })} />
        </div>
        <div className="relative px-1">
          <Slider
            min={0}
            max={1}
            step={0.005}
            value={[state.scale <= 1
              ? (state.scale - 0.25) / (1 - 0.25) * 0.5
              : 0.5 + (state.scale - 1) / (4 - 1) * 0.5
            ]}
            onValueChange={([v]) => {
              const snapped = Math.abs(v - 0.5) <= 0.03 ? 0.5 : v
              const scale = snapped <= 0.5
                ? 0.25 + snapped / 0.5 * (1 - 0.25)
                : 1 + (snapped - 0.5) / 0.5 * (4 - 1)
              onChange({ scale: Math.round(scale * 100) / 100 })
            }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-2 flex flex-col items-center gap-0.5 pointer-events-none">
            <div className="w-px h-1.5 bg-slate-300 rounded-full" />
            <span className="text-[9px] text-slate-300 leading-none font-mono">100%</span>
          </div>
        </div>
      </div>

      {/* Rotation */}
      <div className="py-6">
        <div className="flex items-center mb-3">
          <SectionLabel>Rotation</SectionLabel>
          <span className="ml-2 text-[11px] text-slate-400 font-mono -mt-0.5">{state.rotation}°</span>
          <ResetButton label="rotation" onClick={() => onChange({ rotation: 0 })} />
        </div>
        <div className="relative px-1">
          <Slider
            min={-180}
            max={180}
            step={1}
            value={[state.rotation]}
            onValueChange={([val]) => {
              onChange({ rotation: Math.abs(val) <= 2 ? 0 : val })
            }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-2 flex flex-col items-center gap-0.5 pointer-events-none">
            <div className="w-px h-1.5 bg-slate-300 rounded-full" />
            <span className="text-[9px] text-slate-300 leading-none font-mono">0°</span>
          </div>
        </div>
      </div>

      {/* Background color */}
      <div className="py-6">
        <div className="flex items-center mb-3">
          <SectionLabel>Background</SectionLabel>
          <ResetButton label="background" onClick={() => onChange({ bgColor: '' })} />
        </div>
        <div className="flex items-center gap-3">
          {state.bgColor ? (
            <input
              id="bg-color-input"
              type="color"
              value={state.bgColor}
              onChange={(e) => onChange({ bgColor: e.target.value })}
              className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer"
              aria-label="Background color"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors"
              style={{
                backgroundImage: 'linear-gradient(45deg, #ddd 25%, transparent 25%), linear-gradient(-45deg, #ddd 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ddd 75%), linear-gradient(-45deg, transparent 75%, #ddd 75%)',
                backgroundSize: '8px 8px',
                backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                backgroundColor: '#fff',
              }}
              onClick={() => onChange({ bgColor: '#ffffff' })}
              title="Click to set background color (currently transparent)"
            />
          )}
          <button
            onClick={() => onChange({ bgColor: '' })}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
              !state.bgColor
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            Transparent
          </button>
          {state.bgColor && (
            <span className="text-slate-400 font-mono text-xs">{state.bgColor}</span>
          )}
        </div>
      </div>

      {/* Shape mask */}
      <div className="pt-6">
        <div className="flex items-center mb-3">
          <SectionLabel>Shape</SectionLabel>
          <ResetButton label="shape" onClick={() => onChange({ shapeMask: 'square' })} />
        </div>
        <ToggleGroup
          type="single"
          value={state.shapeMask}
          onValueChange={(value) => { if (value) onChange({ shapeMask: value as ShapeMask }) }}
          className="grid grid-cols-3 gap-2"
        >
          {SHAPE_OPTIONS.map(({ value, label }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              aria-label={label}
              className="flex flex-col items-center gap-1.5 py-3 h-auto rounded-xl border border-slate-200 data-[state=on]:border-orange-400 data-[state=on]:bg-orange-50 hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              <div className={`w-8 h-8 overflow-hidden flex-none ${
                value === 'square' ? 'rounded-sm' :
                value === 'rounded' ? 'rounded-xl' :
                'rounded-full'
              }`}>
                {faviconUrl
                  ? <img src={faviconUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-slate-200" />
                }
              </div>
              <span className="text-[11px] text-slate-500 font-medium font-display">{label}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

    </div>
  )
}
