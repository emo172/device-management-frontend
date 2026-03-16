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
    expect(app.directive).toHaveBeenCalledWith('loading', ElLoadingDirective)
    expect(provideGlobalConfigMock).toHaveBeenCalledTimes(1)
  })
})
