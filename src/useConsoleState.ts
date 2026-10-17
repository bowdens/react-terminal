import { useCallback, useRef, useState } from 'react'
import { initialState, reducer, type Action, type ConsoleState } from './state'

/**
 * A reducer whose latest state can be read synchronously. Imperative callers
 * (the ref handle) may dispatch several times before React re-renders, and
 * need each call to see the result of the previous one.
 */
export function useConsoleState(motd?: string) {
  const [state, setState] = useState(() => initialState(motd))
  const ref = useRef(state)

  const dispatch = useCallback((action: Action) => {
    ref.current = reducer(ref.current, action)
    setState(ref.current)
  }, [])

  const getState = useCallback((): ConsoleState => ref.current, [])

  return { state, dispatch, getState }
}
