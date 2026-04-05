import { useState, useCallback, useRef } from 'react'
import { EditState, Version, DEFAULT_EDIT_STATE } from '../types'

interface UseEditStateReturn {
  state: EditState
  setState: (partial: Partial<EditState>) => void
  versions: Version[]
  addVersion: (thumbnail: string) => void
  restoreVersion: (id: string) => void
  resetState: () => void
}

export function useEditState(): UseEditStateReturn {
  const [, rerender] = useState(0)
  const stateRef = useRef<EditState>(DEFAULT_EDIT_STATE)
  const versionsRef = useRef<Version[]>([])

  const setState = useCallback((partial: Partial<EditState>) => {
    stateRef.current = { ...stateRef.current, ...partial }
    rerender(n => n + 1)
  }, [])

  const addVersion = useCallback((thumbnail: string) => {
    const newVersion: Version = {
      id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      thumbnail,
      state: { ...stateRef.current },
    }
    const next = [newVersion, ...versionsRef.current]
    versionsRef.current = next.length > 20 ? next.slice(1) : next
    rerender(n => n + 1)
  }, [])

  const restoreVersion = useCallback((id: string) => {
    const found = versionsRef.current.find(v => v.id === id)
    if (found) {
      stateRef.current = { ...found.state }
      rerender(n => n + 1)
    }
  }, [])

  const resetState = useCallback(() => {
    stateRef.current = DEFAULT_EDIT_STATE
    versionsRef.current = []
    rerender(n => n + 1)
  }, [])

  const result: UseEditStateReturn = {
    get state() { return stateRef.current },
    get versions() { return versionsRef.current },
    setState,
    addVersion,
    restoreVersion,
    resetState,
  }

  return result
}
