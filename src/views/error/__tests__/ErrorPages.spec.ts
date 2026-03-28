import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

const errorViewModules = import.meta.glob('../*.vue')

const linkStub = defineComponent({
  props: { to: { type: [String, Object], default: '' } },
  template: '<a><slot /></a>',
})

function readErrorViewSource(componentName: '403' | '404') {
  return readFileSync(resolve(__dirname, `../${componentName}.vue`), 'utf-8')
}

async function loadErrorView(componentName: string) {
  const loader = errorViewModules[`../${componentName}.vue`]

  if (!loader) {
    throw new Error(`${componentName}.vue is missing`)
  }

  return (await loader()) as { default: object }
}

describe('error pages', () => {
  it('403 页面使用统一错误反馈壳层并提供动作入口', async () => {
    const Page403 = (await loadErrorView('403')).default
    const wrapper = mount(Page403, {
      global: {
        stubs: {
          RouterLink: linkStub,
        },
      },
    })

    expect(wrapper.find('.error-view__surface').exists()).toBe(true)
    expect(wrapper.find('.error-view__action').exists()).toBe(true)
  })

  it('404 页面使用统一错误反馈壳层并提供动作入口', async () => {
    const Page404 = (await loadErrorView('404')).default
    const wrapper = mount(Page404, {
      global: {
        stubs: {
          RouterLink: linkStub,
        },
      },
    })

    expect(wrapper.find('.error-view__surface').exists()).toBe(true)
    expect(wrapper.find('.error-view__action').exists()).toBe(true)
  })

  it('403/404 源码改为消费主题 token，避免暗色主题下残留浅色按钮与浅色文案', () => {
    const source403 = readErrorViewSource('403')
    const source404 = readErrorViewSource('404')

    // 403/404 是全局兜底页，动作按钮和文本如果继续写死浅色值，切到深色主题时会马上暴露成视觉断层。
    expect(source403).toContain('var(--app-color-primary)')
    expect(source403).toContain('var(--app-text-primary)')
    expect(source403).toContain('var(--app-shadow-solid)')

    expect(source404).toContain('var(--app-color-primary)')
    expect(source404).toContain('var(--app-text-primary)')
    expect(source404).toContain('var(--app-shadow-solid)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(|\b(?:white|black|transparent)\b/

    expect(source403).not.toMatch(hardcodedColorPattern)
    expect(source404).not.toMatch(hardcodedColorPattern)
  })
})
