import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useEditState } from '../useEditState'
import { DEFAULT_EDIT_STATE } from '../../types'

describe('useEditState', () => {
  it('initialises with default state and empty history', () => {
    const { result } = renderHook(() => useEditState())
    expect(result.current.state).toEqual(DEFAULT_EDIT_STATE)
    expect(result.current.versions).toHaveLength(0)
  })

  it('setState updates the current state', () => {
    const { result } = renderHook(() => useEditState())
    act(() => result.current.setState({ rotation: 45 }))
    expect(result.current.state.rotation).toBe(45)
  })

  it('addVersion prepends a new version and stores a snapshot', () => {
    const { result } = renderHook(() => useEditState())
    act(() => {
      result.current.setState({ rotation: 90 })
      result.current.addVersion('data:image/png;base64,abc123')
    })
    expect(result.current.versions).toHaveLength(1)
    expect(result.current.versions[0].state.rotation).toBe(90)
    expect(result.current.versions[0].thumbnail).toBe('data:image/png;base64,abc123')
  })

  it('addVersion drops oldest when versions exceed 20', () => {
    const { result } = renderHook(() => useEditState())
    act(() => {
      for (let i = 0; i < 21; i++) {
        result.current.addVersion(`data:image/png;base64,v${i}`)
      }
    })
    expect(result.current.versions).toHaveLength(20)
    // newest (v20) is at index 0 after prepend
    expect(result.current.versions[0].thumbnail).toBe('data:image/png;base64,v20')
    // oldest (v0) was dropped
    expect(result.current.versions.find(v => v.thumbnail === 'data:image/png;base64,v0')).toBeUndefined()
  })

  it('addVersion drops the oldest item — not the just-added one', () => {
    const { result } = renderHook(() => useEditState())
    act(() => {
      for (let i = 0; i < 21; i++) {
        result.current.addVersion(`data:image/png;base64,v${i}`)
      }
    })
    // With prepend + slice(0,20): v20 (most recent) is at index 0
    // v0 (oldest, index 20 before slice) is dropped
    expect(result.current.versions[0].thumbnail).toBe('data:image/png;base64,v20')
    expect(result.current.versions).toHaveLength(20)
  })

  it('restoreVersion sets state to the version snapshot', () => {
    const { result } = renderHook(() => useEditState())
    act(() => {
      result.current.setState({ rotation: 30 })
      result.current.addVersion('data:image/png;base64,snap')
    })
    const versionId = result.current.versions[0].id
    act(() => {
      result.current.setState({ rotation: 99 })
    })
    act(() => result.current.restoreVersion(versionId))
    expect(result.current.state.rotation).toBe(30)
  })
})
