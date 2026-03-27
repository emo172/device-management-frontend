import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { mount } from '@vue/test-utils'

const routeState = {
  name: 'Login',
  meta: {} as Record<string, unknown>,
}

const authRouteCases = [
  {
    routeName: 'Login',
    expectedTitle: '智能设备管理系统',
    expectedFeature: '设备信息集中查看',
    unexpectedFeature: '设备权限统一接入',
    hiddenCopy: [
      '在同一套控制台里完成设备检索、预约跟踪与借还状态查看，登录后继续回到你刚才要处理的任务。',
      '公开页母版只负责建立场景认知，输入与提交继续交给右侧认证表单，避免首屏信息与操作区互相抢焦点。',
    ],
  },
  {
    routeName: 'Register',
    expectedTitle: '创建系统账号',
    expectedFeature: '设备权限统一接入',
    unexpectedFeature: '设备信息集中查看',
    hiddenCopy: [
      '补齐基础资料后即可进入系统，后续预约、签到与通知记录都会围绕同一身份持续沉淀。',
      '注册成功后后端会直接返回令牌，因此左栏更强调后续账号承载的能力，而不是单次表单填写本身。',
    ],
  },
  {
    routeName: 'ForgotPassword',
    expectedTitle: '重置登录密码',
    expectedFeature: '找回流程清晰可追踪',
    unexpectedFeature: '设备信息集中查看',
    hiddenCopy: [
      '通过邮箱验证码恢复登录能力，尽量让预约、通知与待办处理链路不中断。',
      '找回密码场景重点是恢复访问而非重新建号，因此文案只强调已有数据与通知如何平滑接续。',
    ],
  },
  {
    routeName: 'ResetPassword',
    expectedTitle: '重新设置登录密码',
    expectedFeature: '公开流程单点收束',
    unexpectedFeature: '设备信息集中查看',
    hiddenCopy: [],
  },
] as const

vi.mock('@/components/layout/AppHeader.vue', () => ({
  default: defineComponent({
    name: 'AppHeaderStub',
    template: '<div class="app-header-stub">头部</div>',
  }),
}))

vi.mock('@/components/layout/AppSidebar.vue', () => ({
  default: defineComponent({
    name: 'AppSidebarStub',
    template: '<div class="app-sidebar-stub">侧边栏</div>',
  }),
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    RouterView: defineComponent({
      name: 'RouterViewStub',
      template: `
        <div class="router-view-stub">
          <div class="router-view-stub__wide-content" style="width: 2400px">路由内容</div>
        </div>
      `,
    }),
    useRoute: () => routeState,
  }
})

const App = (await import('../App.vue')).default

describe('App', () => {
  it.each(authRouteCases)('在 $routeName 认证路由下切换到对应 AuthLayout 左栏内容', (testCase) => {
    routeState.name = testCase.routeName
    routeState.meta = { layout: 'auth' }

    const wrapper = mount(App)
    const authTitle = wrapper.get('.auth-layout__title')
    const authLayout = wrapper.get('.auth-layout')

    expect(authLayout.classes()).toContain('auth-layout--compact')
    expect(wrapper.find('.auth-layout__hero-panel').exists()).toBe(true)
    expect(wrapper.find('.auth-layout__content-panel').exists()).toBe(true)
    expect(authTitle.classes()).toContain('auth-layout__title--single-line')
    expect(wrapper.text()).toContain(testCase.expectedTitle)
    expect(wrapper.text()).toContain(testCase.expectedFeature)
    expect(wrapper.text()).not.toContain(testCase.unexpectedFeature)
    testCase.hiddenCopy.forEach((text) => {
      expect(wrapper.text()).not.toContain(text)
    })
    expect(wrapper.text()).toContain('路由内容')
  })

  it('未声明布局时回退到 DefaultLayout', () => {
    routeState.name = 'Dashboard'
    routeState.meta = {}

    const wrapper = mount(App)
    const workspace = wrapper.get('.default-layout__workspace')
    const mainShell = wrapper.get('.default-layout__main-shell')
    const mainScroll = wrapper.get('.default-layout__main-scroll')
    const routerView = wrapper.get('.router-view-stub')
    const wideContent = wrapper.get('.router-view-stub__wide-content')
    const workspaceElement = workspace.element as HTMLElement
    const mainScrollElement = mainScroll.element as HTMLElement

    // jsdom 不参与真实排版，这里手工注入滚动尺寸，显式模拟“容器变窄、内容变宽”的布局结果。
    Object.defineProperties(mainScrollElement, {
      clientWidth: {
        configurable: true,
        value: 960,
      },
      scrollWidth: {
        configurable: true,
        value: 2400,
      },
      scrollLeft: {
        configurable: true,
        writable: true,
        value: 0,
      },
    })
    Object.defineProperties(workspaceElement, {
      clientWidth: {
        configurable: true,
        value: 960,
      },
      scrollWidth: {
        configurable: true,
        value: 960,
      },
      scrollLeft: {
        configurable: true,
        writable: true,
        value: 0,
      },
    })

    const mainScrollStyle = window.getComputedStyle(mainScroll.element)
    const resolvedOverflowX = mainScrollStyle.overflowX || mainScrollStyle.overflow
    const resolvedOverflowY = mainScrollStyle.overflowY || mainScrollStyle.overflow

    expect(wrapper.find('.default-layout').exists()).toBe(true)
    expect(wrapper.find('.default-layout__sidebar-column').exists()).toBe(true)
    expect(wrapper.find('.default-layout__workspace').exists()).toBe(true)
    expect(wrapper.find('.default-layout__header').exists()).toBe(true)
    expect(mainScroll.classes()).toContain('default-layout__main-scroll')
    expect(mainShell.classes()).toContain('default-layout__main-shell')
    expect(wrapper.find('.default-layout__sidebar-column .app-sidebar-stub').exists()).toBe(true)
    expect(wrapper.find('.default-layout__header .app-header-stub').exists()).toBe(true)
    // 默认布局把所有业务内容收口到右侧主滚动区，因此这里同时校验骨架父子关系和滚动承接位置。
    expect(mainScroll.element.parentElement).toBe(workspace.element)
    expect(mainShell.element.parentElement).toBe(mainScroll.element)
    expect(resolvedOverflowX).toBe('auto')
    expect(resolvedOverflowY).toBe('auto')
    expect(mainScroll.element.contains(routerView.element)).toBe(true)
    expect(mainShell.element.contains(routerView.element)).toBe(true)
    expect(mainScroll.element.contains(wideContent.element)).toBe(true)
    expect(mainShell.element.contains(wideContent.element)).toBe(true)
    expect(mainScrollElement.scrollWidth).toBeGreaterThan(mainScrollElement.clientWidth)
    mainScrollElement.scrollLeft = 320
    expect(mainScrollElement.scrollLeft).toBe(320)
    expect(workspaceElement.scrollWidth).toBe(workspaceElement.clientWidth)
    expect(workspaceElement.scrollLeft).toBe(0)
    expect(window.getComputedStyle(wideContent.element).width).toBe('2400px')
    expect(wrapper.text()).toContain('路由内容')
  })

  it('显式声明 blank 布局时切换到 BlankLayout', () => {
    routeState.name = 'NotFound'
    routeState.meta = { layout: 'blank' }

    const wrapper = mount(App)

    expect(wrapper.find('.blank-layout').exists()).toBe(true)
    expect(wrapper.text()).toContain('路由内容')
  })
})
