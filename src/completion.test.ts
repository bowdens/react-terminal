import { complete, longestCommonPrefix } from './completion'

describe('longestCommonPrefix', () => {
  it('handles empty, single and multiple words', () => {
    expect(longestCommonPrefix([])).toBe('')
    expect(longestCommonPrefix(['echo'])).toBe('echo')
    expect(longestCommonPrefix(['echo', 'echolocation'])).toBe('echo')
    expect(longestCommonPrefix(['apple', 'aardvark'])).toBe('a')
  })
})

describe('complete', () => {
  const words = ['echo', 'echolocation', 'emu', 'apple']

  it('completes a unique match', () => {
    expect(complete('em', words)).toEqual({ value: 'emu', matches: ['emu'] })
  })
  it('extends to the common prefix', () => {
    expect(complete('ec', words).value).toBe('echo')
  })
  it('leaves ambiguous input alone and reports matches', () => {
    expect(complete('e', words)).toEqual({
      value: 'e',
      matches: ['echo', 'echolocation', 'emu']
    })
  })
  it('completes only the last token', () => {
    expect(complete('echo hello em', words).value).toBe('echo hello emu')
  })
  it('does nothing for an empty token or no match', () => {
    expect(complete('', words).value).toBe('')
    expect(complete('echo ', words).value).toBe('echo ')
    expect(complete('zzz', words)).toEqual({ value: 'zzz', matches: [] })
  })
})
