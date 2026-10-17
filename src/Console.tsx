import { useEffect, useImperativeHandle, useRef } from 'react'
import { parseCommand } from './command'
import { complete } from './completion'
import { Input } from './Input'
import type { ConsoleHandle, ConsoleProps } from './types'
import { useConsoleState } from './useConsoleState'

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  typeof (value as PromiseLike<unknown> | null)?.then === 'function'

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

export function Console({
  programs,
  prompt = '$\u00a0',
  tabComplete,
  motd,
  style,
  className,
  ref
}: ConsoleProps) {
  const { state, dispatch, getState } = useConsoleState(motd)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const appendToStdout = (lines: string | string[]) =>
    dispatch({ type: 'append', lines: Array.isArray(lines) ? lines : [lines] })

  // Everything before the first `await` runs synchronously, so sync programs
  // write their output immediately.
  const execute = async (input: string) => {
    appendToStdout(`${prompt}${input}`)
    const argv = parseCommand(input)
    const [name] = argv
    if (name === undefined) return

    const program =
      programs && Object.hasOwn(programs, name) ? programs[name] : undefined
    if (typeof program !== 'function') {
      appendToStdout(`${name}: command not found`)
      return
    }

    try {
      let output: unknown = program({ argv })
      if (isPromiseLike(output)) output = await output
      if (typeof output === 'string' && output !== '') {
        appendToStdout(output.split('\n'))
      }
    } catch (error) {
      appendToStdout(`${name}: ${errorMessage(error)}`)
    }
  }

  const pushCommand = (command?: string | null) => {
    if (command == null) {
      const { history, index } = getState()
      const text = history[index]?.current ?? ''
      dispatch({ type: 'submit' })
      return execute(text)
    }
    dispatch({ type: 'record', command })
    return execute(command)
  }

  useImperativeHandle<ConsoleHandle, ConsoleHandle>(ref, () => ({
    pushCommand,
    appendToStdout
  }))

  const handleTab = (value: string, ntabs: number) => {
    if (typeof tabComplete === 'function') return tabComplete(value, ntabs)
    const candidates = Array.isArray(tabComplete)
      ? tabComplete
      : Object.keys(programs ?? {})
    const result = complete(value, candidates)
    // nothing more to complete: on a repeat press, show the options
    if (result.value === value && result.matches.length > 1 && ntabs > 0) {
      appendToStdout(result.matches.join(' '))
    }
    return result.value
  }

  // keep the newest output in view
  useEffect(() => {
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [state.stdout])

  const focusInput = () => {
    // don't steal focus while the user is selecting output text
    if (window.getSelection()?.isCollapsed === false) return
    inputRef.current?.focus()
  }

  return (
    <div
      ref={containerRef}
      className={className ? `rt-console ${className}` : 'rt-console'}
      style={style}
      onClick={focusInput}
    >
      <div className='rt-stdout' role='log' aria-live='polite'>
        {state.stdout.map((line) => (
          <span className='rt-line' key={line.key}>
            {line.value}
          </span>
        ))}
      </div>
      <Input
        prompt={prompt}
        value={state.history[state.index]?.current ?? ''}
        inputRef={inputRef}
        onChange={(value) => dispatch({ type: 'edit', value })}
        onSubmit={() => void pushCommand()}
        onMove={(by) => dispatch({ type: 'move', by })}
        onClearScreen={() => dispatch({ type: 'clear' })}
        onTab={handleTab}
      />
    </div>
  )
}

export default Console
