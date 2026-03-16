import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

const businessComponentModules = import.meta.glob('../*.vue')

async function loadComponent(componentName: string) {
  const loader = businessComponentModules[`../${componentName}.vue`]

  if (!loader) {
    return {
      module: null,
      error: new Error(`${componentName}.vue is missing`),
    }
  }

  try {
    return {
      module: (await loader()) as { default: object },
      error: null,
    }
  } catch (error) {
    return {
      module: null,
      error,
    }
  }
}

describe('OverdueAlert', () => {
  it('为设备管理员渲染待处理逾期摘要与累计逾期时长', async () => {
    const { module, error } = await loadComponent('OverdueAlert')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        pendingCount: 2,
        totalOverdueHours: 11,
        isAdmin: true,
      },
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('还有 2 条待处理逾期')
    expect(wrapper.text()).toContain('累计逾期 11 小时')
  })

  it('无待处理逾期时渲染安静提示文案', async () => {
    const { module, error } = await loadComponent('OverdueAlert')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        pendingCount: 0,
        totalOverdueHours: 0,
        isAdmin: false,
      },
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('当前没有逾期记录')
  })
})
