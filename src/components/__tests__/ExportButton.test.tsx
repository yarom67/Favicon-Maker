import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ExportButton } from '../ExportButton'
import { DEFAULT_EDIT_STATE } from '../../types'

vi.mock('../../lib/zipBuilder', () => ({
  buildFaviconZip: vi.fn().mockResolvedValue(undefined),
}))

describe('ExportButton', () => {
  it('renders Export ZIP label', () => {
    const state = { ...DEFAULT_EDIT_STATE, imageType: 'png' as const, imageDataUrl: 'data:image/png;base64,abc' }
    render(<ExportButton state={state} />)
    expect(screen.getByText(/export zip/i)).toBeInTheDocument()
  })

  it('is disabled when no image is loaded', () => {
    render(<ExportButton state={DEFAULT_EDIT_STATE} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('calls buildFaviconZip on click', async () => {
    const { buildFaviconZip } = await import('../../lib/zipBuilder')
    const state = { ...DEFAULT_EDIT_STATE, imageType: 'png' as const, imageDataUrl: 'data:image/png;base64,abc' }
    render(<ExportButton state={state} />)
    await userEvent.click(screen.getByRole('button'))
    expect(buildFaviconZip).toHaveBeenCalledWith(state)
  })
})
