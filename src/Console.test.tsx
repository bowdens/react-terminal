import { act, createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Console, type ConsoleHandle, type Programs } from '.'

const programs: Programs = {
  echo: ({ argv: [, ...args] }) => args.join(' '),
  echolocation: () => 'ping',
  emu: () => 'a bird',
  multi: () => 'one\ntwo',
  slow: async () => 'done later',
  boom: () => {
    throw new Error('kaboom')
  }
}

const setup = (props = {}) => {
  const ref = createRef<ConsoleHandle>()
  const user = userEvent.setup()
  render(<Console programs={programs} ref={ref} {...props} />)
  const input = screen.getByRole('textbox') as HTMLInputElement
  return { user, input, ref }
}

const lines = () =>
  Array.from(document.querySelectorAll('.rt-line')).map((n) => n.textContent)

describe('Console', () => {
  it('renders the motd', () => {
    setup({ motd: 'hello\nworld' })
    expect(lines()).toEqual(['hello', 'world'])
  })

  it('runs a program and echoes the prompt', async () => {
    const { user } = setup({ prompt: '> ' })
    await user.type(screen.getByRole('textbox'), 'echo hi there{Enter}')
    expect(lines()).toEqual(['> echo hi there', 'hi there'])
  })

  it('splits multi-line output', async () => {
    const { user } = setup({ prompt: '' })
    await user.type(screen.getByRole('textbox'), 'multi{Enter}')
    expect(lines()).toEqual(['multi', 'one', 'two'])
  })

  it('reports unknown commands, including inherited property names', async () => {
    const { user } = setup({ prompt: '' })
    await user.type(
      screen.getByRole('textbox'),
      'nope{Enter}constructor{Enter}'
    )
    expect(lines()).toEqual([
      'nope',
      'nope: command not found',
      'constructor',
      'constructor: command not found'
    ])
  })

  it('reports errors thrown by programs', async () => {
    const { user } = setup({ prompt: '' })
    await user.type(screen.getByRole('textbox'), 'boom{Enter}')
    expect(lines()).toEqual(['boom', 'boom: kaboom'])
  })

  it('supports async programs', async () => {
    const { user } = setup({ prompt: '' })
    await user.type(screen.getByRole('textbox'), 'slow{Enter}')
    expect(await screen.findByText('done later')).toBeInTheDocument()
  })

  it('navigates history with the arrow keys', async () => {
    const { user, input } = setup()
    await user.type(input, 'echo one{Enter}echo two{Enter}')
    expect(input).toHaveValue('')
    await user.keyboard('{ArrowUp}')
    expect(input).toHaveValue('echo two')
    await user.keyboard('{ArrowUp}')
    expect(input).toHaveValue('echo one')
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(input).toHaveValue('')
  })

  it('handles ctrl shortcuts', async () => {
    const { user, input } = setup({ prompt: '' })
    await user.type(input, 'echo abc')
    await user.keyboard('{Control>}a{/Control}')
    expect(input.selectionStart).toBe(0)
    await user.keyboard('{Control>}e{/Control}')
    expect(input.selectionStart).toBe(8)
    await user.keyboard('{Control>}c{/Control}')
    expect(input).toHaveValue('')
    await user.type(input, 'emu{Enter}')
    expect(lines().length).toBeGreaterThan(0)
    await user.keyboard('{Control>}l{/Control}')
    expect(lines()).toEqual([])
  })

  describe('readline shortcuts', () => {
    const ctrl = (k: string) => `{Control>}${k}{/Control}`
    const alt = (k: string) => `{Alt>}${k}{/Alt}`

    it('kills and yanks', async () => {
      const { user, input } = setup({ prompt: '' })
      await user.type(input, 'echo one two')
      await user.keyboard(ctrl('w'))
      expect(input).toHaveValue('echo one ')
      await user.keyboard(ctrl('a') + ctrl('k'))
      expect(input).toHaveValue('')
      await user.keyboard(ctrl('y'))
      expect(input).toHaveValue('echo one ')
      await user.keyboard(ctrl('u'))
      expect(input).toHaveValue('')
    })

    it('moves and edits by word', async () => {
      const { user, input } = setup({ prompt: '' })
      await user.type(input, 'echo one two')
      await user.keyboard(alt('b') + alt('b'))
      expect(input.selectionStart).toBe(5)
      await user.keyboard(alt('d'))
      expect(input).toHaveValue('echo  two')
      await user.keyboard(alt('f'))
      expect(input.selectionStart).toBe(9)
    })

    it('inserts at the caret and keeps it there', async () => {
      const { user, input } = setup({ prompt: '' })
      await user.type(input, 'echo ac')
      await user.keyboard(ctrl('b') + 'b')
      expect(input).toHaveValue('echo abc')
      expect(input.selectionStart).toBe(7)
    })

    it('deletes with ctrl-d and ctrl-h', async () => {
      const { user, input } = setup({ prompt: '' })
      await user.type(input, 'abcd')
      await user.keyboard(ctrl('a') + ctrl('d'))
      expect(input).toHaveValue('bcd')
      await user.keyboard(ctrl('e') + ctrl('h'))
      expect(input).toHaveValue('bc')
    })

    it('calls onExit for ctrl-d on an empty line only', async () => {
      const onExit = vi.fn()
      const { user, input } = setup({ prompt: '', onExit })
      await user.type(input, 'a')
      await user.keyboard(ctrl('a') + ctrl('d'))
      expect(input).toHaveValue('')
      expect(onExit).not.toHaveBeenCalled()
      await user.keyboard(ctrl('d'))
      expect(onExit).toHaveBeenCalledTimes(1)
    })

    it('ignores ctrl-d on an empty line without onExit', async () => {
      const { user, input } = setup({ prompt: '' })
      await user.click(input)
      await user.keyboard(ctrl('d'))
      expect(input).toHaveValue('')
    })

    it('echoes ^C and abandons the line', async () => {
      const { user, input } = setup({ prompt: '> ' })
      await user.type(input, 'emu{Enter}echo hi')
      await user.keyboard('{ArrowUp}x' + ctrl('c'))
      expect(lines().slice(-1)).toEqual(['> emux^C'])
      expect(input).toHaveValue('')
      // the edited history entry was restored
      await user.keyboard('{ArrowUp}')
      expect(input).toHaveValue('emu')
    })

    it('transposes characters and words', async () => {
      const { user, input } = setup({ prompt: '' })
      await user.type(input, 'ab')
      await user.keyboard(ctrl('t'))
      expect(input).toHaveValue('ba')
      await user.clear(input)
      await user.type(input, 'foo bar')
      await user.keyboard(alt('t'))
      expect(input).toHaveValue('bar foo')
    })

    it('changes the case of words', async () => {
      const { user, input } = setup({ prompt: '' })
      await user.type(input, 'echo hello')
      await user.keyboard(alt('b') + alt('u'))
      expect(input).toHaveValue('echo HELLO')
      await user.keyboard(alt('b') + alt('l'))
      expect(input).toHaveValue('echo hello')
      await user.keyboard(alt('b') + alt('c'))
      expect(input).toHaveValue('echo Hello')
    })

    it('undoes edits', async () => {
      const { user, input } = setup({ prompt: '' })
      await user.type(input, 'echo hi')
      await user.keyboard(ctrl('w'))
      expect(input).toHaveValue('echo ')
      await user.keyboard(ctrl('z'))
      expect(input).toHaveValue('echo hi')
      // typing is undone as one run
      await user.keyboard(ctrl('z'))
      expect(input).toHaveValue('')
      await user.type(input, 'abc')
      await user.keyboard(ctrl('x') + ctrl('u'))
      expect(input).toHaveValue('')
    })

    it('inserts the last argument with alt-.', async () => {
      const { user, input } = setup({ prompt: '' })
      await user.type(input, 'echo one two{Enter}echo x{Enter}echo ')
      const altPeriod = () =>
        fireEvent.keyDown(input, { key: '.', code: 'Period', altKey: true })
      altPeriod()
      expect(input).toHaveValue('echo x')
      altPeriod()
      expect(input).toHaveValue('echo two')
    })

    it('ctrl-p and ctrl-n move through history', async () => {
      const { user, input } = setup({ prompt: '' })
      await user.type(input, 'emu{Enter}echo a{Enter}')
      await user.keyboard(ctrl('p'))
      expect(input).toHaveValue('echo a')
      await user.keyboard(ctrl('p'))
      expect(input).toHaveValue('emu')
      await user.keyboard(ctrl('n'))
      expect(input).toHaveValue('echo a')
    })

    it('jumps to the ends of history', async () => {
      const { user, input } = setup({ prompt: '' })
      await user.type(input, 'emu{Enter}echo a{Enter}echo b{Enter}')
      fireEvent.keyDown(input, { key: '<', code: 'Comma', altKey: true })
      expect(input).toHaveValue('emu')
      fireEvent.keyDown(input, { key: '>', code: 'Period', altKey: true })
      expect(input).toHaveValue('')
    })

    it('leaves copy alone when text is selected', async () => {
      const { user, input } = setup({ prompt: '' })
      await user.type(input, 'abc')
      input.setSelectionRange(0, 3)
      await user.keyboard(ctrl('c'))
      expect(input).toHaveValue('abc')
    })
  })

  describe('reverse search', () => {
    const ctrl = (k: string) => `{Control>}${k}{/Control}`
    const prompt = () => document.querySelector('.rt-prompt')?.textContent

    const withHistory = async () => {
      const s = setup({ prompt: '$ ' })
      await s.user.type(s.input, 'echo one{Enter}emu{Enter}echo two{Enter}')
      return s
    }

    it('finds the latest match and steps back with ctrl-r', async () => {
      const { user, input } = await withHistory()
      await user.keyboard(ctrl('r') + 'echo')
      expect(prompt()).toBe("(reverse-i-search)`echo': ")
      expect(input).toHaveValue('echo two')
      await user.keyboard(ctrl('r'))
      expect(input).toHaveValue('echo one')
      await user.keyboard(ctrl('s'))
      expect(input).toHaveValue('echo two')
    })

    it('narrows with typing and backspace', async () => {
      const { user, input } = await withHistory()
      await user.keyboard(ctrl('r') + 'e')
      expect(input).toHaveValue('echo two')
      await user.keyboard('m')
      expect(input).toHaveValue('emu')
      // the current match still satisfies the shorter query
      await user.keyboard('{Backspace}')
      expect(prompt()).toBe("(reverse-i-search)`e': ")
      expect(input).toHaveValue('emu')
    })

    it('reports a failed search', async () => {
      const { user, input } = await withHistory()
      await user.keyboard(ctrl('r') + 'zzz')
      expect(prompt()).toBe("(failed reverse-i-search)`zzz': ")
      expect(input).toHaveValue('')
    })

    it('accepts a match for editing with an arrow key', async () => {
      const { user, input } = await withHistory()
      await user.keyboard(ctrl('r') + 'one{ArrowRight}')
      expect(prompt()).toBe('$ ')
      expect(input).toHaveValue('echo one')
      expect(lines().filter((l) => l === 'one')).toHaveLength(1)
    })

    it('runs the match on enter', async () => {
      const { user } = await withHistory()
      await user.keyboard(ctrl('r') + 'emu{Enter}')
      expect(lines().slice(-2)).toEqual(['$ emu', 'a bird'])
      expect(prompt()).toBe('$ ')
    })

    it('cancels with escape or ctrl-g and keeps the line', async () => {
      const { user, input } = await withHistory()
      await user.type(input, 'draft')
      await user.keyboard(ctrl('r') + 'emu{Escape}')
      expect(prompt()).toBe('$ ')
      expect(input).toHaveValue('draft')
      await user.keyboard(ctrl('r') + 'emu' + ctrl('g'))
      expect(input).toHaveValue('draft')
    })
  })

  describe('tab completion', () => {
    it('completes a unique program', async () => {
      const { user, input } = setup()
      await user.type(input, 'em{Tab}')
      expect(input).toHaveValue('emu')
    })

    it('lists matches on a repeated tab', async () => {
      const { user, input } = setup({ prompt: '' })
      await user.type(input, 'e{Tab}')
      expect(lines()).toEqual([])
      await user.keyboard('{Tab}')
      expect(lines()).toEqual(['echo echolocation emu'])
      expect(input).toHaveValue('e')
    })

    it('accepts an array of words', async () => {
      const { user, input } = setup({ tabComplete: ['alpha', 'beta'] })
      await user.type(input, 'echo be{Tab}')
      expect(input).toHaveValue('echo beta')
    })

    it('accepts a callback', async () => {
      const tabComplete = vi.fn((value: string) => value + '!')
      const { user, input } = setup({ tabComplete })
      await user.type(input, 'x{Tab}')
      expect(tabComplete).toHaveBeenCalledWith('x', 0)
      expect(input).toHaveValue('x!')
    })
  })

  describe('ref handle', () => {
    it('pushCommand runs a command and leaves the draft', async () => {
      const { user, input, ref } = setup({ prompt: '' })
      await user.type(input, 'draft')
      await act(() => ref.current!.pushCommand('echo hello'))
      expect(lines()).toEqual(['echo hello', 'hello'])
      expect(input).toHaveValue('draft')
    })

    it('pushCommand() runs the current input', async () => {
      const { user, input, ref } = setup({ prompt: '' })
      await user.type(input, 'emu')
      await act(() => ref.current!.pushCommand())
      expect(lines()).toEqual(['emu', 'a bird'])
      expect(input).toHaveValue('')
    })

    it('handles several calls in one tick', async () => {
      const { ref } = setup({ prompt: '' })
      await act(async () => {
        void ref.current!.pushCommand('echo a')
        void ref.current!.pushCommand('echo b')
        ref.current!.appendToStdout(['x', 'y'])
        ref.current!.appendToStdout('z')
      })
      expect(lines()).toEqual(['echo a', 'a', 'echo b', 'b', 'x', 'y', 'z'])
    })

    it('recorded commands appear in history', async () => {
      const { user, input, ref } = setup()
      await act(() => ref.current!.pushCommand('echo hello'))
      await user.click(input)
      await user.keyboard('{ArrowUp}')
      expect(input).toHaveValue('echo hello')
    })
  })
})
