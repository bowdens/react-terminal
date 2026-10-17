import {
  editLine,
  insertLastArg,
  resolveKey,
  searchHistory,
  type EditCommand,
  type KeyInput
} from './keymap'

const key = (k: string, mods: Partial<KeyInput> = {}): KeyInput => ({
  key: k,
  code: '',
  ctrl: false,
  alt: false,
  meta: false,
  shift: false,
  ...mods
})
const ctrl = (k: string, mods: Partial<KeyInput> = {}) =>
  key(k, { ctrl: true, ...mods })
const alt = (code: string, mods: Partial<KeyInput> = {}) =>
  key('', { alt: true, code, ...mods })

// "|" marks the caret
const run = (command: EditCommand, text: string, kill = '') => {
  const caret = text.indexOf('|')
  const value = text.replace('|', '')
  const r = editLine(command, { value, caret }, kill)
  return {
    text: r.value.slice(0, r.caret) + '|' + r.value.slice(r.caret),
    kill: r.kill
  }
}

describe('resolveKey', () => {
  it('maps ctrl chords', () => {
    expect(resolveKey(ctrl('a'))).toBe('line-start')
    expect(resolveKey(ctrl('R'))).toBe('search')
    expect(resolveKey(ctrl('_', { shift: true }))).toBe('undo')
    expect(resolveKey(ctrl('ArrowLeft'))).toBe('word-back')
    expect(resolveKey(ctrl('Backspace'))).toBe('kill-word-back')
  })

  it('leaves unbound and browser chords alone', () => {
    expect(resolveKey(ctrl('v'))).toBeNull()
    expect(resolveKey(ctrl('C', { shift: true }))).toBeNull()
    expect(resolveKey(ctrl('a', { meta: true }))).toBeNull()
    expect(resolveKey(key('a'))).toBeNull()
  })

  it('maps alt chords by physical key', () => {
    expect(resolveKey(alt('KeyB', { key: '∫' }))).toBe('word-back')
    expect(resolveKey(alt('Period'))).toBe('last-arg')
    expect(resolveKey(alt('Comma', { shift: true, key: '<' }))).toBe(
      'history-first'
    )
    expect(resolveKey(alt('Period', { shift: true, key: '>' }))).toBe(
      'history-last'
    )
  })

  it('only treats ctrl-u as a command after ctrl-x', () => {
    expect(resolveKey(ctrl('u'), true)).toBe('undo')
    expect(resolveKey(ctrl('a'), true)).toBeNull()
    expect(resolveKey(ctrl('x'))).toBe('chord-x')
  })

  it('maps history keys', () => {
    expect(resolveKey(key('ArrowUp'))).toBe('history-prev')
    expect(resolveKey(key('ArrowDown', { shift: true }))).toBeNull()
  })
})

describe('editLine', () => {
  it('moves by character and clamps', () => {
    expect(run('char-back', 'ab|c').text).toBe('a|bc')
    expect(run('char-back', '|abc').text).toBe('|abc')
    expect(run('char-forward', 'abc|').text).toBe('abc|')
    expect(run('line-start', 'ab|c').text).toBe('|abc')
    expect(run('line-end', 'a|bc').text).toBe('abc|')
  })

  it('moves by word', () => {
    expect(run('word-back', 'foo bar|').text).toBe('foo |bar')
    expect(run('word-back', 'foo   |bar').text).toBe('|foo   bar')
    expect(run('word-back', 'foo-ba|r').text).toBe('foo-|bar')
    expect(run('word-forward', '|foo bar').text).toBe('foo| bar')
    expect(run('word-forward', 'foo| bar').text).toBe('foo bar|')
    expect(run('word-forward', 'foo bar|').text).toBe('foo bar|')
  })

  it('deletes characters', () => {
    expect(run('delete-char', 'a|bc').text).toBe('a|c')
    expect(run('delete-char', 'abc|').text).toBe('abc|')
    expect(run('backspace', 'ab|c').text).toBe('a|c')
    expect(run('backspace', '|abc').text).toBe('|abc')
  })

  it('kills text into the kill buffer', () => {
    expect(run('kill-to-end', 'ab|cd')).toEqual({ text: 'ab|', kill: 'cd' })
    expect(run('kill-to-start', 'ab|cd')).toEqual({ text: '|cd', kill: 'ab' })
    expect(run('kill-word-back', 'foo bar|')).toEqual({
      text: 'foo |',
      kill: 'bar'
    })
    expect(run('kill-word-forward', 'foo| bar baz')).toEqual({
      text: 'foo| baz',
      kill: ' bar'
    })
    expect(run('unix-word-rubout', 'ls some-dir/file.txt|')).toEqual({
      text: 'ls |',
      kill: 'some-dir/file.txt'
    })
  })

  it('does not clobber the kill buffer when nothing is killed', () => {
    expect(run('kill-to-end', 'abc|').kill).toBeUndefined()
    expect(run('kill-to-start', '|abc').kill).toBeUndefined()
  })

  it('yanks the kill buffer', () => {
    expect(run('yank', 'a|d', 'bc').text).toBe('abc|d')
  })

  it('transposes characters', () => {
    expect(run('transpose-chars', 'a|bc').text).toBe('ba|c')
    expect(run('transpose-chars', 'abc|').text).toBe('acb|')
    expect(run('transpose-chars', '|abc').text).toBe('|abc')
    expect(run('transpose-chars', 'a|').text).toBe('a|')
  })

  it('transposes words', () => {
    expect(run('transpose-words', 'foo bar|').text).toBe('bar foo|')
    expect(run('transpose-words', 'foo| bar baz').text).toBe('bar foo| baz')
    expect(run('transpose-words', 'foo bar |baz').text).toBe('foo baz bar|')
    expect(run('transpose-words', 'foo|').text).toBe('foo|')
  })

  it('changes case', () => {
    expect(run('upcase-word', '|foo bar').text).toBe('FOO| bar')
    expect(run('downcase-word', '|FOO BAR').text).toBe('foo| BAR')
    expect(run('capitalize-word', '|fOO bar').text).toBe('Foo| bar')
    expect(run('upcase-word', 'f|oo bar').text).toBe('fOO| bar')
  })
})

describe('insertLastArg', () => {
  const history = ['echo one', 'ls two three']

  it('inserts the last argument of the previous command', () => {
    const r = insertLastArg({ value: 'x ', caret: 2 }, history, null)
    expect(r?.value).toBe('x three')
    expect(r?.caret).toBe(7)
  })

  it('cycles to earlier commands when repeated', () => {
    const first = insertLastArg({ value: 'x ', caret: 2 }, history, null)
    const second = insertLastArg(first!, history, first!.lastArg)
    expect(second?.value).toBe('x one')
    expect(insertLastArg(second!, history, second!.lastArg)).toBeNull()
  })

  it('does nothing without history', () => {
    expect(insertLastArg({ value: '', caret: 0 }, [], null)).toBeNull()
  })
})

describe('searchHistory', () => {
  const commands = ['echo a', 'ls', 'echo b', 'ls']

  it('searches backwards and forwards', () => {
    expect(searchHistory(commands, 'echo', 3, -1)).toBe(2)
    expect(searchHistory(commands, 'echo', 1, 1)).toBe(2)
    expect(searchHistory(commands, 'nope', 3, -1)).toBe(-1)
  })

  it('skips repeats of the current match', () => {
    expect(searchHistory(commands, 'ls', 2, -1, 'ls')).toBe(-1)
    expect(searchHistory(commands, 'e', 1, -1, 'echo b')).toBe(0)
  })
})
