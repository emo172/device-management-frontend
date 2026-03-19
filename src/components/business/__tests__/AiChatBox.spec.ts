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

describe('AiChatBox', () => {
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
})
