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

describe('StatisticsCard', () => {
  it('渲染统计摘要壳层、数值与趋势信息', async () => {
    const { module, error } = await loadComponent('StatisticsCard')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        title: '今日预约数',
        value: 48,
        description: '按统计日期汇总全部预约记录。',
        trendLabel: '较昨日 +12%',
        accent: 'amber',
      },
    })

    expect(wrapper.find('.statistics-card__surface').exists()).toBe(true)
    expect(wrapper.text()).toContain('今日预约数')
    expect(wrapper.text()).toContain('48')
    expect(wrapper.text()).toContain('较昨日 +12%')
  })
})
