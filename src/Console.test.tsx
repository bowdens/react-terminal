import { act, createRef } from 'react'
import { render, screen } from '@testing-library/react'
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
