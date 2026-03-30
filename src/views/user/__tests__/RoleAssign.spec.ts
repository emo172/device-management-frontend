import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const userViewModules = import.meta.glob('../*.vue')
const updateUserRoleMock = vi.fn()
const fetchRoleListMock = vi.fn()

const layoutStubs = {
  ConsoleDetailLayout: {
    template:
      '<div class="console-detail-layout"><div class="console-detail-layout__main"><slot name="main" /></div><aside class="console-detail-layout__aside"><slot name="aside" /></aside></div>',
  },
  ConsoleAsidePanel: {
    template: '<section class="console-aside-panel"><slot /></section>',
  },
  ConsoleFeedbackSurface: {
    template: '<section class="console-feedback-surface"><slot /></section>',
  },
}

const appSelectStub = {
  name: 'AppSelect',
  inheritAttrs: false,
  props: ['modelValue', 'placeholder', 'disabled'],
  emits: ['update:modelValue'],
  template:
    '<div class="app-select-stub" :class="$attrs.class" :style="$attrs.style"><select data-testid="role-select" class="app-select-stub__control" :value="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select></div>',
}

function readUserViewSource(fileName: string) {
  return readFileSync(resolve(process.cwd(), `src/views/user/${fileName}`), 'utf-8')
}

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
          ...layoutStubs,
          ElDialog: { template: '<div><slot /><slot name="footer" /></div>' },
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          ElInput: {
            props: ['modelValue'],
            template: '<input :value="modelValue" />',
          },
          AppSelect: appSelectStub,
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
    expect(wrapper.getComponent({ name: 'AppSelect' }).props('modelValue')).toBe('role-user')

    await wrapper.get('[data-testid="role-select"]').setValue('role-system')

    const actionButtons = wrapper.findAll('button')

    expect(actionButtons[1]).toBeDefined()
    await actionButtons[1]!.trigger('click')

    expect(updateUserRoleMock).toHaveBeenCalledWith('user-1', { roleId: 'role-system' })
  })

  it('当前 roleId 不在角色列表中时会禁用确认按钮，避免提交过期角色', async () => {
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
          id: 'user-3',
          username: 'wangwu',
          roleId: 'role-missing',
          roleName: 'SYSTEM_ADMIN',
        },
      },
      global: {
        stubs: {
          ...layoutStubs,
          ElDialog: { template: '<div><slot /><slot name="footer" /></div>' },
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          ElInput: {
            props: ['modelValue'],
            template: '<input :value="modelValue" />',
          },
          AppSelect: appSelectStub,
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

    expect(wrapper.getComponent({ name: 'AppSelect' }).props('modelValue')).toBe('role-missing')

    const actionButtons = wrapper.findAll('button')

    expect(actionButtons[1]).toBeDefined()
    expect((actionButtons[1]!.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('提交成功后会 emit success，通知父层刷新列表', async () => {
    const loader = userViewModules['../RoleAssign.vue']

    expect(loader).toBeTypeOf('function')

    if (!loader) {
      return
    }

    updateUserRoleMock.mockResolvedValueOnce(undefined)

    const module = (await loader()) as { default: object }

    const wrapper = mount(module.default, {
      props: {
        modelValue: true,
        user: {
          id: 'user-4',
          username: 'sunqi',
          roleId: 'role-user',
          roleName: 'USER',
        },
      },
      global: {
        stubs: {
          ...layoutStubs,
          ElDialog: { template: '<div><slot /><slot name="footer" /></div>' },
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          ElInput: {
            props: ['modelValue'],
            template: '<input :value="modelValue" />',
          },
          AppSelect: appSelectStub,
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
    await flushPromises()

    expect(wrapper.emitted('success')).toEqual([[]])
  })

  it('提交成功后会 emit update:modelValue false，关闭弹窗', async () => {
    const loader = userViewModules['../RoleAssign.vue']

    expect(loader).toBeTypeOf('function')

    if (!loader) {
      return
    }

    updateUserRoleMock.mockResolvedValueOnce(undefined)

    const module = (await loader()) as { default: object }

    const wrapper = mount(module.default, {
      props: {
        modelValue: true,
        user: {
          id: 'user-5',
          username: 'zhouba',
          roleId: 'role-user',
          roleName: 'USER',
        },
      },
      global: {
        stubs: {
          ...layoutStubs,
          ElDialog: { template: '<div><slot /><slot name="footer" /></div>' },
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          ElInput: {
            props: ['modelValue'],
            template: '<input :value="modelValue" />',
          },
          AppSelect: appSelectStub,
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
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
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
          ...layoutStubs,
          ElDialog: { template: '<div><slot /><slot name="footer" /></div>' },
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          ElInput: {
            props: ['modelValue'],
            template: '<input :value="modelValue" />',
          },
          AppSelect: appSelectStub,
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
          ...layoutStubs,
          ElDialog: { template: '<div><slot /><slot name="footer" /></div>' },
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          ElInput: {
            props: ['modelValue'],
            template: '<input :value="modelValue" />',
          },
          AppSelect: appSelectStub,
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

  it('角色分配弹窗源码改为通过 AppSelect 收口下拉，并继续消费主题 token', () => {
    const source = readUserViewSource('RoleAssign.vue')

    // 角色分配页要把选择器统一收口到包装组件，避免页面继续直连 Element Plus 私有下拉实现。
    expect(source).toContain("import AppSelect from '@/components/common/dropdown/AppSelect.vue'")
    expect(source).toContain('<AppSelect')
    expect(source).not.toContain('<el-select')

    // 角色分配页同时承载表单面板与角色说明区，需要直接锁定 token，避免深色主题时权限配置区域退回浅色底。
    expect(source).toContain('var(--app-surface-card)')
    expect(source).toContain('var(--app-tone-brand-text)')
    expect(source).toContain('var(--app-border-soft)')
    expect(source).toContain('var(--app-shadow-card)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(source).not.toMatch(hardcodedColorPattern)
  })
})
