import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const routeState = {
  matched: [
    { path: '/dashboard', meta: { title: '仪表盘' } },
    { path: '/statistics', meta: { title: '统计分析' } },
    { path: '/statistics/overview', meta: { title: '总览', hidden: false } },
    { path: '/statistics/hidden', meta: { title: '隐藏节点', hidden: true } },
  ],
}

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    useRoute: () => routeState,
  }
})

const AppBreadcrumb = (await import('../AppBreadcrumb.vue')).default

describe('AppBreadcrumb', () => {
  it('渲染新的面包屑壳层并按标题链过滤隐藏节点', () => {
    const wrapper = mount(AppBreadcrumb, {
      global: {
        stubs: {
          ElBreadcrumb: {
            props: ['separator'],
            template: '<nav class="el-breadcrumb-stub" :data-separator="separator"><slot /></nav>',
          },
          ElBreadcrumbItem: {
            template: '<span class="el-breadcrumb-item-stub"><slot /></span>',
          },
        },
      },
    })

    expect(wrapper.find('.app-breadcrumb__surface').exists()).toBe(true)
    expect(wrapper.findAll('.el-breadcrumb-item-stub')).toHaveLength(3)
    expect(wrapper.text()).toContain('仪表盘')
    expect(wrapper.text()).toContain('统计分析')
    expect(wrapper.text()).toContain('总览')
    expect(wrapper.text()).not.toContain('隐藏节点')
  })
})
