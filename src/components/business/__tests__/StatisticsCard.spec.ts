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

describe('StatisticsCard', () => {
  it('统计卡片强调色只映射 tone 家族，不保留旧色板硬编码', () => {
    const source = readComponentSource('StatisticsCard')

    expect(source).toContain(
      "type StatisticsCardTone = 'brand' | 'info' | 'success' | 'warning' | 'danger'",
    )
    expect(source).toContain('var(--app-tone-brand-surface-strong)')
    expect(source).toContain('var(--app-tone-danger-surface-strong)')
    expect(source).not.toContain('#14b8a6')
    expect(source).not.toContain('#f59e0b')
    expect(source).not.toContain('#3b82f6')
    expect(source).not.toContain('#f43f5e')
    expect(source).not.toContain('#22c55e')
  })

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
        accent: 'warning',
      },
    })

    expect(wrapper.find('.statistics-card__surface').exists()).toBe(true)
    expect(wrapper.text()).toContain('今日预约数')
    expect(wrapper.text()).toContain('48')
    expect(wrapper.text()).toContain('较昨日 +12%')
  })
})
