import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

const AppBreadcrumb = (await import('../AppBreadcrumb.vue')).default

describe('AppBreadcrumb', () => {
  it('按传入顺序渲染面包屑项', () => {
    const wrapper = mount(AppBreadcrumb, {
      props: {
        items: [
          { title: '设备与资产' },
          { path: '/borrows', title: '借还管理' },
          { path: '/borrows/confirm', title: '借用确认' },
        ],
      },
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
    expect(wrapper.findAll('.el-breadcrumb-item-stub').map((item) => item.text())).toEqual([
      '设备与资产',
      '借还管理',
      '借用确认',
    ])
  })

  it('items 为空时不补默认文案', () => {
    const wrapper = mount(AppBreadcrumb, {
      props: {
        items: [],
      },
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
    expect(wrapper.findAll('.el-breadcrumb-item-stub')).toHaveLength(0)
    expect(wrapper.text()).toBe('')
  })
})
