import { initialState, reducer, type ConsoleState } from './state'

const run = (
  state: ConsoleState,
  ...actions: Parameters<typeof reducer>[1][]
) => actions.reduce(reducer, state)

const texts = (s: ConsoleState) => s.history.map((h) => h.current)

describe('reducer', () => {
  it('starts with an empty draft and the motd', () => {
    const s = initialState('a\nb')
    expect(texts(s)).toEqual([''])
    expect(s.stdout.map((l) => l.value)).toEqual(['a', 'b'])
  })

  it('submitting commits the draft and adds a new one', () => {
    const s = run(
      initialState(),
      { type: 'edit', value: 'ls' },
      { type: 'submit' }
    )
    expect(texts(s)).toEqual(['ls', ''])
    expect(s.index).toBe(1)
  })

  it('does not record blank commands', () => {
    const s = run(
      initialState(),
      { type: 'edit', value: '  ' },
      { type: 'submit' }
    )
    expect(texts(s)).toEqual([''])
  })

  it('restores an edited older entry and appends the edit', () => {
    let s = run(
      initialState(),
      { type: 'edit', value: 'one' },
      { type: 'submit' },
      { type: 'move', by: -1 },
      { type: 'edit', value: 'two' }
    )
    expect(texts(s)).toEqual(['two', ''])
    s = reducer(s, { type: 'submit' })
    expect(texts(s)).toEqual(['one', 'two', ''])
    expect(s.index).toBe(2)
  })

  it('clamps navigation', () => {
    const s = run(
      initialState(),
      { type: 'move', by: -5 },
      { type: 'move', by: 5 }
    )
    expect(s.index).toBe(0)
  })

  it('record keeps the draft and follows it', () => {
    const s = run(
      initialState(),
      { type: 'edit', value: 'typing' },
      { type: 'record', command: 'echo hi' }
    )
    expect(texts(s)).toEqual(['echo hi', 'typing'])
    expect(s.index).toBe(1)
  })

  it('successive appends keep unique keys, even after clear', () => {
    const s = run(
      initialState(),
      { type: 'append', lines: ['a', 'b'] },
      { type: 'append', lines: ['c'] }
    )
    expect(s.stdout.map((l) => l.key)).toEqual([0, 1, 2])
    const cleared = run(s, { type: 'clear' }, { type: 'append', lines: ['d'] })
    expect(cleared.stdout).toEqual([{ key: 3, value: 'd' }])
  })
})
