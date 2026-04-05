import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { UploadZone } from '../UploadZone'

// Mock FileReader
class MockFileReader {
  onload: ((e: any) => void) | null = null
  result: string | null = null
  readAsDataURL(file: File) {
    this.result = `data:${file.type};base64,ZmFrZQ==`
    // Use Promise.resolve to schedule microtask (no real timers needed)
    Promise.resolve().then(() => {
      this.onload?.({ target: { result: this.result } } as any)
    })
  }
}

// Mock Image
class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  naturalWidth = 64
  naturalHeight = 64
  set src(_: string) {
    Promise.resolve().then(() => this.onload?.())
  }
}

beforeEach(() => {
  vi.stubGlobal('FileReader', MockFileReader)
  vi.stubGlobal('Image', MockImage)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('UploadZone', () => {
  it('renders the drop zone', () => {
    render(<UploadZone onImageLoaded={vi.fn()} />)
    expect(screen.getByText(/drop your logo/i)).toBeInTheDocument()
  })

  it('calls onImageLoaded with PNG file data', async () => {
    const onImageLoaded = vi.fn()
    render(<UploadZone onImageLoaded={onImageLoaded} />)

    const file = new File(['fake-png'], 'logo.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]')!
    await userEvent.upload(input as HTMLElement, file)

    // Flush all pending microtasks (FileReader + Image onload)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onImageLoaded).toHaveBeenCalled()
  })

  it('shows JPEG background color modal for JPEG files', async () => {
    render(<UploadZone onImageLoaded={vi.fn()} />)

    const file = new File(['fake-jpeg'], 'photo.jpg', { type: 'image/jpeg' })
    const input = document.querySelector('input[type="file"]')!
    await userEvent.upload(input as HTMLElement, file)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByText(/doesn't support transparency/i)).toBeInTheDocument()
  })
})
