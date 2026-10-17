/** Split a command line into argv on whitespace. */
export function parseCommand(input: string): string[] {
  const trimmed = input.trim()
  return trimmed === '' ? [] : trimmed.split(/\s+/)
}
