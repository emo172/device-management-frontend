import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

const errorViewModules = import.meta.glob('../*.vue')

const linkStub = defineComponent({
  props: { to: { type: [String, Object], default: '' } },
  template: '<a><slot /></a>',
})

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
})
