import type { EditState, ShapeMask } from '../types'
import { useFaviconDataUrl } from './previews/useFaviconDataUrl'

interface ControlsProps {
  state: EditState
  onChange: (partial: Partial<EditState>) => void
}

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Reset"
      className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium
                 text-slate-400 hover:text-slate-600 border border-slate-200
                 hover:border-slate-300 rounded-full px-2 py-0.5 transition-all"
    >
      ↺ Reset
    </button>
  )
}

const SHAPE_OPTIONS: { value: ShapeMask; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'circle', label: 'Circle' },
]

const sliderClass = `w-full h-2 appearance-none bg-slate-200 rounded-full
  [&::-webkit-slider-thumb]:appearance-none
  [&::-webkit-slider-thumb]:w-4
  [&::-webkit-slider-thumb]:h-4
  [&::-webkit-slider-thumb]:rounded-full
  [&::-webkit-slider-thumb]:bg-orange-500
  [&::-webkit-slider-thumb]:cursor-pointer
  focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2`

export function Controls({ state, onChange }: ControlsProps) {
  const faviconUrl = useFaviconDataUrl(state, 32)

  return (
    <div className="flex flex-col">

      {/* Zoom */}
      <div>
        <label className="flex items-center text-sm font-semibold text-slate-700 mb-2 font-display">
          Zoom
          <span className="ml-2 font-normal text-slate-400 text-xs">{Math.round(state.scale * 100)}%</span>
          <ResetButton onClick={() => onChange({ scale: 1 })} />
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.005}
          value={state.scale <= 1
            ? (state.scale - 0.25) / (1 - 0.25) * 0.5
            : 0.5 + (state.scale - 1) / (4 - 1) * 0.5
          }
          onChange={(e) => {
            const v = Number(e.target.value)
            const scale = v <= 0.5
              ? 0.25 + v / 0.5 * (1 - 0.25)
              : 1 + (v - 0.5) / 0.5 * (4 - 1)
            onChange({ scale: Math.round(scale * 100) / 100 })
          }}
          className={sliderClass}
        />
      </div>

      {/* Rotation */}
      <div className="pt-6 border-t border-slate-100">
        <label className="flex items-center text-sm font-semibold text-slate-700 mb-2 font-display">
          Rotation
          <span className="ml-2 font-normal text-slate-400 text-xs">{state.rotation}°</span>
          <ResetButton onClick={() => onChange({ rotation: 0 })} />
        </label>
        <div className="relative pb-4">
          <input
            type="range"
            min={-180}
            max={180}
            value={state.rotation}
            onChange={(e) => {
              const val = Number(e.target.value)
              onChange({ rotation: Math.abs(val) <= 2 ? 0 : val })
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                onChange({ rotation: Math.min(180, state.rotation + 1) })
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                onChange({ rotation: Math.max(-180, state.rotation - 1) })
              }
            }}
            className={sliderClass}
          />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 pointer-events-none">
            <div className="w-px h-2 bg-slate-300 rounded-full" />
            <span className="text-[9px] text-slate-300 leading-none">0°</span>
          </div>
        </div>
      </div>

      {/* Background color */}
      <div className="pt-6 border-t border-slate-100">
        <label htmlFor="bg-color-input" className="flex items-center text-sm font-semibold text-slate-700 mb-2 font-display">
          Background
          <ResetButton onClick={() => onChange({ bgColor: '' })} />
        </label>
        <div className="flex items-center gap-3">
          {state.bgColor ? (
            <input
              id="bg-color-input"
              type="color"
              value={state.bgColor}
              onChange={(e) => onChange({ bgColor: e.target.value })}
              className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer"
              aria-label="Background color"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer"
              style={{
                backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                backgroundSize: '8px 8px',
                backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                backgroundColor: '#fff'
              }}
              onClick={() => onChange({ bgColor: '#ffffff' })}
              title="Click to set background color (currently transparent)"
            />
          )}
          <button
            onClick={() => onChange({ bgColor: '' })}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
              !state.bgColor
                ? 'bg-slate-800 text-white'
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
      <div className="pt-6 border-t border-slate-100">
        <label className="flex items-center text-sm font-semibold text-slate-700 mb-2 font-display">
          Shape
          <ResetButton onClick={() => onChange({ shapeMask: 'square' })} />
        </label>
        <div className="grid grid-cols-3 gap-2">
          {SHAPE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              title={label}
              aria-pressed={state.shapeMask === value}
              onClick={() => onChange({ shapeMask: value })}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                state.shapeMask === value
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className={`w-8 h-8 overflow-hidden flex-none ${
                value === 'square' ? 'rounded-sm' :
                value === 'rounded' ? 'rounded-xl' :
                'rounded-full'
              }`}>
                {faviconUrl
                  ? <img src={faviconUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-slate-700" />
                }
              </div>
              <span className="text-xs text-slate-500 font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
