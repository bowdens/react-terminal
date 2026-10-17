import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type RefObject
} from 'react'
import {
  editLine,
  insertLastArg,
  resolveKey,
  searchHistory,
  type EditCommand,
  type LastArgState
} from './keymap'

interface InputProps {
  prompt: string
  value: string
  /** Commands that have been run, oldest first. Used by Ctrl-R and Alt-. */
  history: string[]
  inputRef: RefObject<HTMLInputElement | null>
  style?: CSSProperties
  onChange: (value: string) => void
  onSubmit: () => void
  onMove: (by: number) => void
  onJump: (to: 'first' | 'last') => void
  /** Ctrl-C, with the text that was on the line. */
  onInterrupt: (value: string) => void
  onClearScreen: () => void
  /** Ctrl-D on an empty line. */
  onExit?: () => void
  /** Returns the new input value. */
  onTab: (value: string, ntabs: number) => string
}

interface Search {
  query: string
  /** Index into `history` of the current match; `history.length` for none. */
  pos: number
  direction: 'reverse' | 'forward'
  failed: boolean
}

interface Snapshot {
  value: string
  caret: number
}

const MAX_UNDO = 200

const MODIFIER_KEYS = new Set([
  'Shift',
  'Control',
  'Alt',
  'AltGraph',
  'Meta',
  'CapsLock'
])

const moveCaret = (el: HTMLInputElement, to: number) => {
  const pos = Math.max(0, Math.min(to, el.value.length))
  el.setSelectionRange(pos, pos)
}

const hasSelection = (el: HTMLInputElement) =>
  el.selectionStart !== el.selectionEnd ||
  (window.getSelection()?.toString() ?? '') !== ''

