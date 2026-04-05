import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Controls } from '../Controls'
import { DEFAULT_EDIT_STATE } from '../../types'

describe('Controls', () => {
  it('renders rotation slider', () => {
    render(<Controls state={DEFAULT_EDIT_STATE} onChange={vi.fn()} />)
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })

  it('renders all 4 shape mask options', () => {
    render(<Controls state={DEFAULT_EDIT_STATE} onChange={vi.fn()} />)
    expect(screen.getByTitle(/square/i)).toBeInTheDocument()
    expect(screen.getByTitle(/rounded/i)).toBeInTheDocument()
    expect(screen.getByTitle(/circle/i)).toBeInTheDocument()
    expect(screen.getByTitle(/none/i)).toBeInTheDocument()
  })

  it('calls onChange with new rotation when slider changes', async () => {
    const onChange = vi.fn()
    render(<Controls state={DEFAULT_EDIT_STATE} onChange={onChange} />)
    const slider = screen.getByRole('slider')
    await userEvent.type(slider, '{ArrowRight}')
    expect(onChange).toHaveBeenCalled()
  })

  it('calls onChange with new shapeMask when tile is clicked', async () => {
    const onChange = vi.fn()
    render(<Controls state={DEFAULT_EDIT_STATE} onChange={onChange} />)
    await userEvent.click(screen.getByTitle(/circle/i))
    expect(onChange).toHaveBeenCalledWith({ shapeMask: 'circle' })
  })
})
