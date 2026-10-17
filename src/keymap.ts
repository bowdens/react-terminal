/**
 * Readline-style key bindings, kept free of React and the DOM so they can be
 * tested directly. `resolveKey` maps a key chord to a named command, and
 * `editLine` / `insertLastArg` / `searchHistory` implement the commands that
 * work on text.
 */

export interface KeyInput {
  key: string
  code: string
  ctrl: boolean
  alt: boolean
  meta: boolean
  shift: boolean
}

export type EditCommand =
  | 'line-start'
  | 'line-end'
  | 'char-back'
  | 'char-forward'
  | 'word-back'
  | 'word-forward'
  | 'delete-char'
  | 'backspace'
  | 'kill-to-end'
  | 'kill-to-start'
  | 'kill-word-back'
  | 'kill-word-forward'
  | 'unix-word-rubout'
  | 'yank'
  | 'transpose-chars'
  | 'transpose-words'
  | 'upcase-word'
  | 'downcase-word'
  | 'capitalize-word'

export type Command =
  | EditCommand
  | 'last-arg'
  | 'undo'
  | 'history-prev'
  | 'history-next'
  | 'history-first'
  | 'history-last'
  | 'search'
  | 'interrupt'
  | 'clear-screen'
  | 'eof'
  /** Ctrl-X, the prefix for two-key chords such as Ctrl-X Ctrl-U. */
  | 'chord-x'

const CTRL = new Map<string, Command>([
  ['a', 'line-start'],
  ['e', 'line-end'],
  ['b', 'char-back'],
  ['f', 'char-forward'],
  ['d', 'eof'],
  ['h', 'backspace'],
  ['k', 'kill-to-end'],
  ['u', 'kill-to-start'],
  ['w', 'unix-word-rubout'],
  ['y', 'yank'],
  ['t', 'transpose-chars'],
  ['p', 'history-prev'],
  ['n', 'history-next'],
  ['r', 'search'],
  ['c', 'interrupt'],
  ['l', 'clear-screen'],
  ['x', 'chord-x'],
  ['z', 'undo'],
  ['_', 'undo'],
  ['/', 'undo'],
  ['ArrowLeft', 'word-back'],
  ['ArrowRight', 'word-forward'],
  ['Backspace', 'kill-word-back'],
  ['Delete', 'kill-word-forward']
])

const ALT_CODES = new Map<string, Command>([
  ['KeyB', 'word-back'],
  ['KeyF', 'word-forward'],
  ['KeyD', 'kill-word-forward'],
  ['KeyT', 'transpose-words'],
  ['KeyU', 'upcase-word'],
  ['KeyL', 'downcase-word'],
  ['KeyC', 'capitalize-word'],
  ['Period', 'last-arg'],
  ['ArrowLeft', 'word-back'],
  ['ArrowRight', 'word-forward'],
  ['Backspace', 'kill-word-back']
])

const PLAIN = new Map<string, Command>([
  ['ArrowUp', 'history-prev'],
  ['ArrowDown', 'history-next']
])

/**
 * Alt bindings use `code` rather than `key`, because on macOS Option+B types
 * a character (∫) instead of reporting "b".
 */
export function resolveKey(k: KeyInput, afterCtrlX = false): Command | null {
  if (k.meta) return null

  if (k.ctrl && !k.alt) {
    const letter = /^[a-z]$/i.test(k.key)
    // Ctrl-Shift-C and friends belong to the browser
    if (k.shift && letter) return null
    const key = k.key.length === 1 ? k.key.toLowerCase() : k.key
    if (afterCtrlX) return key === 'u' ? 'undo' : null
    return CTRL.get(key) ?? null
  }

  if (k.alt && !k.ctrl) {
    if (k.key === '<' || (k.shift && k.code === 'Comma')) return 'history-first'
    if (k.key === '>' || (k.shift && k.code === 'Period')) return 'history-last'
    if (k.shift) return null
    return ALT_CODES.get(k.code) ?? null
  }

  if (!k.ctrl && !k.alt && !k.shift) return PLAIN.get(k.key) ?? null
  return null
}

export interface Line {
  value: string
  caret: number
}

export interface Edit extends Line {
  /** Set when text was killed; replaces the kill buffer. */
  kill?: string
}

const isWordChar = (c: string | undefined) =>
  c !== undefined && /[\p{L}\p{N}]/u.test(c)
const isSpace = (c: string | undefined) => c !== undefined && /\s/.test(c)

/** Start of the word before `pos` (words are letters and digits). */
export function wordBack(value: string, pos: number): number {
  let i = pos
  while (i > 0 && !isWordChar(value[i - 1])) i--
  while (i > 0 && isWordChar(value[i - 1])) i--
  return i
}

/** End of the word at or after `pos`. */
export function wordForward(value: string, pos: number): number {
  let i = pos
  while (i < value.length && !isWordChar(value[i])) i++
  while (i < value.length && isWordChar(value[i])) i++
  return i
}

