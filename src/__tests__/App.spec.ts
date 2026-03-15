import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { mount } from '@vue/test-utils'

const routeState = {
  meta: {} as Record<string, unknown>,
}

vi.mock('@/layouts/DefaultLayout.vue', () => ({
  default: defineComponent({
    name: 'DefaultLayoutStub',
    template: '<div class="default-layout"><slot /></div>',
  }),
}))

vi.mock('@/layouts/AuthLayout.vue', () => ({
  default: defineComponent({
    name: 'AuthLayoutStub',
    template: '<div class="auth-layout"><slot /></div>',
  }),
}))

vi.mock('@/layouts/BlankLayout.vue', () => ({
  default: defineComponent({
    name: 'BlankLayoutStub',
    template: '<div class="blank-layout"><slot /></div>',
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
    expect(wrapper.text()).toContain('路由内容')
  })

  it('未声明布局时回退到 DefaultLayout', () => {
    routeState.meta = {}

    const wrapper = mount(App)

    expect(wrapper.find('.default-layout').exists()).toBe(true)
    expect(wrapper.text()).toContain('路由内容')
  })
})
