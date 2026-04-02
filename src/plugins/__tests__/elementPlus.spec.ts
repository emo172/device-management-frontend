import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ElLoadingDirective } from 'element-plus/es/components/loading/index.mjs'

const { provideGlobalConfigMock } = vi.hoisted(() => ({
  provideGlobalConfigMock: vi.fn(),
}))

/**
 * 插件注册测试只需要覆盖 `use`、`component`、`directive` 与全局属性注入这几个最小接口。
 * 这里显式声明一个轻量应用桩，避免把完整 Vue App 运行时搬进单测，同时保证 TypeScript 能正确推导安装流程。
 */
interface AppStub {
  use: ReturnType<typeof vi.fn>
  component: ReturnType<typeof vi.fn>
  directive: ReturnType<typeof vi.fn>
  config: {
    globalProperties: Record<string, unknown>
  }
  _context: Record<string, unknown>
}

vi.mock('element-plus/es/components/config-provider/index.mjs', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('element-plus/es/components/config-provider/index.mjs')>()

  return {
    ...actual,
    provideGlobalConfig: provideGlobalConfigMock,
  }
})

function readStyleSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf-8')
}

function extractSelectorBlocks(source: string, selector: string) {
  const normalizedSource = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[\t ]*\/\/.*$/gm, '')

  return Array.from(normalizedSource.matchAll(/([^{}]+)\{([^{}]*)\}/g)).flatMap(
    ([, selectorList, block]) => {
      if (!selectorList || !block) {
        return []
      }

      const selectors = selectorList.split(',').map((item) => item.trim())

      return selectors.includes(selector) ? [block] : []
    },
  )
}

function extractSelectorBlock(source: string, selector: string) {
  return extractSelectorBlocks(source, selector)[0] ?? ''
}

function hasSelectorBlockWithDeclarations(
  source: string,
  selector: string,
  declarations: string[],
) {
  return extractSelectorBlocks(source, selector).some((block) =>
    declarations.every((declaration) => block.includes(declaration)),
  )
}

