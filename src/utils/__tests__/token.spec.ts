import { beforeEach, describe, expect, it } from 'vitest'

import { STORAGE_KEYS } from '@/constants'

import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  hasToken,
  setAccessToken,
  setRefreshToken,
} from '../token'

describe('token utils', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores and reads tokens', () => {
    setAccessToken('access-demo')
    setRefreshToken('refresh-demo')

    expect(getAccessToken()).toBe('access-demo')
    expect(getRefreshToken()).toBe('refresh-demo')
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBe('access-demo')
  })

  it('clears tokens and updates auth status', () => {
    setAccessToken('access-demo')
    expect(hasToken()).toBe(true)

    clearTokens()

    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
    expect(hasToken()).toBe(false)
  })
})
