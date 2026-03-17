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

  it('stores and clears fatal error state for global 500 fallback', () => {
    const store = useAppStore()

    expect(store.fatalError).toBeNull()

    store.setFatalError({
      source: 'request',
      title: '系统开小差了',
      description: '设备列表加载失败，请稍后重试。',
      retryTarget: {
        path: '/devices',
        retryable: true,
      },
    })

    expect(store.fatalError).toEqual({
      source: 'request',
      title: '系统开小差了',
      description: '设备列表加载失败，请稍后重试。',
      retryTarget: {
        path: '/devices',
        retryable: true,
      },
    })

    store.clearFatalError()

    expect(store.fatalError).toBeNull()
  })

  it('resetState clears transient fatal error while keeping default persisted shape', () => {
    const store = useAppStore()

    store.setSidebarCollapsed(true)
    store.setLoading(true)
    store.setFatalError({
      source: 'router',
      title: '路由装配失败',
      description: '目标页面暂时无法打开。',
      retryTarget: {
        retryable: false,
      },
    })

    store.resetState()

    expect(store.sidebarCollapsed).toBe(false)
    expect(store.loading).toBe(false)
    expect(store.fatalError).toBeNull()
  })
})