describe('installElementPlus', () => {
  beforeEach(() => {
    provideGlobalConfigMock.mockReset()
  })

  it('注册当前页面实际使用的 Element Plus 组件与 loading 指令', async () => {
    const { installElementPlus } = await import('../elementPlus')
    const app = {} as AppStub

    app.use = vi.fn(function (plugin: { install?: (app: AppStub) => void }) {
      plugin.install?.(app)
      return app
    })
    app.component = vi.fn()
    app.directive = vi.fn()
    app.config = {
      globalProperties: {},
    }
    app._context = {}

    installElementPlus(app as never)

    const registeredComponentNames = app.component.mock.calls.map(([name]) => name)

    /**
     * 这里锁定当前仓库真实用到的 Element Plus 组件清单，
     * 避免页面单测通过了组件桩，但运行时因为漏注册导致公开页或业务页直接渲染失败。
     */
    expect(registeredComponentNames).toEqual(
      expect.arrayContaining([
        'ElAside',
        'ElAlert',
        'ElAvatar',
        'ElBadge',
        'ElBreadcrumb',
        'ElBreadcrumbItem',
        'ElButton',
        'ElCard',
        'ElContainer',
        'ElDatePicker',
        'ElDescriptions',
        'ElDescriptionsItem',
        'ElDialog',
        'ElDropdown',
        'ElDropdownItem',
        'ElDropdownMenu',
        'ElEmpty',
        'ElForm',
        'ElFormItem',
        'ElHeader',
        'ElIcon',
        'ElImage',
        'ElInput',
        'ElInputNumber',
        'ElMain',
        'ElMenu',
        'ElMenuItem',
        'ElOption',
        'ElPagination',
        'ElRadioButton',
        'ElRadioGroup',
        'ElScrollbar',
        'ElSelect',
        'ElTable',
        'ElTableColumn',
        'ElTag',
        'ElTimeline',
        'ElTimelineItem',
        'ElTree',
        'ElTreeSelect',
        'ElUpload',
      ]),
    )
    expect(registeredComponentNames).toContain('ElTooltip')
    expect(app.directive).toHaveBeenCalledWith('loading', ElLoadingDirective)
    expect(provideGlobalConfigMock).toHaveBeenCalledTimes(1)
  })

  it('为当前仓库实际使用的 Element Plus 组件提供主题覆写基线', () => {
    const styleSource = readStyleSource('src/assets/styles/element-override.scss')

    ;[
      '.el-aside',
      '.el-avatar',
      '.el-badge__content',
      '.el-button',
      '.el-alert',
      '.el-card',
      '.el-descriptions',
      '.el-descriptions__cell',
      '.el-empty',
      '.el-form-item__label',
      '.el-image',
      '.el-icon',
      '.el-input__wrapper',
      '.el-input-number',
      '.el-select__wrapper',
      '.el-option',
      '.el-radio-button__inner',
      '.el-table',
      '.el-dialog',
      '.el-dropdown-menu',
      '.el-dropdown-menu__item',
      '.el-breadcrumb__inner',
      '.el-menu',
      '.el-menu-item',
      '.el-scrollbar',
      '.el-tree',
      '.el-select-dropdown',
      '.el-timeline-item__node',
      '.el-date-editor',
      '.el-picker-panel',
      '.el-pagination',
      '.el-tag',
      '.el-upload',
      '.el-message',
      '.el-message-box',
      '.el-loading-mask',
    ].forEach((selector) => {
      expect(styleSource).toContain(selector)
    })
    ;[
      '--el-bg-color',
      '--el-fill-color-blank',
      '--el-border-color',
      '--el-text-color-primary',
      '--el-text-color-regular',
      '--el-mask-color',
      '--el-overlay-color-lighter',
      '--el-disabled-bg-color',
      '--el-disabled-text-color',
      '--el-fill-color-light',
    ].forEach((token) => {
      expect(styleSource).toContain(token)
    })
  })

  it('为菜单型下拉统一全局面板契约，并禁止回退到头部私有 class', () => {
    const styleSource = readStyleSource('src/assets/styles/element-override.scss')
    const elementPlusSelectSource = readStyleSource(
      'node_modules/element-plus/theme-chalk/el-select.css',
    )
    const elementPlusTreeSelectSource = readStyleSource(
      'node_modules/element-plus/theme-chalk/el-tree-select.css',
    )
    const elementPlusDropdownSource = readStyleSource(
      'node_modules/element-plus/theme-chalk/el-dropdown.css',
    )
    const menuPopperDeclarations = [
      'background: var(--app-surface-card);',
      'border: 1px solid var(--app-border-soft);',
      'border-radius: var(--app-radius-md);',
      'box-shadow: var(--app-shadow-solid);',
    ]

    /**
     * 菜单型下拉只允许覆盖 dropdown/select/tree-select 三类面板，
     * 因此这里既锁定 Element Plus theme-chalk 里真实存在的运行时类名，
     * 也约束本地 SCSS 不得回退到头部私有 class、全局 `.el-popper` 污染或后续分组重复声明。
     */
    expect(elementPlusSelectSource).toContain('.el-select-dropdown{')
    expect(elementPlusSelectSource).toContain('.el-select-dropdown__item{')
    expect(elementPlusTreeSelectSource).toContain('.el-tree-select__popper')
    expect(elementPlusTreeSelectSource).toContain('.el-tree-node__content')
    expect(elementPlusDropdownSource).toContain('.el-dropdown__popper.el-popper')
    expect(styleSource).toContain('.app-dropdown__item--active')
    expect(styleSource).toContain('.app-dropdown__item--danger')
    expect(styleSource).toContain('.app-dropdown__icon')
    expect(styleSource).toContain('.app-dropdown__label')
    expect(styleSource).toContain('.app-dropdown__meta')
    expect(
      hasSelectorBlockWithDeclarations(
        styleSource,
        '.el-dropdown__popper.el-popper',
        menuPopperDeclarations,
      ),
    ).toBe(true)
    expect(
      hasSelectorBlockWithDeclarations(styleSource, '.el-select-dropdown', menuPopperDeclarations),
    ).toBe(true)
    expect(
      hasSelectorBlockWithDeclarations(
        styleSource,
        '.el-tree-select__popper',
        menuPopperDeclarations,
      ),
    ).toBe(true)
    expect(
      hasSelectorBlockWithDeclarations(
        styleSource,
        '.el-dropdown__popper.el-popper .el-popper__arrow',
        ['display: none;'],
      ),
    ).toBe(true)
    expect(
      hasSelectorBlockWithDeclarations(styleSource, '.el-select-dropdown__item', [
        'background: transparent;',
        'border-radius: var(--app-radius-sm);',
      ]),
    ).toBe(true)
    expect(
      hasSelectorBlockWithDeclarations(styleSource, '.el-dropdown-menu__item', [
        'border-radius: var(--app-radius-sm);',
      ]),
    ).toBe(true)
    expect(
      hasSelectorBlockWithDeclarations(styleSource, '.el-select-dropdown__item.is-selected', [
        'background: var(--app-tone-brand-surface);',
        'color: var(--app-tone-brand-text-strong);',
        'border-radius: var(--app-radius-sm);',
      ]),
    ).toBe(true)
    expect(
      hasSelectorBlockWithDeclarations(
        styleSource,
        '.el-dropdown-menu__item.app-dropdown__item--active',
        ['background: var(--app-tone-brand-surface);', 'color: var(--app-tone-brand-text-strong);'],
      ),
    ).toBe(true)
    expect(
      hasSelectorBlockWithDeclarations(
        styleSource,
        '.el-dropdown-menu__item.app-dropdown__item--danger',
        ['background: var(--app-tone-danger-surface);', 'color: var(--app-tone-danger-text);'],
      ),
    ).toBe(true)
    expect(
      hasSelectorBlockWithDeclarations(
        styleSource,
        '.el-dropdown-menu__item.app-dropdown__item--danger:hover',
        ['background: var(--app-tone-danger-surface);', 'color: var(--app-tone-danger-text);'],
      ),
    ).toBe(true)
    expect(
      hasSelectorBlockWithDeclarations(
        styleSource,
        '.el-dropdown-menu__item.app-dropdown__item--danger:focus',
        ['background: var(--app-tone-danger-surface);', 'color: var(--app-tone-danger-text);'],
      ),
    ).toBe(true)
    expect(styleSource.indexOf('.el-dropdown-menu__item.app-dropdown__item--active')).toBeLessThan(
      styleSource.indexOf('.el-dropdown-menu__item.app-dropdown__item--danger'),
    )
    expect(
      hasSelectorBlockWithDeclarations(styleSource, '.el-dropdown-menu__item:hover', [
        'background: var(--app-tone-brand-surface);',
        'color: var(--app-tone-brand-text-strong);',
        'border-radius: var(--app-radius-sm);',
      ]),
    ).toBe(true)
    expect(
      hasSelectorBlockWithDeclarations(styleSource, '.el-dropdown-menu__item .app-dropdown__icon', [
        'display: inline-flex;',
        'align-items: center;',
      ]),
    ).toBe(true)
    expect(
      hasSelectorBlockWithDeclarations(styleSource, '.el-dropdown-menu__item .app-dropdown__icon', [
        'justify-content: center;',
        'inline-size: 16px;',
        'block-size: 16px;',
        'flex-shrink: 0;',
      ]),
    ).toBe(true)
    expect(
      hasSelectorBlockWithDeclarations(
        styleSource,
        '.el-dropdown-menu__item .app-dropdown__label',
        ['display: inline-flex;', 'align-items: center;'],
      ),
    ).toBe(true)
    expect(
      hasSelectorBlockWithDeclarations(
        styleSource,
        '.el-dropdown-menu__item .app-dropdown__label',
        ['min-width: 0;'],
      ),
    ).toBe(true)
    expect(
      hasSelectorBlockWithDeclarations(styleSource, '.el-dropdown-menu__item .app-dropdown__meta', [
        'display: inline-flex;',
        'align-items: center;',
      ]),
    ).toBe(true)
    expect(
      hasSelectorBlockWithDeclarations(styleSource, '.el-dropdown-menu__item .app-dropdown__meta', [
        'justify-content: flex-end;',
        'text-align: right;',
        'white-space: nowrap;',
        'color: var(--app-text-secondary);',
        'font-size: 12px;',
      ]),
    ).toBe(true)
    expect(
      extractSelectorBlock(styleSource, '.el-dropdown-menu__item.app-dropdown__item--danger:hover'),
    ).not.toContain('var(--app-tone-brand-surface)')
    expect(
      extractSelectorBlock(styleSource, '.el-dropdown-menu__item.app-dropdown__item--danger:focus'),
    ).not.toContain('var(--app-tone-brand-text-strong)')
    expect(
      hasSelectorBlockWithDeclarations(
        styleSource,
        '.el-tree-node.is-current > .el-tree-node__content',
        ['background: var(--app-tone-brand-surface);', 'color: var(--app-tone-brand-text-strong);'],
      ),
    ).toBe(true)
    expect(
      hasSelectorBlockWithDeclarations(styleSource, '.el-dropdown-menu', menuPopperDeclarations),
    ).toBe(false)
    expect(styleSource).not.toContain('.app-header__theme-option--active')
    expect(styleSource).not.toMatch(/\.app-header__[A-Za-z0-9_-]+/)
    expect(styleSource).not.toContain('popper-class')
    expect(styleSource).not.toContain('.app-header__dropdown-popper')
    expect(styleSource.match(/^[\t ]*\.el-popper\s*\{/m)).toBeNull()
    expect(styleSource).not.toMatch(
      /\.el-dropdown-menu,\s*\.el-message,\s*\.el-message-box,\s*\.el-picker-panel,\s*\.el-select-dropdown\s*\{/m,
    )
    expect(styleSource).not.toMatch(
      /\.el-tooltip__popper,\s*\.el-popper\.is-dark,\s*\.el-popper\.is-light,\s*\.el-dropdown-menu,\s*\.el-message,\s*\.el-message-box,\s*\.el-picker-panel,\s*\.el-select-dropdown,\s*\.el-tree-select__popper\s*\{/m,
    )
  })

  it('对按钮语义变体和 tooltip 面板使用精确选择器', () => {
    const styleSource = readStyleSource('src/assets/styles/element-override.scss')
    const genericButtonBlock = extractSelectorBlock(styleSource, '.el-button')

    expect(genericButtonBlock).not.toContain('background:')
    expect(genericButtonBlock).not.toContain('color:')
    expect(styleSource).toContain('.el-button--primary')
    expect(styleSource).toContain('.el-button--success')
    expect(styleSource).toContain('.el-button--warning')
    expect(styleSource).toContain('.el-button--danger')

    expect(styleSource).not.toContain('.el-tooltip__trigger')
    expect(styleSource).toContain('.el-tooltip__popper')
  })

  it('为 plain text link 子变体保留独立按钮语义', () => {
    const styleSource = readStyleSource('src/assets/styles/element-override.scss')

    expect(styleSource).toContain('.el-button--primary.is-plain')
    expect(styleSource).toContain('.el-button--danger.is-text')
    expect(styleSource).toContain('.el-button--info.is-link')
    expect(styleSource).toContain('background: transparent;')
    expect(styleSource).toContain('.el-button--primary.is-plain:hover')
    expect(styleSource).toContain('.el-button--danger.is-text:hover')
    expect(styleSource).toContain('.el-button--info.is-link:hover')
  })
})
