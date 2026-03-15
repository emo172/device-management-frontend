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
    setRefreshToken('refresh-demo')
    localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify({ id: 'user-1', role: 'USER' }))

    expect(hasToken()).toBe(true)

    clearTokens()

    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.USER_INFO)).toBeNull()
    expect(hasToken()).toBe(false)
  })
})
