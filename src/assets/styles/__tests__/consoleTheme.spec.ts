import '@/assets/styles/index.scss'
import '@/assets/styles/__tests__/consoleShell.fixture.scss'

import { afterEach, describe, expect, it } from 'vitest'

afterEach(() => {
  document.body.innerHTML = ''
})

function expectCssValue(actualValue: string, expectedValues: string[]) {
  expect(expectedValues).toContain(actualValue)
}

function findStyleRule(selectorText: string) {
  return Array.from(document.styleSheets)
    .flatMap((styleSheet) => Array.from(styleSheet.cssRules ?? []))
    .find(
      (rule): rule is CSSStyleRule =>
        rule instanceof CSSStyleRule && rule.selectorText === selectorText,
    )
}

describe('console theme styles', () => {
  it('暴露轻玻璃设计系统需要的基础 token 与桌面基线', () => {
    const button = document.createElement('button')
    button.className = 'el-button'

    const dialog = document.createElement('div')
    dialog.className = 'el-dialog'

    const surface = document.createElement('div')
    surface.className = 'console-test-surface'

    const solidSurface = document.createElement('div')
    solidSurface.className = 'console-test-solid-surface'

    document.body.append(button, dialog, surface, solidSurface)

    const rootStyle = getComputedStyle(document.documentElement)
    expect(rootStyle.getPropertyValue('--app-ink-950').trim()).toBe('#112636')
    expect(rootStyle.getPropertyValue('--app-accent-violet').trim()).toBe('#7c3aed')
    expect(rootStyle.getPropertyValue('--app-radius-lg').trim()).toBe('28px')
    expect(rootStyle.getPropertyValue('--app-radius-sm').trim()).toBe('14px')
    expect(rootStyle.getPropertyValue('--app-glass-blur').trim()).toBe('16px')
    expect(rootStyle.getPropertyValue('--app-font-family-sans')).toContain('Noto Sans SC')
    expectCssValue(rootStyle.getPropertyValue('--el-border-radius-base').trim(), [
      rootStyle.getPropertyValue('--app-radius-sm').trim(),
      'var(--app-radius-sm)',
    ])

    const bodyStyle = getComputedStyle(document.body)
    expect(bodyStyle.minWidth).toBe('1280px')
    expectCssValue(bodyStyle.fontFamily, [
      rootStyle.getPropertyValue('--app-font-family-sans').trim(),
      'var(--app-font-family-sans)',
    ])

    const buttonStyle = getComputedStyle(button)
    expectCssValue(buttonStyle.borderRadius, [
      rootStyle.getPropertyValue('--app-radius-sm').trim(),
      'var(--app-radius-sm)',
    ])
    expect(buttonStyle.fontFamily).toBe('inherit')

    const dialogStyle = getComputedStyle(dialog)
    expectCssValue(dialogStyle.borderRadius, [
      rootStyle.getPropertyValue('--app-radius-lg').trim(),
      'var(--app-radius-lg)',
    ])
    expectCssValue(dialogStyle.boxShadow, [
      rootStyle.getPropertyValue('--app-shadow-glass').trim(),
      'var(--app-shadow-glass)',
    ])

    const surfaceRule = findStyleRule('.console-test-surface')
    expect(surfaceRule?.style.border).toContain('var(--app-border-glass)')
    expect(surfaceRule?.style.background).toBe('var(--app-surface-glass)')

    const solidSurfaceRule = findStyleRule('.console-test-solid-surface')
    expect(solidSurfaceRule?.style.border).toContain('var(--app-border-soft)')
    expect(solidSurfaceRule?.style.background).toBe('var(--app-surface-solid)')
  })
})
