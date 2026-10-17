import {
  useRef,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type RefObject
} from 'react'

interface InputProps {
  prompt: string
  value: string
  inputRef: RefObject<HTMLInputElement | null>
  style?: CSSProperties
  onChange: (value: string) => void
  onSubmit: () => void
  onMove: (by: number) => void
  onClearScreen: () => void
  /** Returns the new input value. */
  onTab: (value: string, ntabs: number) => string
}

export function Input({
  prompt,
  value,
  inputRef,
  style,
  onChange,
  onSubmit,
  onMove,
  onClearScreen,
  onTab
}: InputProps) {
  const tabsInARow = useRef(0)

  const moveCaret = (el: HTMLInputElement, to: number) => {
    const pos = Math.max(0, Math.min(to, el.value.length))
    el.setSelectionRange(pos, pos)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    const wasTab = e.key === 'Tab'
    if (!wasTab) tabsInARow.current = 0

    if (e.ctrlKey && !e.altKey && !e.metaKey) {
      const caret = el.selectionStart ?? 0
      switch (e.key.toLowerCase()) {
        case 'a':
          moveCaret(el, 0)
          break
        case 'e':
          moveCaret(el, el.value.length)
          break
        case 'b':
          moveCaret(el, caret - 1)
          break
        case 'f':
          moveCaret(el, caret + 1)
          break
        case 'c':
          onChange('')
          break
        case 'l':
          onClearScreen()
          break
        default:
          return
      }
      e.preventDefault()
      return
    }

    if (e.altKey || e.metaKey || e.shiftKey) return

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        onMove(-1)
        break
      case 'ArrowDown':
        e.preventDefault()
        onMove(1)
        break
      case 'Tab': {
        e.preventDefault()
        const next = onTab(el.value, tabsInARow.current)
        tabsInARow.current = next === el.value ? tabsInARow.current + 1 : 0
        if (next !== el.value) onChange(next)
        break
      }
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form className='rt-input-line' onSubmit={handleSubmit}>
      <span className='rt-prompt'>{prompt}</span>
      <input
        ref={inputRef}
        className='rt-input'
        style={style}
        type='text'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label='Terminal input'
        autoComplete='off'
        autoCapitalize='off'
        autoCorrect='off'
        spellCheck={false}
      />
    </form>
  )
}
