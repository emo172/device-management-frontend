import { beforeEach, describe, expect, it } from 'vitest'

import {
  clearStorageItems,
  getStorageObject,
  getStorageString,
  removeStorageItem,
  setStorageObject,
  setStorageString,
} from '../storage'

describe('storage utils', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('reads and writes string values', () => {
    setStorageString('token', 'demo-token')
    expect(getStorageString('token')).toBe('demo-token')
  })

  it('reads and writes object values', () => {
    setStorageObject('profile', { name: '张三', role: 'USER' })
    expect(getStorageObject<{ name: string; role: string }>('profile')).toEqual({
      name: '张三',
      role: 'USER',
    })
  })

  it('returns null when json payload is invalid', () => {
    localStorage.setItem('broken', '{invalid-json}')
    expect(getStorageObject('broken')).toBeNull()
  })

  it('removes target keys', () => {
    setStorageString('access_token', 'token-a')
    setStorageString('refresh_token', 'token-b')

    removeStorageItem('access_token')
    clearStorageItems(['refresh_token'])

    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })
})
