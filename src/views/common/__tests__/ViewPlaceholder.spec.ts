import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

const commonViewModules = import.meta.glob('../*.vue')

describe('ViewPlaceholder', () => {
  it('使用统一占位反馈壳层并承接动作插槽', async () => {
    const loader = commonViewModules['../ViewPlaceholder.vue']

    if (!loader) {
      throw new Error('ViewPlaceholder.vue is missing')
    }

    const ViewPlaceholder = ((await loader()) as { default: object }).default
    const wrapper = mount(ViewPlaceholder, {
      props: {
        eyebrow: 'placeholder',
        title: '功能建设中',
        description: '当前模块将在后续迭代中补齐。',
      },
      slots: {
        actions: '<button class="custom-action">返回</button>',
      },
    })

    expect(wrapper.find('.view-placeholder__surface').exists()).toBe(true)
    expect(wrapper.find('.custom-action').exists()).toBe(true)
  })
})
