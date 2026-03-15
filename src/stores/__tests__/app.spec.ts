import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useAppStore } from '../modules/app'

describe('app store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('manages sidebar collapse and page loading state', () => {
    const store = useAppStore()

    expect(store.sidebarCollapsed).toBe(false)
    expect(store.loading).toBe(false)

    store.setSidebarCollapsed(true)
    store.toggleSidebar()
    store.setLoading(true)

    expect(store.sidebarCollapsed).toBe(false)
    expect(store.loading).toBe(true)
  })

  it('resets app ui state to defaults', () => {
    const store = useAppStore()

    store.setSidebarCollapsed(true)
    store.setLoading(true)
    store.resetState()

    expect(store.sidebarCollapsed).toBe(false)
    expect(store.loading).toBe(false)
  })
})
