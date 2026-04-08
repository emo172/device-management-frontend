import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

const businessComponentModules = import.meta.glob('../*.vue')

async function loadAiMessageComponent() {
  const loader = businessComponentModules['../AiMessage.vue']

  if (!loader) {
    throw new Error('AiMessage.vue is missing')
  }

  return (await loader()) as { default: object }
}

describe('AiMessage voice cleanup', () => {
  it('助手消息仍展示意图与执行结果，但不再渲染播放入口', async () => {
    const module = await loadAiMessageComponent()
    const wrapper = mount(module.default, {
      props: {
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: '已为你整理预约建议。',
          createdAt: '2026-03-18T08:00:00',
          historyId: 'history-1',
          intent: 'QUERY',
          executeResult: 'SUCCESS',
          status: 'sent',
        },
      },
      global: {
        stubs: {
          ElTag: { template: '<span><slot /></span>' },
        },
      },
    })

    expect(wrapper.text()).toContain('已为你整理预约建议。')
    expect(wrapper.text()).toContain('意图：')
    expect(wrapper.text()).toContain('执行：SUCCESS')
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('.ai-message__play-button').exists()).toBe(false)
    expect(wrapper.find('.ai-message__playback-note').exists()).toBe(false)
    expect(wrapper.find('.ai-message__playback-error').exists()).toBe(false)
  })

  it('用户失败消息仍保留失败标签，不受播放入口删除影响', async () => {
    const module = await loadAiMessageComponent()
    const wrapper = mount(module.default, {
      props: {
        message: {
          id: 'user-1',
          role: 'user',
          content: '发送失败的用户消息',
          createdAt: '2026-03-18T08:05:00',
          status: 'failed',
        },
      },
      global: {
        stubs: {
          ElTag: { template: '<span><slot /></span>' },
        },
      },
    })

    expect(wrapper.text()).toContain('发送失败的用户消息')
    expect(wrapper.text()).toContain('发送失败')
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
