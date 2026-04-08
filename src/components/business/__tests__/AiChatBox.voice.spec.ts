import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import {
  AI_VOICE_ERROR_TEST_ID,
  AI_VOICE_RECORD_TOGGLE_TEST_ID,
  AI_VOICE_STATUS_TEST_ID,
} from '@/constants'

const businessComponentModules = import.meta.glob('../*.vue')

async function loadAiChatBox() {
  const loader = businessComponentModules['../AiChatBox.vue']

  if (!loader) {
    throw new Error('AiChatBox.vue is missing')
  }

  return (await loader()) as { default: object }
}

function createButtonStub() {
  return {
    props: ['disabled', 'loading', 'type'],
    emits: ['click'],
    template: `<button v-bind="$attrs" :data-disabled="disabled ? 'true' : 'false'" :data-loading="loading ? 'true' : 'false'" :data-type="type || 'default'" @click="$emit('click')"><slot /></button>`,
  }
}

describe('AiChatBox voice entry', () => {
  it('渲染稳定的录音按钮、状态区和错误区钩子', async () => {
    const module = await loadAiChatBox()

    const wrapper = mount(module.default, {
      props: {
        modelValue: '',
        loading: false,
        recording: false,
        transcribing: false,
        voiceStatusText: '点击开始录音，最长 60 秒；转写后回填输入框，请确认后发送。',
        voiceErrorMessage: null,
        voiceToggleDisabled: false,
      },
      global: {
        stubs: {
          ElButton: createButtonStub(),
        },
      },
    })

    expect(wrapper.get(`[data-testid="${AI_VOICE_RECORD_TOGGLE_TEST_ID}"]`).text()).toContain(
      '开始录音',
    )
    expect(wrapper.get(`[data-testid="${AI_VOICE_STATUS_TEST_ID}"]`).text()).toContain(
      '点击开始录音，最长 60 秒；转写后回填输入框，请确认后发送。',
    )
    expect(wrapper.get(`[data-testid="${AI_VOICE_ERROR_TEST_ID}"]`).text()).toBe('')
    expect(wrapper.text()).toContain(
      '语音会先在浏览器内整理为 WAV，再交由第三方云语音服务处理，原始录音不做持久化存储。',
    )

    await wrapper.get(`[data-testid="${AI_VOICE_RECORD_TOGGLE_TEST_ID}"]`).trigger('click')

    expect(wrapper.emitted('toggle-recording')).toEqual([[]])
  })

  it('录音中继续保留停止入口，但禁用文本输入与常规提交动作', async () => {
    const module = await loadAiChatBox()

    const wrapper = mount(module.default, {
      props: {
        modelValue: '帮我查明天空闲设备',
        loading: false,
        recording: true,
        transcribing: false,
        voiceStatusText: '正在录音，最多 60 秒后自动停止并转写。',
        voiceErrorMessage: null,
        voiceToggleDisabled: false,
      },
      global: {
        stubs: {
          ElButton: createButtonStub(),
        },
      },
    })

    expect(wrapper.get('.ai-chat-box__textarea').attributes('disabled')).toBeDefined()
    expect(wrapper.get(`[data-testid="${AI_VOICE_RECORD_TOGGLE_TEST_ID}"]`).text()).toContain(
      '停止录音',
    )
    expect(wrapper.get(`[data-testid="${AI_VOICE_RECORD_TOGGLE_TEST_ID}"]`).attributes('data-disabled')).toBe(
      'false',
    )
    expect(wrapper.get('[data-type="default"]').attributes('data-disabled')).toBe('true')
    expect(wrapper.get('[data-type="primary"]').attributes('data-disabled')).toBe('true')
    expect(wrapper.get(`[data-testid="${AI_VOICE_STATUS_TEST_ID}"]`).text()).toContain(
      '正在录音，最多 60 秒后自动停止并转写。',
    )
    expect(wrapper.text()).toContain(
      '语音会先在浏览器内整理为 WAV，再交由第三方云语音服务处理，原始录音不做持久化存储。',
    )
  })

  it('转写失败后显示错误文案，并维持可测试的错误钩子', async () => {
    const module = await loadAiChatBox()

    const wrapper = mount(module.default, {
      props: {
        modelValue: '继续查询',
        loading: true,
        recording: false,
        transcribing: true,
        voiceStatusText: '正在转写语音，请稍候。转写后回填输入框，请确认后发送。',
        voiceErrorMessage: '语音功能未开启，请稍后再试。',
        voiceToggleDisabled: true,
      },
      global: {
        stubs: {
          ElButton: createButtonStub(),
        },
      },
    })

    expect(wrapper.get(`[data-testid="${AI_VOICE_RECORD_TOGGLE_TEST_ID}"]`).attributes('data-disabled')).toBe(
      'true',
    )
    expect(wrapper.get(`[data-testid="${AI_VOICE_RECORD_TOGGLE_TEST_ID}"]`).attributes('data-loading')).toBe(
      'true',
    )
    expect(wrapper.get(`[data-testid="${AI_VOICE_STATUS_TEST_ID}"]`).text()).toContain(
      '正在转写语音，请稍候。转写后回填输入框，请确认后发送。',
    )
    expect(wrapper.get(`[data-testid="${AI_VOICE_ERROR_TEST_ID}"]`).text()).toContain(
      '语音功能未开启，请稍后再试。',
    )
  })

  it('聊天能力 fail-closed 时禁用文字发送，并展示保留历史入口的中文提示', async () => {
    const module = await loadAiChatBox()

    const wrapper = mount(module.default, {
      props: {
        modelValue: '帮我查明天空闲设备',
        chatDisabled: true,
        chatStatusText: 'AI 能力加载失败，当前已关闭文字发送与语音录音，可先查看历史会话。',
        loading: false,
        recording: false,
        transcribing: false,
        voiceStatusText: 'AI 能力加载失败，当前语音录音暂不可用，可先查看历史会话。',
        voiceErrorMessage: null,
        voiceToggleDisabled: true,
      },
      global: {
        stubs: {
          ElButton: createButtonStub(),
        },
      },
    })

    expect(wrapper.get('.ai-chat-box__textarea').attributes('disabled')).toBeDefined()
    expect(wrapper.get('.ai-chat-box__textarea').attributes('placeholder')).toContain(
      '当前 AI 对话暂不可用，可先查看历史会话。',
    )
    expect(wrapper.get('.ai-chat-box__tip').text()).toContain(
      'AI 能力加载失败，当前已关闭文字发送与语音录音，可先查看历史会话。',
    )
    expect(wrapper.get(`[data-testid="${AI_VOICE_STATUS_TEST_ID}"]`).text()).toContain(
      'AI 能力加载失败，当前语音录音暂不可用，可先查看历史会话。',
    )
    expect(wrapper.get(`[data-testid="${AI_VOICE_RECORD_TOGGLE_TEST_ID}"]`).attributes('data-disabled')).toBe(
      'true',
    )
    expect(wrapper.get('[data-type="primary"]').attributes('data-disabled')).toBe('true')

    await wrapper.get('[data-type="primary"]').trigger('click')
    await wrapper.get(`[data-testid="${AI_VOICE_RECORD_TOGGLE_TEST_ID}"]`).trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.emitted('toggle-recording')).toBeUndefined()
  })
})
