import { setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { UserRole } from '@/enums/UserRole'

const successMock = vi.fn()
const adminViewModules = import.meta.glob('../*.vue')

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void

  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve
  })

  return { promise, resolve }
}

vi.mock('element-plus', async (importOriginal) => {
  const actual = await importOriginal<typeof import('element-plus')>()

  return {
    ...actual,
    ElMessage: {
      success: successMock,
    },
  }
})

async function loadView(componentName: string) {
  const loader = adminViewModules[`../${componentName}.vue`]

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

describe('RolePermission view', () => {
  beforeEach(() => {
    successMock.mockReset()
    setActivePinia(createAppPinia())
  })

  it('系统管理员可切换角色、查看权限树并保存最新勾选结果', async () => {
    const { module, error } = await loadView('RolePermission')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'system-admin@example.com',
      phone: '13800138000',
      realName: '系统管理员',
      role: UserRole.SYSTEM_ADMIN,
      userId: 'system-admin-1',
      username: 'system-admin',
    })

    const userStore = useUserStore()
    userStore.roleList = [
      { id: 'role-user', name: 'USER', description: '普通用户角色' },
      { id: 'role-device', name: 'DEVICE_ADMIN', description: '设备管理员角色' },
      { id: 'role-system', name: 'SYSTEM_ADMIN', description: '系统管理员角色' },
    ]

    const fetchRoleListSpy = vi
      .spyOn(userStore, 'fetchRoleList')
      .mockResolvedValue(userStore.roleList)
    const fetchRolePermissionTreeSpy = vi
      .spyOn(userStore, 'fetchRolePermissionTree')
      .mockImplementation(async (roleId: string) => {
        userStore.selectedRoleId = roleId
        userStore.currentRolePermissionTree = [
          {
            module: 'DEVICE',
            permissions: [
              {
                permissionId: 'perm-1',
                code: 'device:view',
                name: `${roleId}-查看设备`,
                description: '允许查看设备详情',
                selected: true,
              },
            ],
          },
        ]

        return userStore.currentRolePermissionTree
      })
    const updateRolePermissionsSpy = vi
      .spyOn(userStore, 'updateRolePermissions')
      .mockImplementation(async (roleId, payload) => {
        userStore.lastPermissionUpdate = {
          roleId,
          permissionIds: [...payload.permissionIds],
          updatedAt: '2026-03-17T10:00:00',
        }
      })

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          PermissionTree: {
            props: ['modules', 'modelValue', 'disabled'],
            emits: ['update:modelValue'],
            template:
              '<div class="permission-tree-stub">{{ modules[0]?.permissions[0]?.name }}<button class="permission-tree-update" @click="$emit(\'update:modelValue\', [\'perm-1\', \'perm-2\'])">update</button></div>',
          },
          ElButton: {
            props: ['disabled'],
            emits: ['click'],
            template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
          ElTag: {
            template: '<span><slot /></span>',
          },
          ElSkeleton: {
            template: '<div><slot /></div>',
          },
          ElSkeletonItem: {
            template: '<span></span>',
          },
          ElEmpty: {
            template: '<div><slot /></div>',
          },
        },
      },
    })

    await flushPromises()

    expect(fetchRoleListSpy).toHaveBeenCalled()
    expect(fetchRolePermissionTreeSpy).toHaveBeenCalledWith('role-user')
    expect(fetchRolePermissionTreeSpy).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.console-table-section').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('角色权限管理')
    expect(wrapper.text()).toContain('role-user-查看设备')

    await wrapper.get('[data-testid="role-card-role-device"]').trigger('click')
    expect(fetchRolePermissionTreeSpy).toHaveBeenLastCalledWith('role-device')

    await wrapper.get('.permission-tree-update').trigger('click')
    await wrapper.get('[data-testid="save-role-permissions"]').trigger('click')

    expect(updateRolePermissionsSpy).toHaveBeenCalledWith('role-device', {
      permissionIds: ['perm-1', 'perm-2'],
    })
    expect(successMock).toHaveBeenCalledWith('角色权限已保存')
    expect(wrapper.text()).toContain('2026-03-17T10:00:00')
  })

  it('selectedRoleId 失效时会回退到最新角色列表中的首个有效角色', async () => {
    const { module, error } = await loadView('RolePermission')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const userStore = useUserStore()
    userStore.selectedRoleId = 'role-missing'
    userStore.roleList = []

    vi.spyOn(userStore, 'fetchRoleList').mockResolvedValue([
      { id: 'role-user', name: 'USER', description: '普通用户角色' },
      { id: 'role-device', name: 'DEVICE_ADMIN', description: '设备管理员角色' },
    ])
    const fetchRolePermissionTreeSpy = vi
      .spyOn(userStore, 'fetchRolePermissionTree')
      .mockResolvedValue([])

    mount(module.default, {
      global: {
        stubs: {
          PermissionTree: { template: '<div></div>' },
          ElButton: { template: '<button><slot /></button>' },
          ElTag: { template: '<span><slot /></span>' },
          ElSkeleton: { template: '<div><slot /></div>' },
          ElSkeletonItem: { template: '<span></span>' },
          ElEmpty: { template: '<div></div>' },
        },
      },
    })

    await flushPromises()

    expect(fetchRolePermissionTreeSpy).toHaveBeenCalledWith('role-user')
  })

  it('页面卸载后会清空授权上下文，并在再次进入时重新拉取权限树', async () => {
    const { module, error } = await loadView('RolePermission')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const userStore = useUserStore()
    userStore.roleList = [{ id: 'role-user', name: 'USER', description: '普通用户角色' }]

    vi.spyOn(userStore, 'fetchRoleList').mockResolvedValue(userStore.roleList)

    let permissionTreeFetchCount = 0
    const fetchRolePermissionTreeSpy = vi
      .spyOn(userStore, 'fetchRolePermissionTree')
      .mockImplementation(async (roleId: string) => {
        permissionTreeFetchCount += 1
        userStore.selectedRoleId = roleId
        userStore.currentRolePermissionTree = [
          {
            module: 'DEVICE',
            permissions: [
              {
                permissionId: 'perm-1',
                code: 'device:view',
                name: `第${permissionTreeFetchCount}次拉取-${roleId}`,
                description: '允许查看设备详情',
                selected: true,
              },
            ],
          },
        ]

        return userStore.currentRolePermissionTree
      })

    const firstWrapper = mount(module.default, {
      global: {
        stubs: {
          PermissionTree: {
            props: ['modules'],
            template:
              '<div class="permission-tree-stub">{{ modules[0]?.permissions[0]?.name }}</div>',
          },
          ElButton: { template: '<button><slot /></button>' },
          ElTag: { template: '<span><slot /></span>' },
          ElSkeleton: { template: '<div><slot /></div>' },
          ElSkeletonItem: { template: '<span></span>' },
          ElEmpty: { template: '<div></div>' },
        },
      },
    })

    await flushPromises()

    expect(fetchRolePermissionTreeSpy).toHaveBeenCalledTimes(1)
    expect(firstWrapper.text()).toContain('第1次拉取-role-user')

    firstWrapper.unmount()

    expect(userStore.selectedRoleId).toBe('')
    expect(userStore.currentRolePermissionTree).toEqual([])

    const secondWrapper = mount(module.default, {
      global: {
        stubs: {
          PermissionTree: {
            props: ['modules'],
            template:
              '<div class="permission-tree-stub">{{ modules[0]?.permissions[0]?.name }}</div>',
          },
          ElButton: { template: '<button><slot /></button>' },
          ElTag: { template: '<span><slot /></span>' },
          ElSkeleton: { template: '<div><slot /></div>' },
          ElSkeletonItem: { template: '<span></span>' },
          ElEmpty: { template: '<div></div>' },
        },
      },
    })

    await flushPromises()

    expect(fetchRolePermissionTreeSpy).toHaveBeenCalledTimes(2)
    expect(secondWrapper.text()).toContain('第2次拉取-role-user')
  })

  it('切换角色拉取失败时不会继续展示旧权限树，也不会允许直接保存', async () => {
    const { module, error } = await loadView('RolePermission')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const userStore = useUserStore()
    userStore.roleList = [
      { id: 'role-user', name: 'USER', description: '普通用户角色' },
      { id: 'role-device', name: 'DEVICE_ADMIN', description: '设备管理员角色' },
    ]

    vi.spyOn(userStore, 'fetchRoleList').mockResolvedValue(userStore.roleList)
    vi.spyOn(userStore, 'fetchRolePermissionTree').mockImplementation(async (roleId: string) => {
      userStore.selectedRoleId = roleId

      if (roleId === 'role-user') {
        userStore.currentRolePermissionTree = [
          {
            module: 'DEVICE',
            permissions: [
              {
                permissionId: 'perm-1',
                code: 'device:view',
                name: 'role-user-查看设备',
                description: '允许查看设备详情',
                selected: true,
              },
            ],
          },
        ]

        return userStore.currentRolePermissionTree
      }

      throw new Error('load failed')
    })

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          PermissionTree: {
            props: ['modules', 'modelValue', 'disabled'],
            emits: ['update:modelValue'],
            template:
              '<div class="permission-tree-stub">{{ modules[0]?.permissions[0]?.name }}</div>',
          },
          ElButton: {
            props: ['disabled'],
            emits: ['click'],
            template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
          ElTag: { template: '<span><slot /></span>' },
          ElSkeleton: { template: '<div><slot /></div>' },
          ElSkeletonItem: { template: '<span></span>' },
          ElEmpty: { template: '<div><slot /></div>' },
        },
      },
    })

    await flushPromises()

    expect(wrapper.find('.permission-tree-stub').exists()).toBe(true)

    await wrapper.get('[data-testid="role-card-role-device"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('.permission-tree-stub').exists()).toBe(false)
    expect(
      (wrapper.get('[data-testid="save-role-permissions"]').element as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('保存权限请求进行中会锁定保存按钮，避免重复提交同一批权限', async () => {
    const { module, error } = await loadView('RolePermission')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const userStore = useUserStore()
    userStore.roleList = [{ id: 'role-user', name: 'USER', description: '普通用户角色' }]

    vi.spyOn(userStore, 'fetchRoleList').mockResolvedValue(userStore.roleList)
    vi.spyOn(userStore, 'fetchRolePermissionTree').mockImplementation(async (roleId: string) => {
      userStore.selectedRoleId = roleId
      userStore.currentRolePermissionTree = [
        {
          module: 'DEVICE',
          permissions: [
            {
              permissionId: 'perm-1',
              code: 'device:view',
              name: '查看设备',
              description: '允许查看设备详情',
              selected: true,
            },
          ],
        },
      ]

      return userStore.currentRolePermissionTree
    })

    const saveDeferred = createDeferred<void>()
    const updateRolePermissionsSpy = vi
      .spyOn(userStore, 'updateRolePermissions')
      .mockReturnValueOnce(saveDeferred.promise)

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          PermissionTree: {
            props: ['modules', 'modelValue', 'disabled'],
            emits: ['update:modelValue'],
            template:
              '<div class="permission-tree-stub">{{ modules[0]?.permissions[0]?.name }}</div>',
          },
          ElButton: {
            props: ['disabled'],
            emits: ['click'],
            template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
          ElTag: { template: '<span><slot /></span>' },
          ElSkeleton: { template: '<div><slot /></div>' },
          ElSkeletonItem: { template: '<span></span>' },
          ElEmpty: { template: '<div><slot /></div>' },
        },
      },
    })

    await flushPromises()

    const saveButton = wrapper.get('[data-testid="save-role-permissions"]')

    await saveButton.trigger('click')

    expect(updateRolePermissionsSpy).toHaveBeenCalledTimes(1)
    expect((saveButton.element as HTMLButtonElement).disabled).toBe(true)

    await saveButton.trigger('click')
    expect(updateRolePermissionsSpy).toHaveBeenCalledTimes(1)

    saveDeferred.resolve()
    await flushPromises()
  })

  it('角色列表刷新失败时若已有有效权限树，页面仍保留编辑能力', async () => {
    const { module, error } = await loadView('RolePermission')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const userStore = useUserStore()
    userStore.roleList = [{ id: 'role-user', name: 'USER', description: '普通用户角色' }]
    userStore.selectedRoleId = 'role-user'
    userStore.currentRolePermissionTree = [
      {
        module: 'DEVICE',
        permissions: [
          {
            permissionId: 'perm-1',
            code: 'device:view',
            name: '查看设备',
            description: '允许查看设备详情',
            selected: true,
          },
        ],
      },
    ]

    vi.spyOn(userStore, 'fetchRoleList').mockRejectedValue(new Error('role list failed'))
    const updateRolePermissionsSpy = vi
      .spyOn(userStore, 'updateRolePermissions')
      .mockResolvedValue(undefined)

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          PermissionTree: {
            props: ['modules', 'modelValue', 'disabled'],
            emits: ['update:modelValue'],
            template:
              '<div class="permission-tree-stub">{{ modules[0]?.permissions[0]?.name }}</div>',
          },
          ElButton: {
            props: ['disabled'],
            emits: ['click'],
            template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
          ElTag: { template: '<span><slot /></span>' },
          ElSkeleton: { template: '<div><slot /></div>' },
          ElSkeletonItem: { template: '<span></span>' },
          ElEmpty: { template: '<div><slot /></div>' },
        },
      },
    })

    await flushPromises()

    expect(wrapper.find('.permission-tree-stub').exists()).toBe(true)

    const saveButton = wrapper.get('[data-testid="save-role-permissions"]')
    expect((saveButton.element as HTMLButtonElement).disabled).toBe(false)

    await saveButton.trigger('click')

    expect(updateRolePermissionsSpy).toHaveBeenCalledWith('role-user', {
      permissionIds: ['perm-1'],
    })
  })
})
