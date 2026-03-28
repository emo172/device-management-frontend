import { afterEach, describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'

import { registerResolvedThemeDomSync } from '../themeMode'

describe('themeMode DOM sync', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.colorScheme = ''
  })

  it('在运行时主题发生变化时同步更新根节点主题属性', async () => {
    const resolvedTheme = ref<'light' | 'dark'>('dark')
    const stopSync = registerResolvedThemeDomSync(resolvedTheme)

    await nextTick()

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')

    resolvedTheme.value = 'light'
    await nextTick()

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.style.colorScheme).toBe('light')

    stopSync()
  })
})
