import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

const commonViewModules = import.meta.glob('../*.vue')

function readViewPlaceholderSource() {
  return readFileSync(resolve(__dirname, '../ViewPlaceholder.vue'), 'utf-8')
}

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

  it('占位页源码改为消费主题 token，避免暗色主题下残留浅色底与浅色文案', () => {
    const source = readViewPlaceholderSource()

    // 占位页会被多个未落地模块复用，源码层直接锁定表面、边框和文字 token，才能避免深色模式下反复出现浅色孤岛。
    expect(source).toContain('var(--app-border-soft)')
    expect(source).toContain('var(--app-surface-card)')
    expect(source).toContain('var(--app-shadow-card)')
    expect(source).toContain('var(--app-text-primary)')
    expect(source).toContain('var(--app-text-secondary)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(source).not.toMatch(hardcodedColorPattern)
  })
})
