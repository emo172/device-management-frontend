import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useAppStore } from '../modules/app'
import { THEME_STORAGE_KEY } from '../../utils/themeMode'

describe('app store', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    window.localStorage.removeItem(THEME_STORAGE_KEY)
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.colorScheme = ''
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    vi.restoreAllMocks()
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

  it('tracks theme preference and resolves light mode immediately', () => {
    const store = useAppStore()

    store.setThemePreference('light')

    expect(store.themePreference).toBe('light')
    expect(store.resolvedTheme).toBe('light')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('resolves system theme from current media query result', () => {
    const store = useAppStore()

    window.localStorage.setItem(THEME_STORAGE_KEY, 'system')
    window.matchMedia = ((query: string) => ({
      addEventListener: () => undefined,
      addListener: () => undefined,
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      removeEventListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia

    store.initializeThemeState()

    expect(store.themePreference).toBe('system')
    expect(store.resolvedTheme).toBe('dark')
  })

  it('falls back to system when stored theme preference is dirty', () => {
    const store = useAppStore()

    window.localStorage.setItem(THEME_STORAGE_KEY, 'sepia')

    store.initializeThemeState()

    expect(store.themePreference).toBe('system')
  })

  it('falls back to light when matchMedia is unavailable', () => {
    const store = useAppStore()

    window.localStorage.setItem(THEME_STORAGE_KEY, 'system')
    window.matchMedia = undefined as unknown as typeof window.matchMedia

    store.initializeThemeState()

    expect(store.resolvedTheme).toBe('light')
  })

  it('falls back to light when matchMedia throws', () => {
    const store = useAppStore()

    window.localStorage.setItem(THEME_STORAGE_KEY, 'system')
    window.matchMedia = vi.fn(() => {
      throw new Error('matchMedia blocked')
    }) as unknown as typeof window.matchMedia

    store.initializeThemeState()

    expect(store.resolvedTheme).toBe('light')
  })

  it('keeps theme initialization stable when localStorage access throws', () => {
    const store = useAppStore()

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })

    expect(() => store.initializeThemeState()).not.toThrow()
    expect(() => store.setThemePreference('dark')).not.toThrow()
    expect(store.themePreference).toBe('dark')
    expect(store.resolvedTheme).toBe('dark')
  })

  it('resetState keeps persisted theme preference while clearing transient ui state', () => {
    const store = useAppStore()

    store.setThemePreference('dark')
    store.setSidebarCollapsed(true)
    store.setLoading(true)

    store.resetState()

    expect(store.themePreference).toBe('dark')
    expect(store.resolvedTheme).toBe('dark')
    expect(store.sidebarCollapsed).toBe(false)
    expect(store.loading).toBe(false)
  })
})
