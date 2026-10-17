export interface HistoryEntry {
  original: string
  current: string
}

export interface StdoutLine {
  key: number
  value: string
}

export interface ConsoleState {
  /** The last entry is always the (possibly empty) draft. */
  history: HistoryEntry[]
  index: number
  stdout: StdoutLine[]
  nextKey: number
}

export type Action =
  | { type: 'edit'; value: string }
  | { type: 'move'; by: number }
  | { type: 'append'; lines: string[] }
  | { type: 'clear' }
  /** Commit the entry at `index` as run. */
  | { type: 'submit' }
  /** Add `command` to history without touching the draft. */
  | { type: 'record'; command: string }

const emptyEntry = (): HistoryEntry => ({ original: '', current: '' })

export function initialState(motd?: string): ConsoleState {
  const lines = motd ? motd.split('\n') : []
  return {
    history: [emptyEntry()],
    index: 0,
    stdout: lines.map((value, key) => ({ key, value })),
    nextKey: lines.length
  }
}

export function reducer(state: ConsoleState, action: Action): ConsoleState {
  const last = state.history.length - 1
  switch (action.type) {
    case 'edit': {
      const history = state.history.slice()
      const entry = history[state.index]
      if (!entry) return state
      history[state.index] = { ...entry, current: action.value }
      return { ...state, history }
    }
    case 'move': {
      const index = Math.max(0, Math.min(state.index + action.by, last))
      return { ...state, index }
    }
    case 'append': {
      const added = action.lines.map((value, i) => ({
        key: state.nextKey + i,
        value
      }))
      return {
        ...state,
        stdout: [...state.stdout, ...added],
        nextKey: state.nextKey + added.length
      }
    }
    case 'clear':
      return { ...state, stdout: [] }
    case 'submit': {
      const entry = state.history[state.index]
      if (!entry) return state
      // drop the draft, and undo any edits made to an older entry
      const history = state.history.slice(0, -1)
      if (state.index !== last) {
        history[state.index] = { ...entry, current: entry.original }
      }
      if (entry.current.trim() !== '') {
        history.push({ original: entry.current, current: entry.current })
      }
      history.push(emptyEntry())
      return { ...state, history, index: history.length - 1 }
    }
    case 'record': {
      if (action.command.trim() === '') return state
      const history = [
        ...state.history.slice(0, -1),
        { original: action.command, current: action.command },
        ...state.history.slice(-1)
      ]
      // if we were on the draft, stay on it
      const index = state.index === last ? history.length - 1 : state.index
      return { ...state, history, index }
    }
  }
}
