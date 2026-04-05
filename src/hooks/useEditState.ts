import { useState, useCallback, useRef, useEffect } from 'react'
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
  const [state, setStateInternal] = useState<EditState>(DEFAULT_EDIT_STATE)
  const [versions, setVersions] = useState<Version[]>([])
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const setState = useCallback((partial: Partial<EditState>) => {
    setStateInternal(prev => {
      const next = { ...prev, ...partial }
      stateRef.current = next
      return next
    })
  }, [])

  const addVersion = useCallback((thumbnail: string) => {
    const newVersion: Version = {
      id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      thumbnail,
      state: { ...stateRef.current },
    }
    setVersions(prev => {
      const next = [newVersion, ...prev]
      return next.length > 20 ? next.slice(0, 20) : next
    })
  }, [])

  const restoreVersion = useCallback((id: string) => {
    setVersions(prev => {
      const found = prev.find(v => v.id === id)
      if (found) setStateInternal({ ...found.state })
      return prev
    })
  }, [])

  const resetState = useCallback(() => {
    setStateInternal({ ...DEFAULT_EDIT_STATE })
    setVersions([])
  }, [])

  return { state, setState, versions, addVersion, restoreVersion, resetState }
}
