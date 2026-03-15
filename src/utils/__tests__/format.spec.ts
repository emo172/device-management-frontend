import { describe, expect, it } from 'vitest'

import { formatEmptyValue, formatTextList } from '../format'

describe('format utils', () => {
  it('formats empty values with fallback text', () => {
    expect(formatEmptyValue(null)).toBe('-')
    expect(formatEmptyValue('   ')).toBe('-')
    expect(formatEmptyValue(0)).toBe('0')
  })

  it('formats string list and removes blank items', () => {
    expect(formatTextList([' 设备A ', ' ', '实验室'])).toBe('设备A / 实验室')
    expect(formatTextList([])).toBe('-')
  })
})
