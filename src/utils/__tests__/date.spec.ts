import { describe, expect, it } from 'vitest'

import { formatDate, formatDateTime, toLocalDateTime } from '../date'

describe('date utils', () => {
  it('formats date time with fixed local pattern', () => {
    expect(formatDateTime('2024-01-02T03:04:05')).toBe('2024-01-02 03:04:05')
  })

  it('formats date only with fixed local pattern', () => {
    expect(formatDate('2024-01-02T03:04:05')).toBe('2024-01-02')
  })

  it('returns fallback for empty or invalid values', () => {
    expect(formatDateTime(undefined)).toBe('-')
    expect(formatDate('invalid-date')).toBe('-')
  })

  it('converts date object to local date time string', () => {
    expect(toLocalDateTime(new Date(2024, 0, 2, 3, 4, 5))).toBe('2024-01-02T03:04:05')
  })
})
