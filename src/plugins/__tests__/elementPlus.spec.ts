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

function extractSelectorBlock(source: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm'))

  return match?.[1] ?? ''
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
        'ElAvatar',
        'ElBadge',
        'ElBreadcrumb',
        'ElBreadcrumbItem',
        'ElButton',
        'ElCard',
        'ElContainer',
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
