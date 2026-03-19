import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { mount } from '@vue/test-utils'

const routeState = {
  meta: {} as Record<string, unknown>,
}

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
      template: '<div class="router-view-stub">路由内容</div>',
    }),
    useRoute: () => routeState,
  }
})

const App = (await import('../App.vue')).default

describe('App', () => {
  it('在认证路由下切换到 AuthLayout', () => {
    routeState.meta = { layout: 'auth' }

    const wrapper = mount(App)

    expect(wrapper.find('.auth-layout').exists()).toBe(true)
    expect(wrapper.find('.auth-layout__hero-panel').exists()).toBe(true)
    expect(wrapper.find('.auth-layout__content-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('路由内容')
  })

  it('未声明布局时回退到 DefaultLayout', () => {
    routeState.meta = {}

    const wrapper = mount(App)

    expect(wrapper.find('.default-layout').exists()).toBe(true)
    expect(wrapper.find('.default-layout__surface').exists()).toBe(true)
    expect(wrapper.find('.default-layout__main-shell').exists()).toBe(true)
    expect(wrapper.text()).toContain('路由内容')
  })

  it('显式声明 blank 布局时切换到 BlankLayout', () => {
    routeState.meta = { layout: 'blank' }

    const wrapper = mount(App)

    expect(wrapper.find('.blank-layout').exists()).toBe(true)
    expect(wrapper.text()).toContain('路由内容')
  })
})
