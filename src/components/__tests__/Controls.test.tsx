import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Controls } from '../Controls'
import { DEFAULT_EDIT_STATE } from '../../types'

describe('Controls', () => {
  it('renders zoom and rotation sliders', () => {
    render(<Controls state={DEFAULT_EDIT_STATE} onChange={vi.fn()} />)
    const sliders = screen.getAllByRole('slider')
    expect(sliders).toHaveLength(2)
  })

  it('renders shape mask options (Square, Rounded, Circle)', () => {
    render(<Controls state={DEFAULT_EDIT_STATE} onChange={vi.fn()} />)
    expect(screen.getByTitle(/square/i)).toBeInTheDocument()
    expect(screen.getByTitle(/rounded/i)).toBeInTheDocument()
    expect(screen.getByTitle(/circle/i)).toBeInTheDocument()
    expect(screen.queryByTitle(/none/i)).not.toBeInTheDocument()
  })

  it('calls onChange with new rotation when rotation slider changes', async () => {
    const onChange = vi.fn()
    render(<Controls state={DEFAULT_EDIT_STATE} onChange={onChange} />)
    const sliders = screen.getAllByRole('slider')
    const rotationSlider = sliders[1] // Zoom is first, Rotation is second
    await userEvent.type(rotationSlider, '{ArrowRight}')
    expect(onChange).toHaveBeenCalled()
  })

  it('calls onChange with new shapeMask when tile is clicked', async () => {
    const onChange = vi.fn()
    render(<Controls state={DEFAULT_EDIT_STATE} onChange={onChange} />)
    await userEvent.click(screen.getByTitle(/circle/i))
    expect(onChange).toHaveBeenCalledWith({ shapeMask: 'circle' })
  })
})
