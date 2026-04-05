import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { VersionHistory } from '../VersionHistory'
import { DEFAULT_EDIT_STATE } from '../../types'
import type { Version } from '../../types'

const mockVersions: Version[] = [
  { id: 'v1', thumbnail: 'data:image/png;base64,abc', state: { ...DEFAULT_EDIT_STATE, rotation: 45 } },
  { id: 'v2', thumbnail: 'data:image/png;base64,def', state: { ...DEFAULT_EDIT_STATE, rotation: 90 } },
]

describe('VersionHistory', () => {
  it('renders thumbnails for each version', () => {
    render(<VersionHistory versions={mockVersions} activeId={null} onRestore={vi.fn()} />)
    expect(screen.getAllByRole('img')).toHaveLength(2)
  })

  it('calls onRestore with correct version id when thumbnail clicked', async () => {
    const onRestore = vi.fn()
    render(<VersionHistory versions={mockVersions} activeId={null} onRestore={onRestore} />)
    const imgs = screen.getAllByRole('img')
    await userEvent.click(imgs[0])
    expect(onRestore).toHaveBeenCalledWith('v1')
  })

  it('shows orange ring on active version', () => {
    const { container } = render(
      <VersionHistory versions={mockVersions} activeId="v1" onRestore={vi.fn()} />
    )
    const firstBtn = container.querySelectorAll('button')[0]
    expect(firstBtn.className).toMatch(/ring-orange/)
  })

  it('renders nothing when versions array is empty', () => {
    const { container } = render(
      <VersionHistory versions={[]} activeId={null} onRestore={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })
})
