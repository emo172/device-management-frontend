import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const userViewModules = import.meta.glob('../*.vue')
const freezeUserMock = vi.fn()

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

    expect(wrapper.get('[data-testid="freeze-status-value"]').text()).toBe('FROZEN')
  })
})