function spaceWordBack(value: string, pos: number): number {
  let i = pos
  while (i > 0 && isSpace(value[i - 1])) i--
  while (i > 0 && !isSpace(value[i - 1])) i--
  return i
}

const clamp = (n: number, max: number) => Math.max(0, Math.min(n, max))

function kill(value: string, from: number, to: number): Edit {
  if (from >= to) return { value, caret: from }
  return {
    value: value.slice(0, from) + value.slice(to),
    caret: from,
    kill: value.slice(from, to)
  }
}

function transformWord(
  { value, caret }: Line,
  transform: (word: string) => string
): Edit {
  const end = wordForward(value, caret)
  let start = caret
  while (start < end && !isWordChar(value[start])) start++
  return {
    value:
      value.slice(0, start) +
      transform(value.slice(start, end)) +
      value.slice(end),
    caret: end
  }
}

function transposeWords({ value, caret }: Line): Edit {
  const unchanged = { value, caret }
  let end2 = wordForward(value, caret)
  const start2 = wordBack(value, end2)
  end2 = wordForward(value, start2)
  const start1 = wordBack(value, start2)
  const end1 = wordForward(value, start1)
  if (!(start1 < end1 && end1 <= start2 && start2 < end2)) return unchanged
  return {
    value:
      value.slice(0, start1) +
      value.slice(start2, end2) +
      value.slice(end1, start2) +
      value.slice(start1, end1) +
      value.slice(end2),
    caret: end2
  }
}

function transposeChars({ value, caret }: Line): Edit {
  if (value.length < 2 || caret === 0) return { value, caret }
  // at the end of the line, swap the last two characters
  const at = caret >= value.length ? value.length - 1 : caret
  return {
    value:
      value.slice(0, at - 1) + value[at] + value[at - 1] + value.slice(at + 1),
    caret: at + 1
  }
}

export function editLine(
  command: EditCommand,
  line: Line,
  killBuffer: string
): Edit {
  const { value } = line
  const caret = clamp(line.caret, value.length)
  const at = { value, caret }
  switch (command) {
    case 'line-start':
      return { value, caret: 0 }
    case 'line-end':
      return { value, caret: value.length }
    case 'char-back':
      return { value, caret: clamp(caret - 1, value.length) }
    case 'char-forward':
      return { value, caret: clamp(caret + 1, value.length) }
    case 'word-back':
      return { value, caret: wordBack(value, caret) }
    case 'word-forward':
      return { value, caret: wordForward(value, caret) }
    case 'delete-char':
      return {
        value: value.slice(0, caret) + value.slice(caret + 1),
        caret
      }
    case 'backspace':
      return caret === 0
        ? at
        : {
            value: value.slice(0, caret - 1) + value.slice(caret),
            caret: caret - 1
          }
    case 'kill-to-end':
      return kill(value, caret, value.length)
    case 'kill-to-start':
      return kill(value, 0, caret)
    case 'kill-word-back':
      return kill(value, wordBack(value, caret), caret)
    case 'kill-word-forward':
      return kill(value, caret, wordForward(value, caret))
    case 'unix-word-rubout':
      return kill(value, spaceWordBack(value, caret), caret)
    case 'yank':
      return {
        value: value.slice(0, caret) + killBuffer + value.slice(caret),
        caret: caret + killBuffer.length
      }
    case 'transpose-chars':
      return transposeChars(at)
    case 'transpose-words':
      return transposeWords(at)
    case 'upcase-word':
      return transformWord(at, (w) => w.toUpperCase())
    case 'downcase-word':
      return transformWord(at, (w) => w.toLowerCase())
    case 'capitalize-word':
      return transformWord(
        at,
        (w) => w.slice(0, 1).toUpperCase() + w.slice(1).toLowerCase()
      )
  }
}

export interface LastArgState {
  /** How many commands back the inserted argument came from. */
  n: number
  start: number
  end: number
}

/**
 * Alt-. : insert the last argument of the previous command. Repeating it
 * replaces the inserted text with the last argument of an earlier command.
 */
export function insertLastArg(
  { value, caret }: Line,
  history: string[],
  previous: LastArgState | null
): (Line & { lastArg: LastArgState }) | null {
  const n = previous ? previous.n + 1 : 1
  const arg = history[history.length - n]?.trim().split(/\s+/).pop()
  if (!arg) return null
  const start = previous ? previous.start : caret
  const end = previous ? previous.end : caret
  const newEnd = start + arg.length
  return {
    value: value.slice(0, start) + arg + value.slice(end),
    caret: newEnd,
    lastArg: { n, start, end: newEnd }
  }
}

/**
 * Find the next command containing `query`, walking from index `from` in
 * direction `step`. `skip` ignores commands equal to the current match so
 * that repeated entries are only visited once. Returns -1 if none match.
 */
export function searchHistory(
  commands: string[],
  query: string,
  from: number,
  step: 1 | -1,
  skip?: string
): number {
  for (let i = from; i >= 0 && i < commands.length; i += step) {
    const command = commands[i]
    if (command !== undefined && command !== skip && command.includes(query)) {
      return i
    }
  }
  return -1
}
