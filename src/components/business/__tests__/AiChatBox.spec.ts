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

describe('AiChatBox', () => {
  it('AI 输入框与消息气泡只消费语义 token，不保留浅色聊天底色硬编码', () => {
    const chatBoxSource = readComponentSource('AiChatBox')
    const messageSource = readComponentSource('AiMessage')

    expect(chatBoxSource).toContain('var(--app-surface-card)')
    expect(chatBoxSource).toContain('var(--app-surface-muted)')
    expect(chatBoxSource).toContain('var(--app-border-soft)')
    expect(chatBoxSource).not.toContain('rgba(255, 255, 255, 0.94)')
    expect(chatBoxSource).not.toContain('rgba(248, 250, 252, 0.8)')

    expect(messageSource).toContain('var(--app-tone-success-surface)')
    expect(messageSource).toContain('var(--app-tone-warning-surface)')
    expect(messageSource).toContain('var(--app-tone-danger-surface)')
    expect(messageSource).not.toContain('rgba(255, 255, 255, 0.98)')
    expect(messageSource).not.toContain('rgba(15, 118, 110, 0.12)')
  })

  it('渲染共享输入壳层，并支持提交与重置', async () => {
    const { module, error } = await loadComponent('AiChatBox')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        modelValue: '帮我查询明天可借设备',
        loading: false,
      },
      global: {
        stubs: {
          ElButton: {
            props: ['disabled', 'loading', 'type'],
            emits: ['click'],
            template:
              "<button :data-disabled=\"disabled ? 'true' : 'false'\" :data-loading=\"loading ? 'true' : 'false'\" :data-type=\"type || 'default'\" @click=\"$emit('click')\"><slot /></button>",
          },
        },
      },
    })

    expect(wrapper.find('.ai-chat-box__surface').exists()).toBe(true)
    expect(wrapper.find('.ai-chat-box__textarea').attributes('disabled')).toBeUndefined()

    await wrapper.get('.ai-chat-box__textarea').setValue('帮我取消明天的预约')
    await wrapper.get('[data-type="primary"]').trigger('click')
    await wrapper.get('[data-type="default"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['帮我取消明天的预约']])
    expect(wrapper.emitted('submit')).toEqual([['帮我查询明天可借设备']])
    expect(wrapper.emitted('reset')).toEqual([[]])
  })

  it('加载中时禁用开启新会话，避免旧响应串回新会话', async () => {
    const { module, error } = await loadComponent('AiChatBox')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        modelValue: '继续查询设备状态',
        loading: true,
      },
      global: {
        stubs: {
          ElButton: {
            props: ['disabled', 'loading', 'type'],
            emits: ['click'],
            template:
              "<button :data-disabled=\"disabled ? 'true' : 'false'\" :data-loading=\"loading ? 'true' : 'false'\" :data-type=\"type || 'default'\" @click=\"$emit('click')\"><slot /></button>",
          },
        },
      },
    })

    const resetButton = wrapper.get('[data-type="default"]')

    expect(wrapper.get('.ai-chat-box__textarea').attributes('disabled')).toBeDefined()
    expect(resetButton.attributes('data-disabled')).toBe('true')

    await resetButton.trigger('click')

    expect(wrapper.emitted('reset')).toBeUndefined()
  })
})
