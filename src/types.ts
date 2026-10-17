import type { CSSProperties, Ref } from 'react'

export interface ProgramContext {
  /** The command name followed by its whitespace-separated arguments. */
  argv: string[]
}

export type ProgramResult = string | null | undefined | void

/**
 * A program receives its arguments and returns text for stdout. Lines are
 * split on `\n`. It may be async.
 */
export type Program = (
  context: ProgramContext
) => ProgramResult | Promise<ProgramResult>

export type Programs = Record<string, Program>

/**
 * Either a list of words to complete against, or a function that receives the
 * current input and the number of tab presses in a row (0 on the first press)
 * and returns the new input value.
 */
export type TabComplete = string[] | ((value: string, ntabs: number) => string)

export interface ConsoleHandle {
  /**
   * Run `command` as if it had been typed. With no argument, runs whatever is
   * currently in the input. Resolves once the program has finished.
   */
  pushCommand: (command?: string | null) => Promise<void>
  /** Append one or more lines to stdout. */
  appendToStdout: (lines: string | string[]) => void
}

export interface ConsoleProps {
  programs?: Programs
  /** Defaults to "$" followed by a non-breaking space. */
  prompt?: string
  tabComplete?: TabComplete
  /** Shown on first render. Split on `\n`. */
  motd?: string
  style?: CSSProperties
  className?: string
  ref?: Ref<ConsoleHandle>
}
