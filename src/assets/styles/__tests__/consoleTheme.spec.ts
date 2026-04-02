import '@/assets/styles/index.scss'
import '@/assets/styles/__tests__/consoleShell.fixture.scss'

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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

function findStyleRulesContaining(selectorFragment: string) {
  return Array.from(document.styleSheets)
    .flatMap((styleSheet) => Array.from(styleSheet.cssRules ?? []))
    .filter(
      (rule): rule is CSSStyleRule =>
        rule instanceof CSSStyleRule && rule.selectorText.includes(selectorFragment),
    )
}

function readStyleSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf-8')
}

function extractTokenValue(source: string, blockSelector: string, token: string) {
  const blockPattern = new RegExp(`${blockSelector}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm')
  const blockMatch = source.match(blockPattern)
  const tokenPattern = new RegExp(`${token}:\\s*([^;]+);`)
  const blockContent = blockMatch?.[1]

  if (!blockContent) {
    return undefined
  }

  return blockContent.match(tokenPattern)?.[1]?.trim()
}

function expectThemeToneVariables(source: string, tone: string) {
  const requiredSlots = ['text', 'text-strong', 'surface', 'surface-strong', 'border', 'solid']

  requiredSlots.forEach((slot) => {
    expect(source).toContain(`--app-tone-${tone}-${slot}`)
  })
}

describe('console theme styles', () => {
  it('为浅色与深色主题暴露完整的语义 token 与 tone 家族', () => {
    const variablesSource = readStyleSource('src/assets/styles/variables.scss')

    expect(variablesSource).toContain(':root')
    expect(variablesSource).toContain("[data-theme='dark']")
    ;[
      '--app-page-bg',
      '--app-shell-bg',
      '--app-surface-card',
      '--app-surface-overlay',
      '--app-border-subtle',
      '--app-text-primary',
      '--app-text-secondary',
      '--app-color-primary-contrast',
      '--app-border-soft',
      '--app-border-strong',
      '--app-shadow-glass',
      '--app-shadow-solid',
      '--app-focus-ring',
      '--app-chart-1',
      '--app-chart-6',
    ].forEach((token) => {
      expect(variablesSource).toContain(token)
    })
    ;['brand', 'info', 'success', 'warning', 'danger'].forEach((tone) => {
      expectThemeToneVariables(variablesSource, tone)
    })

    const lightStyle = getComputedStyle(document.documentElement)
    expect(lightStyle.getPropertyValue('--app-page-bg').trim()).not.toBe('')
    expect(lightStyle.getPropertyValue('--app-tone-brand-solid').trim()).not.toBe('')
    expect(lightStyle.getPropertyValue('--app-border-subtle').trim()).not.toBe('')
    expect(lightStyle.getPropertyValue('--app-color-primary-contrast').trim()).not.toBe('')

    expect(extractTokenValue(variablesSource, ':root', '--app-page-bg')).not.toBe(
      extractTokenValue(variablesSource, "\\[data-theme='dark'\\]", '--app-page-bg'),
    )
    expect(extractTokenValue(variablesSource, ':root', '--app-text-primary')).not.toBe(
      extractTokenValue(variablesSource, "\\[data-theme='dark'\\]", '--app-text-primary'),
    )
    expect(extractTokenValue(variablesSource, ':root', '--app-tone-warning-surface')).not.toBe(
      extractTokenValue(variablesSource, "\\[data-theme='dark'\\]", '--app-tone-warning-surface'),
    )
  })

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

  it('让 reset 与认证页共享样式只消费主题 token', () => {
    const resetSource = readStyleSource('src/assets/styles/reset.scss')
    const authSource = readStyleSource('src/assets/styles/_auth-pages.scss')

    expect(resetSource).toContain('var(--app-page-bg)')
    expect(resetSource).toContain('var(--app-text-primary)')
    expect(resetSource).toContain('var(--app-page-accent)')
    expect(resetSource).not.toContain(
      'linear-gradient(135deg, var(--app-fog-50), var(--app-fog-100))',
    )

    expect(authSource).toContain('var(--app-text-primary)')
    expect(authSource).toContain('var(--app-text-secondary)')
    expect(authSource).toContain('var(--app-tone-danger-solid)')
    expect(authSource).toContain('var(--app-tone-brand-surface)')
    expect(authSource).not.toContain('rgba(255, 255, 255, 0.92)')
    expect(authSource).not.toContain('#dc2626')
    expect(authSource).not.toContain('#115e59')
  })

  it('保留按钮语义变体并且只覆写 tooltip 面板而不是 trigger', () => {
    const genericButtonRule = findStyleRule('.el-button')

    expect(genericButtonRule?.style.background).toBe('')
    expect(genericButtonRule?.style.color).toBe('')

    const variantRules = [
      '.el-button--primary',
      '.el-button--success',
      '.el-button--warning',
      '.el-button--danger',
    ].map((selector) => findStyleRulesContaining(selector))

    variantRules.forEach((rules) => {
      expect(rules.length).toBeGreaterThan(0)
    })

    const triggerRules = findStyleRulesContaining('.el-tooltip__trigger')
    expect(triggerRules).toHaveLength(0)

    const tooltipPanelRules = [
      ...findStyleRulesContaining('.el-tooltip__popper'),
      ...findStyleRulesContaining('.el-popper.is-dark'),
    ]
    expect(tooltipPanelRules.length).toBeGreaterThan(0)
  })

  it('让 plain text link 子变体不再被实心按钮规则压平', () => {
    const primaryPlainRules = findStyleRulesContaining('.el-button--primary.is-plain')
    const dangerTextRules = findStyleRulesContaining('.el-button--danger.is-text')
    const infoLinkRules = findStyleRulesContaining('.el-button--info.is-link')

    expect(primaryPlainRules.length).toBeGreaterThan(0)
    expect(dangerTextRules.length).toBeGreaterThan(0)
    expect(infoLinkRules.length).toBeGreaterThan(0)

    expect(primaryPlainRules.some((rule) => rule.style.background === 'transparent')).toBe(true)
    expect(dangerTextRules.some((rule) => rule.style.background === 'transparent')).toBe(true)
    expect(infoLinkRules.some((rule) => rule.style.background === 'transparent')).toBe(true)
  })

  it('为详情动作建立隔离的中强调契约，不污染通用 primary plain 或 text 语义', () => {
    const variablesSource = readStyleSource('src/assets/styles/variables.scss')
    const overrideSource = readStyleSource('src/assets/styles/element-override.scss')

    ;[
      '--app-detail-action-text',
      '--app-detail-action-text-strong',
      '--app-detail-action-surface',
      '--app-detail-action-surface-strong',
      '--app-detail-action-border',
    ].forEach((token) => {
      expect(extractTokenValue(variablesSource, ':root', token)).toMatch(/^var\(--app-tone-brand-/)
      expect(extractTokenValue(variablesSource, "\\[data-theme='dark'\\]", token)).toBeUndefined()
    })

    expect(extractTokenValue(variablesSource, ':root', '--app-detail-action-focus-ring')).toBe(
      'var(--app-focus-ring)',
    )
    expect(
      extractTokenValue(
        variablesSource,
        "\\[data-theme='dark'\\]",
        '--app-detail-action-focus-ring',
      ),
    ).toBeUndefined()

    const genericPrimaryPlainButton = document.createElement('button')
    genericPrimaryPlainButton.className = 'el-button el-button--primary is-plain'

    const detailActionButton = document.createElement('button')
    detailActionButton.className = 'el-button el-button--primary is-plain app-detail-action'

    const disabledDetailActionButton = document.createElement('button')
    disabledDetailActionButton.className =
      'el-button el-button--primary is-plain app-detail-action is-disabled'

    document.body.append(genericPrimaryPlainButton, detailActionButton, disabledDetailActionButton)

    const detailBaseRule = findStyleRule('.el-button--primary.is-plain.app-detail-action')
    const detailHoverRule = findStyleRule('.el-button--primary.is-plain.app-detail-action:hover')
    const detailFocusRule = findStyleRule(
      '.el-button--primary.is-plain.app-detail-action:focus-visible',
    )
    const detailDisabledRules = findStyleRulesContaining(
      '.el-button--primary.is-plain.app-detail-action.is-disabled',
    )
    const genericPrimaryPlainRules = findStyleRulesContaining(
      '.el-button--primary.is-plain',
    ).filter((rule) => !rule.selectorText.includes('.app-detail-action'))
    const genericPrimaryTextRules = findStyleRulesContaining('.el-button--primary.is-text').filter(
      (rule) => !rule.selectorText.includes('.app-detail-action'),
    )

    expect(detailBaseRule?.style.borderColor).toBe('var(--app-detail-action-border)')
    expect(detailBaseRule?.style.background).toBe('var(--app-detail-action-surface)')
    expect(detailBaseRule?.style.color).toBe('var(--app-detail-action-text)')

    expect(detailHoverRule?.style.background).toBe('var(--app-detail-action-surface-strong)')
    expect(detailHoverRule?.style.color).toBe('var(--app-detail-action-text-strong)')

    expect(detailFocusRule?.style.background).toBe('var(--app-detail-action-surface-strong)')
    expect(detailFocusRule?.style.color).toBe('var(--app-detail-action-text-strong)')
    expect(detailFocusRule?.style.boxShadow).toBe('var(--app-detail-action-focus-ring)')

    expect(detailDisabledRules).toHaveLength(1)
    expect(detailDisabledRules[0]?.style.background).toBe('var(--el-disabled-bg-color)')
    expect(detailDisabledRules[0]?.style.color).toBe('var(--el-disabled-text-color)')
    expect(detailDisabledRules[0]?.style.boxShadow).toBe('none')

    expect(overrideSource).not.toContain('.el-button--primary.is-text.app-detail-action')
    expect(genericPrimaryPlainRules.some((rule) => rule.style.background === 'transparent')).toBe(
      true,
    )
    expect(genericPrimaryTextRules.some((rule) => rule.style.background === 'transparent')).toBe(
      true,
    )
    expect(
      genericPrimaryPlainRules.every((rule) => !rule.cssText.includes('--app-detail-action-')),
    ).toBe(true)
    expect(
      genericPrimaryTextRules.every((rule) => !rule.cssText.includes('--app-detail-action-')),
    ).toBe(true)

    expect(detailBaseRule?.style.background).not.toBe('transparent')
    expect(detailDisabledRules[0]?.style.background).not.toBe(detailBaseRule?.style.background)
  })

  it('为 teleported dropdown 图标锁定固定尺寸与居中盒模型，避免主题菜单图标抖动', () => {
    const styleSource = readStyleSource('src/assets/styles/element-override.scss')
    const dropdownIconRules = findStyleRulesContaining(
      '.el-dropdown-menu__item .app-dropdown__icon',
    )
    const dropdownItem = document.createElement('button')
    dropdownItem.className = 'el-dropdown-menu__item'

    const icon = document.createElement('span')
    icon.className = 'app-dropdown__icon'
    dropdownItem.append(icon)
    document.body.append(dropdownItem)

    expect(styleSource).toContain('.el-dropdown-menu__item .app-dropdown__icon')
    expect(dropdownIconRules.some((rule) => rule.style.justifyContent === 'center')).toBe(true)
    expect(dropdownIconRules.some((rule) => rule.style.inlineSize === '16px')).toBe(true)
    expect(dropdownIconRules.some((rule) => rule.style.blockSize === '16px')).toBe(true)
    expect(dropdownIconRules.some((rule) => rule.style.flexShrink === '0')).toBe(true)

    const iconStyle = getComputedStyle(icon)
    expect(iconStyle.display).toBe('inline-flex')
    expect(iconStyle.alignItems).toBe('center')
    expect(iconStyle.justifyContent).toBe('center')
    expect(iconStyle.flexShrink).toBe('0')
  })
})
