import type { ReactNode } from 'react'
import type { EditState, ShapeMask } from '../types'

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

const SHAPE_OPTIONS: { value: ShapeMask; label: string; preview: ReactNode }[] = [
  {
    value: 'square',
    label: 'Square',
    preview: <div className="w-8 h-8 bg-slate-700 rounded-sm" />,
  },
  {
    value: 'rounded',
    label: 'Rounded',
    preview: <div className="w-8 h-8 bg-slate-700 rounded-xl" />,
  },
  {
    value: 'circle',
    label: 'Circle',
    preview: <div className="w-8 h-8 bg-slate-700 rounded-full" />,
  },
]

const sliderClass = `w-full h-2 appearance-none bg-slate-200 rounded-full
  [&::-webkit-slider-thumb]:appearance-none
  [&::-webkit-slider-thumb]:w-4
  [&::-webkit-slider-thumb]:h-4
  [&::-webkit-slider-thumb]:rounded-full
  [&::-webkit-slider-thumb]:bg-orange-500
  [&::-webkit-slider-thumb]:cursor-pointer`

export function Controls({ state, onChange }: ControlsProps) {
  return (
    <div className="flex flex-col gap-6">

      {/* Zoom */}
      <div>
        <label className="flex items-center text-sm font-semibold text-slate-700 mb-2 font-display">
          Zoom
          <span className="ml-2 font-normal text-slate-400 text-xs">{Math.round(state.scale * 100)}%</span>
          <ResetButton onClick={() => onChange({ scale: 1 })} />
        </label>
        <input
          type="range"
          min={0.25}
          max={4}
          step={0.01}
          value={state.scale}
          onChange={(e) => onChange({ scale: Number(e.target.value) })}
          className={sliderClass}
        />
      </div>

      {/* Rotation */}
      <div>
        <label className="flex items-center text-sm font-semibold text-slate-700 mb-2 font-display">
          Rotation
          <span className="ml-2 font-normal text-slate-400 text-xs">{state.rotation}°</span>
          <ResetButton onClick={() => onChange({ rotation: 0 })} />
        </label>
        <input
          type="range"
          min={-180}
          max={180}
          value={state.rotation}
          onChange={(e) => onChange({ rotation: Number(e.target.value) })}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              onChange({ rotation: Math.min(180, state.rotation + 1) })
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              onChange({ rotation: Math.max(-180, state.rotation - 1) })
            }
          }}
          className={sliderClass}
        />
      </div>

      {/* Background color */}
      <div>
        <label className="flex items-center text-sm font-semibold text-slate-700 mb-2 font-display">
          Background
          <ResetButton onClick={() => onChange({ bgColor: '' })} />
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={state.bgColor || '#ffffff'}
            onChange={(e) => onChange({ bgColor: e.target.value })}
            className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer"
          />
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
      <div>
        <label className="flex items-center text-sm font-semibold text-slate-700 mb-2 font-display">
          Shape
          <ResetButton onClick={() => onChange({ shapeMask: 'square' })} />
        </label>
        <div className="grid grid-cols-3 gap-2">
          {SHAPE_OPTIONS.map(({ value, label, preview }) => (
            <button
              key={value}
              title={label}
              onClick={() => onChange({ shapeMask: value })}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                state.shapeMask === value
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {preview}
              <span className="text-xs text-slate-500 font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
