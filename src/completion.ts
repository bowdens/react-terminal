export interface CompletionResult {
  value: string
  matches: string[]
}

export function longestCommonPrefix(words: string[]): string {
  const [first, ...rest] = words
  if (first === undefined) return ''
  let prefix = first
  for (const word of rest) {
    while (!word.startsWith(prefix)) prefix = prefix.slice(0, -1)
  }
  return prefix
}

/**
 * Complete the last whitespace-separated token of `value` against
 * `candidates`, extending it as far as the matches agree.
 */
export function complete(
  value: string,
  candidates: string[]
): CompletionResult {
  const token = /\S*$/.exec(value)?.[0] ?? ''
  if (token === '') return { value, matches: [] }
  const matches = [
    ...new Set(
      candidates.filter((c) => typeof c === 'string' && c.startsWith(token))
    )
  ].sort()
  const head = value.slice(0, value.length - token.length)
  return { value: head + (longestCommonPrefix(matches) || token), matches }
}
