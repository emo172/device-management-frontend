import { describe, expect, it } from 'vitest'

import { pinia } from '../index'

describe('stores index', () => {
  it('exports a shared pinia instance', () => {
    expect(pinia).toBeTruthy()
  })
})
