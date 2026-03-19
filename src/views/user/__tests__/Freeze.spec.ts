import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const userViewModules = import.meta.glob('../*.vue')
const freezeUserMock = vi.fn()

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void

  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve
  })

  return { promise, resolve }
}

vi.mock('@/stores/modules/user', () => ({
  useUserStore: () => ({
    freezeUser: freezeUserMock,
  }),
}))

describe('user freeze dialog', () => {
  beforeEach(() => {
    freezeUserMock.mockReset()
  })

  it('defaults restricted user to restricted handling instead of collapsing into frozen', async () => {
    const loader = userViewModules['../Freeze.vue']

    expect(loader).toBeTypeOf('function')

    if (!loader) {
      return
    }

    const module = (await loader()) as { default: object }

    const wrapper = mount(module.default, {
      props: {
        modelValue: true,
        user: {
          id: 'user-1',
          username: 'zhangsan',
          freezeStatus: 'RESTRICTED',
        },
      },
      global: {
        stubs: {
          ElDialog: { template: '<div><slot /><slot name="footer" /></div>' },
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          ElSelect: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<div data-testid="freeze-status-value">{{ modelValue }}</div>',
          },
          ElOption: { template: '<div></div>' },
          ElInput: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<textarea />',
          },
          ElButton: { template: '<button><slot /></button>' },
        },
      },
    })

    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
    expect(wrapper.get('[data-testid="freeze-status-value"]').text()).toBe('RESTRICTED')
  })

  it('defaults normal user to frozen handling when opening freeze dialog', async () => {
    const loader = userViewModules['../Freeze.vue']

    expect(loader).toBeTypeOf('function')

    if (!loader) {
      return
    }

    const module = (await loader()) as { default: object }

    const wrapper = mount(module.default, {
      props: {
        modelValue: true,
        user: {
          id: 'user-2',
          username: 'lisi',
          freezeStatus: 'NORMAL',
        },
      },
      global: {
        stubs: {
          ElDialog: { template: '<div><slot /><slot name="footer" /></div>' },
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          ElSelect: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<div data-testid="freeze-status-value">{{ modelValue }}</div>',
          },
          ElOption: { template: '<div></div>' },
          ElInput: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<textarea />',
          },
          ElButton: { template: '<button><slot /></button>' },
        },
      },
    })

    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
    expect(wrapper.get('[data-testid="freeze-status-value"]').text()).toBe('FROZEN')
  })

  it('提交冻结请求期间会锁定确认按钮，避免重复提交相同操作', async () => {
    const loader = userViewModules['../Freeze.vue']

    expect(loader).toBeTypeOf('function')

    if (!loader) {
      return
    }

    const submitDeferred = createDeferred<void>()
    freezeUserMock.mockReturnValueOnce(submitDeferred.promise)

    const module = (await loader()) as { default: object }

    const wrapper = mount(module.default, {
      props: {
        modelValue: true,
        user: {
          id: 'user-3',
          username: 'wangwu',
          freezeStatus: 'NORMAL',
        },
      },
      global: {
        stubs: {
          ElDialog: { template: '<div><slot /><slot name="footer" /></div>' },
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          ElSelect: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<div data-testid="freeze-status-value">{{ modelValue }}</div>',
          },
          ElOption: { template: '<div></div>' },
          ElInput: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<textarea data-testid="freeze-reason" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          ElButton: {
            props: ['disabled'],
            emits: ['click'],
            template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    await wrapper.get('[data-testid="freeze-reason"]').setValue('违规占用设备')

    const actionButtons = wrapper.findAll('button')

    expect(actionButtons[1]).toBeDefined()
    await actionButtons[1]!.trigger('click')

    expect(freezeUserMock).toHaveBeenCalledTimes(1)
    expect((actionButtons[1]!.element as HTMLButtonElement).disabled).toBe(true)

    await actionButtons[1]!.trigger('click')
    expect(freezeUserMock).toHaveBeenCalledTimes(1)

    submitDeferred.resolve()
    await flushPromises()
  })
})
