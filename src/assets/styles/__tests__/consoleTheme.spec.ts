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
        rule instanceof CSSStyleRule &&
        rule.selectorText
          .split(',')
          .map((selector) => selector.trim())
          .includes(selectorText),
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

  it('为详情动作建立隔离的中强调契约，并收口 primary plain/text/link 真实变体', () => {
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

    expect(extractTokenValue(variablesSource, ':root', '--app-detail-action-icon-size')).toBe(
      '14px',
    )
    expect(extractTokenValue(variablesSource, ':root', '--app-detail-action-gap')).toBe('4px')
    expect(extractTokenValue(variablesSource, ':root', '--app-detail-action-padding-inline')).toBe(
      '8px',
    )

    const genericPrimaryPlainButton = document.createElement('button')
    genericPrimaryPlainButton.className = 'el-button el-button--primary is-plain'

    const genericPrimaryTextButton = document.createElement('button')
    genericPrimaryTextButton.className = 'el-button el-button--primary is-text'

    const detailPlainButton = document.createElement('button')
    detailPlainButton.className = 'el-button el-button--primary is-plain app-detail-action'

    const detailTextButton = document.createElement('button')
    detailTextButton.className = 'el-button el-button--primary is-text app-detail-action'

    const detailLinkButton = document.createElement('button')
    detailLinkButton.className = 'el-button el-button--primary is-link app-detail-action'

    const detailTextContent = document.createElement('span')

    const detailTextIcon = document.createElement('i')
    detailTextIcon.className = 'el-icon'

    detailTextContent.append(detailTextIcon, document.createTextNode('详情'))
    detailTextButton.append(detailTextContent)

    const detailWrappedLabelButton = document.createElement('button')
    detailWrappedLabelButton.className = 'el-button el-button--primary is-text app-detail-action'

    const detailWrappedContent = document.createElement('span')
    const detailWrappedIcon = document.createElement('i')
    detailWrappedIcon.className = 'el-icon'
    const detailWrappedLabel = document.createElement('span')
    detailWrappedLabel.textContent = '查看详情'

    detailWrappedContent.append(detailWrappedIcon, detailWrappedLabel)
    detailWrappedLabelButton.append(detailWrappedContent)

    const disabledDetailActionButton = document.createElement('button')
    disabledDetailActionButton.className =
      'el-button el-button--primary is-text app-detail-action is-disabled'

    document.body.append(
      genericPrimaryPlainButton,
      genericPrimaryTextButton,
      detailPlainButton,
      detailTextButton,
      detailWrappedLabelButton,
      detailLinkButton,
      disabledDetailActionButton,
    )

    const detailPlainBaseRule = findStyleRule('.el-button--primary.is-plain.app-detail-action')
    const detailTextBaseRule = findStyleRule('.el-button--primary.is-text.app-detail-action')
    const detailLinkBaseRule = findStyleRule('.el-button--primary.is-link.app-detail-action')
    const detailTextHoverRule = findStyleRule('.el-button--primary.is-text.app-detail-action:hover')
    const detailTextFocusRule = findStyleRule(
      '.el-button--primary.is-text.app-detail-action:focus-visible',
    )
    const detailDisabledRules = findStyleRulesContaining('.app-detail-action.is-disabled')
    const detailIconRule = findStyleRule('.app-detail-action .el-icon')
    const detailContentRule = findStyleRule('.el-button.app-detail-action > span')
    const detailIconSpacingRule = findStyleRule(
      '.el-button.app-detail-action > span > .el-icon + span',
    )
    const genericPrimaryPlainRules = findStyleRulesContaining(
      '.el-button--primary.is-plain',
    ).filter((rule) => !rule.selectorText.includes('.app-detail-action'))
    const genericPrimaryTextRules = findStyleRulesContaining('.el-button--primary.is-text').filter(
      (rule) => !rule.selectorText.includes('.app-detail-action'),
    )

    ;[detailPlainBaseRule, detailTextBaseRule, detailLinkBaseRule].forEach((rule) => {
      expect(rule?.style.borderColor).toBe('var(--app-detail-action-border)')
      expect(rule?.style.background).toBe('var(--app-detail-action-surface)')
      expect(rule?.style.color).toBe('var(--app-detail-action-text)')
      expect(rule?.style.gap).toBe('var(--app-detail-action-gap)')
      expect(rule?.style.paddingInline).toBe('var(--app-detail-action-padding-inline)')
    })

    expect(detailTextHoverRule?.style.background).toBe('var(--app-detail-action-surface-strong)')
    expect(detailTextHoverRule?.style.color).toBe('var(--app-detail-action-text-strong)')

    expect(detailTextFocusRule?.style.background).toBe('var(--app-detail-action-surface-strong)')
    expect(detailTextFocusRule?.style.color).toBe('var(--app-detail-action-text-strong)')
    expect(detailTextFocusRule?.style.boxShadow).toBe('var(--app-detail-action-focus-ring)')

    expect(detailDisabledRules).toHaveLength(1)
    expect(detailDisabledRules[0]?.style.background).toBe('var(--el-disabled-bg-color)')
    expect(detailDisabledRules[0]?.style.color).toBe('var(--el-disabled-text-color)')
    expect(detailDisabledRules[0]?.style.boxShadow).toBe('none')

    expect(overrideSource).toContain('.el-button--primary.is-text.app-detail-action')
    expect(overrideSource).toContain('.el-button--primary.is-link.app-detail-action')
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

    expect(detailIconRule?.style.inlineSize).toBe('var(--app-detail-action-icon-size)')
    expect(detailIconRule?.style.blockSize).toBe('var(--app-detail-action-icon-size)')
    expect(detailIconRule?.style.display).toBe('inline-flex')
    expect(detailIconRule?.style.alignItems).toBe('center')
    expect(detailIconRule?.style.justifyContent).toBe('center')
    expect(detailIconRule?.style.flexShrink).toBe('0')
    expect(detailIconRule?.style.fontSize).toBe('var(--app-detail-action-icon-size)')
    expect(detailContentRule?.style.display).toBe('inline-flex')
    expect(detailContentRule?.style.alignItems).toBe('center')
    expect(detailContentRule?.style.justifyContent).toBe('center')
    expect(detailContentRule?.style.gap).toBe('var(--app-detail-action-gap)')
    expect(detailIconSpacingRule?.style.marginLeft).toBe('0px')

    const detailTextButtonStyle = getComputedStyle(detailTextButton)
    const detailTextContentStyle = getComputedStyle(detailTextContent)
    const detailTextIconStyle = getComputedStyle(detailTextIcon)
    const detailWrappedLabelStyle = getComputedStyle(detailWrappedLabel)
    expectCssValue(detailTextButtonStyle.gap, ['4px', 'var(--app-detail-action-gap)'])
    expectCssValue(detailTextButtonStyle.paddingInline, [
      '8px',
      'var(--app-detail-action-padding-inline)',
    ])
    expectCssValue(detailTextContentStyle.gap, ['4px', 'var(--app-detail-action-gap)'])
    expect(detailTextIconStyle.display).toBe('inline-flex')
    expect(detailTextIconStyle.alignItems).toBe('center')
    expect(detailTextIconStyle.justifyContent).toBe('center')
    expectCssValue(detailTextIconStyle.inlineSize, ['14px', 'var(--app-detail-action-icon-size)'])
    expectCssValue(detailTextIconStyle.blockSize, ['14px', 'var(--app-detail-action-icon-size)'])
    expect(detailTextIconStyle.flexShrink).toBe('0')
    expect(detailWrappedLabelStyle.marginLeft).toBe('0px')

    expect(detailPlainBaseRule?.style.background).not.toBe('transparent')
    expect(detailDisabledRules[0]?.style.background).not.toBe(detailTextBaseRule?.style.background)
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
