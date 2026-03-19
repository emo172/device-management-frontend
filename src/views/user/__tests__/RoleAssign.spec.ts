import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const userViewModules = import.meta.glob('../*.vue')
const updateUserRoleMock = vi.fn()
const fetchRoleListMock = vi.fn()

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void

  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve
  })

  return { promise, resolve }
}

const userStoreState = {
  roleList: [
    { id: 'role-user', name: 'USER', description: '普通用户' },
    { id: 'role-system', name: 'SYSTEM_ADMIN', description: '系统管理员' },
  ],
}

vi.mock('element-plus', async (importOriginal) => {
  const actual = await importOriginal<typeof import('element-plus')>()

  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
    },
  }
})

vi.mock('@/stores/modules/user', () => ({
  useUserStore: () => ({
    get roleList() {
      return userStoreState.roleList
    },
    fetchRoleList: fetchRoleListMock,
    updateUserRole: updateUserRoleMock,
  }),
}))

describe('user role assign dialog', () => {
  beforeEach(() => {
    updateUserRoleMock.mockReset()
    fetchRoleListMock.mockReset()
    userStoreState.roleList = [
      { id: 'role-user', name: 'USER', description: '普通用户' },
      { id: 'role-system', name: 'SYSTEM_ADMIN', description: '系统管理员' },
    ]
  })

  it('保留角色分配提交能力，并迁移到详情壳层结构', async () => {
    const loader = userViewModules['../RoleAssign.vue']

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
          roleId: 'role-user',
          roleName: 'USER',
        },
      },
      global: {
        stubs: {
          ElDialog: { template: '<div><slot /><slot name="footer" /></div>' },
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          ElInput: {
            props: ['modelValue'],
            template: '<input :value="modelValue" />',
          },
          ElSelect: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<select data-testid="role-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
          },
          ElOption: {
            props: ['label', 'value'],
            template: '<option :value="value">{{ label }}</option>',
          },
          ElButton: {
            props: ['disabled'],
            emits: ['click'],
            template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)

    await wrapper.get('[data-testid="role-select"]').setValue('role-system')

    const actionButtons = wrapper.findAll('button')

    expect(actionButtons[1]).toBeDefined()
    await actionButtons[1]!.trigger('click')

    expect(updateUserRoleMock).toHaveBeenCalledWith('user-1', { roleId: 'role-system' })
  })

  it('角色列表加载失败时会显示错误提示，而不是静默吞掉失败', async () => {
    const loader = userViewModules['../RoleAssign.vue']

    expect(loader).toBeTypeOf('function')

    if (!loader) {
      return
    }

    userStoreState.roleList = []
    fetchRoleListMock.mockRejectedValueOnce(new Error('role list failed'))

    const module = (await loader()) as { default: object }

    const wrapper = mount(module.default, {
      props: {
        modelValue: true,
        user: {
          id: 'user-2',
          username: 'lisi',
          roleId: 'role-user',
          roleName: 'USER',
        },
      },
      global: {
        stubs: {
          ElDialog: { template: '<div><slot /><slot name="footer" /></div>' },
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          ElInput: {
            props: ['modelValue'],
            template: '<input :value="modelValue" />',
          },
          ElSelect: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<select data-testid="role-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
          },
          ElOption: {
            props: ['label', 'value'],
            template: '<option :value="value">{{ label }}</option>',
          },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    await flushPromises()

    expect(fetchRoleListMock).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('角色列表加载失败')

    const actionButtons = wrapper.findAll('button')

    expect(actionButtons[1]).toBeDefined()
    expect((actionButtons[1]!.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('提交角色分配期间会锁定确认按钮，避免重复写入同一角色变更', async () => {
    const loader = userViewModules['../RoleAssign.vue']

    expect(loader).toBeTypeOf('function')

    if (!loader) {
      return
    }

    const submitDeferred = createDeferred<void>()
    updateUserRoleMock.mockReturnValueOnce(submitDeferred.promise)

    const module = (await loader()) as { default: object }

    const wrapper = mount(module.default, {
      props: {
        modelValue: true,
        user: {
          id: 'user-9',
          username: 'zhaoliu',
          roleId: 'role-user',
          roleName: 'USER',
        },
      },
      global: {
        stubs: {
          ElDialog: { template: '<div><slot /><slot name="footer" /></div>' },
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          ElInput: {
            props: ['modelValue'],
            template: '<input :value="modelValue" />',
          },
          ElSelect: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<select data-testid="role-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
          },
          ElOption: {
            props: ['label', 'value'],
            template: '<option :value="value">{{ label }}</option>',
          },
          ElButton: {
            props: ['disabled'],
            emits: ['click'],
            template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    await wrapper.get('[data-testid="role-select"]').setValue('role-system')

    const actionButtons = wrapper.findAll('button')

    expect(actionButtons[1]).toBeDefined()
    await actionButtons[1]!.trigger('click')

    expect(updateUserRoleMock).toHaveBeenCalledTimes(1)
    expect((actionButtons[1]!.element as HTMLButtonElement).disabled).toBe(true)

    await actionButtons[1]!.trigger('click')
    expect(updateUserRoleMock).toHaveBeenCalledTimes(1)

    submitDeferred.resolve()
    await flushPromises()
  })
})
