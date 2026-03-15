import { describe, expect, it } from 'vitest'

import { isEmail, isPhone, isValidPassword } from '../validate'

describe('validate utils', () => {
  it('validates email format', () => {
    expect(isEmail('user@example.com')).toBe(true)
    expect(isEmail('invalid-email')).toBe(false)
  })

  it('validates password complexity', () => {
    expect(isValidPassword('abc12345')).toBe(true)
    expect(isValidPassword('12345678')).toBe(false)
    expect(isValidPassword('abcdefgh')).toBe(false)
  })

  it('validates mainland china phone number', () => {
    expect(isPhone('13800138000')).toBe(true)
    expect(isPhone('10086')).toBe(false)
  })
})