export function Input({
  prompt,
  value,
  history,
  inputRef,
  style,
  onChange,
  onSubmit,
  onMove,
  onJump,
  onInterrupt,
  onClearScreen,
  onExit,
  onTab
}: InputProps) {
  const [search, setSearch] = useState<Search | null>(null)
  const tabsInARow = useRef(0)
  const afterCtrlX = useRef(false)
  const killBuffer = useRef('')
  const lastArg = useRef<LastArgState | null>(null)
  const undoStack = useRef<Snapshot[]>([])
  const lastValue = useRef(value)
  // true while the last keys were plain typing, so that a run of typing
  // undoes in one step
  const typing = useRef(false)
  const pendingCaret = useRef<number | null>(null)

  // the value changed from outside (history, submit): old undo steps are stale
  useEffect(() => {
    if (value !== lastValue.current) {
      undoStack.current = []
      lastValue.current = value
    }
  }, [value])

  // setting a controlled input's value moves its caret to the end, so put it
  // back where the edit wanted it
  useLayoutEffect(() => {
    const el = inputRef.current
    if (pendingCaret.current !== null && el) {
      moveCaret(el, pendingCaret.current)
      pendingCaret.current = null
    }
  })

  const pushUndo = (snapshot: Snapshot) => {
    undoStack.current.push(snapshot)
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift()
  }

  /** Replace the whole line, remembering the old one for undo. */
  const commit = (
    el: HTMLInputElement,
    next: string,
    caret: number,
    // what the line held before; differs from the element while searching
    before = el.value
  ) => {
    if (next === before) {
      moveCaret(el, caret)
      return
    }
    pushUndo({ value: before, caret: el.selectionStart ?? before.length })
    typing.current = false
    lastValue.current = next
    pendingCaret.current = caret
    onChange(next)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    if (!typing.current) {
      pushUndo({ value: lastValue.current, caret: lastValue.current.length })
      typing.current = true
    }
    lastValue.current = next
    onChange(next)
  }

  const undo = (el: HTMLInputElement) => {
    const snapshot = undoStack.current.pop()
    if (!snapshot) return
    typing.current = false
    lastValue.current = snapshot.value
    if (snapshot.value === el.value) {
      moveCaret(el, snapshot.caret)
      return
    }
    pendingCaret.current = snapshot.caret
    onChange(snapshot.value)
  }

  const handleSearchKey = (e: KeyboardEvent<HTMLInputElement>, s: Search) => {
    if (MODIFIER_KEYS.has(e.key)) return
    e.preventDefault()
    const el = e.currentTarget
    const ctrl = e.ctrlKey && !e.altKey && !e.metaKey
    const letter = e.key.length === 1 ? e.key.toLowerCase() : ''
    const len = history.length
    const matched = history[s.pos]
    const step = s.direction === 'reverse' ? -1 : 1

    const accept = () => {
      if (matched !== undefined) {
        commit(el, matched, Math.max(0, matched.indexOf(s.query)), value)
      }
      setSearch(null)
    }
    // jump to the next match for `query` (including the current one)
    const refine = (query: string) => {
      const from = s.pos >= len ? (step === -1 ? len - 1 : 0) : s.pos
      const idx = searchHistory(history, query, from, step)
      setSearch(
        idx === -1
          ? { ...s, query, failed: true }
          : { ...s, query, pos: idx, failed: false }
      )
    }
    // move on to the next match in a direction (excluding the current one)
    const advance = (direction: 'reverse' | 'forward') => {
      const dir = direction === 'reverse' ? -1 : 1
      const from = s.pos >= len ? (dir === -1 ? len - 1 : len) : s.pos + dir
      const idx = searchHistory(history, s.query, from, dir, matched)
      setSearch(
        idx === -1
          ? { ...s, direction, failed: true }
          : { ...s, direction, pos: idx, failed: false }
      )
    }

    if (ctrl && letter === 'r') advance('reverse')
    else if (ctrl && letter === 's') advance('forward')
    else if (
      e.key === 'Escape' ||
      (ctrl && (letter === 'g' || letter === 'c'))
    ) {
      setSearch(null)
    } else if (e.key === 'Enter') {
      accept()
      onSubmit()
    } else if (e.key === 'Backspace' && !e.ctrlKey && !e.altKey) {
      refine(s.query.slice(0, -1))
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      refine(s.query + e.key)
    } else {
      // any other key accepts the match and leaves search
      accept()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (search) {
      handleSearchKey(e, search)
      return
    }
    const el = e.currentTarget

    const plain = !e.ctrlKey && !e.altKey && !e.metaKey
    if (plain && e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      afterCtrlX.current = false
      lastArg.current = null
      typing.current = false
      const next = onTab(el.value, tabsInARow.current)
      if (next === el.value) {
        tabsInARow.current += 1
      } else {
        tabsInARow.current = 0
        commit(el, next, next.length)
      }
      return
    }
    tabsInARow.current = 0

    const command = resolveKey(
      {
        key: e.key,
        code: e.code,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        meta: e.metaKey,
        shift: e.shiftKey
      },
      afterCtrlX.current
    )
    afterCtrlX.current = false

    const isTyping =
      plain &&
      (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete')
    if (!isTyping) typing.current = false
    if (command !== 'last-arg') lastArg.current = null
    if (command === null) return

    // with text selected, Ctrl-C copies and Ctrl-X cuts, as usual
    if (
      (command === 'interrupt' || command === 'chord-x') &&
      hasSelection(el)
    ) {
      return
    }

    e.preventDefault()
    const caret = el.selectionStart ?? el.value.length

    switch (command) {
      case 'chord-x':
        afterCtrlX.current = true
        break
      case 'undo':
        undo(el)
        break
      case 'history-prev':
        onMove(-1)
        break
      case 'history-next':
        onMove(1)
        break
      case 'history-first':
        onJump('first')
        break
      case 'history-last':
        onJump('last')
        break
      case 'search':
        setSearch({
          query: '',
          pos: history.length,
          direction: 'reverse',
          failed: false
        })
        break
      case 'interrupt':
        onInterrupt(el.value)
        break
      case 'clear-screen':
        onClearScreen()
        break
      case 'last-arg': {
        const result = insertLastArg(
          { value: el.value, caret },
          history,
          lastArg.current
        )
        if (result) {
          const previous = lastArg.current
          commit(el, result.value, result.caret)
          // keep the chain of Alt-. presses as one undo step
          if (previous) undoStack.current.pop()
          lastArg.current = result.lastArg
        }
        break
      }
      case 'eof':
        if (el.value === '') onExit?.()
        else runEdit(el, 'delete-char', caret)
        break
      default:
        runEdit(el, command, caret)
    }
  }

  const runEdit = (
    el: HTMLInputElement,
    command: EditCommand,
    caret: number
  ) => {
    const result = editLine(
      command,
      { value: el.value, caret },
      killBuffer.current
    )
    if (result.kill !== undefined) killBuffer.current = result.kill
    commit(el, result.value, result.caret)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  const shown = search ? (history[search.pos] ?? value) : value
  const label = search
    ? `(${search.failed ? 'failed ' : ''}${
        search.direction === 'reverse' ? 'reverse-i-search' : 'i-search'
      })\`${search.query}': `
    : prompt

  return (
    <form className='rt-input-line' onSubmit={handleSubmit}>
      <span className='rt-prompt'>{label}</span>
      <input
        ref={inputRef}
        className='rt-input'
        style={style}
        type='text'
        value={shown}
        readOnly={search !== null}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setSearch(null)}
        aria-label='Terminal input'
        autoComplete='off'
        autoCapitalize='off'
        autoCorrect='off'
        spellCheck={false}
      />
    </form>
  )
}
