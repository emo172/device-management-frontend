import { describe, expect, it } from 'vitest'

import router from '../index'

describe('router', () => {
  it('provides a login route for 401 redirects', () => {
    expect(router.resolve('/login').matched.length).toBeGreaterThan(0)
  })
})
