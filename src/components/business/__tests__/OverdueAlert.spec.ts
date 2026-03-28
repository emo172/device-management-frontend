import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

function readComponentSource(componentName: string) {
  return readFileSync(
    resolve(process.cwd(), `src/components/business/${componentName}.vue`),
    'utf-8',
  )
}

describe('OverdueAlert', () => {
  it('逾期告警只消费 danger 和 info 语义 token，不保留浅色渐变硬编码', () => {
    const source = readComponentSource('OverdueAlert')

    expect(source).toContain('var(--app-tone-danger-border)')
    expect(source).toContain('var(--app-tone-danger-surface)')
    expect(source).toContain('var(--app-tone-info-surface)')
    expect(source).not.toContain('rgba(255, 241, 242, 0.96)')
    expect(source).not.toContain('rgba(248, 250, 252, 0.96)')
    expect(source).not.toContain('#e11d48')
  })

  it('为设备管理员渲染当前页待处理逾期摘要与当前页累计逾期时长', async () => {
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

    expect(wrapper.text()).toContain('当前页还有 2 条待处理逾期')
    expect(wrapper.text()).toContain('当前页累计逾期 11 小时')
  })

  it('无待处理逾期时渲染当前页安静提示文案', async () => {
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

    expect(wrapper.text()).toContain('当前页没有逾期记录')
    expect(wrapper.text()).toContain('当前页待关注')
  })

  it('为普通用户渲染当前页逾期关注口径与右侧当前页标签', async () => {
    const { module, error } = await loadComponent('OverdueAlert')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        pendingCount: 1,
        totalOverdueHours: 6,
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

    expect(wrapper.text()).toContain('当前页有 1 条逾期记录待关注')
    expect(wrapper.text()).toContain('当前页待关注')
  })

  it('为设备管理员渲染右侧当前页待跟进口径', async () => {
    const { module, error } = await loadComponent('OverdueAlert')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        pendingCount: 3,
        totalOverdueHours: 15,
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

    expect(wrapper.text()).toContain('当前页待跟进')
  })
})
