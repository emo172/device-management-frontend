import { setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FreezeStatus, UserRole } from '@/enums'
import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'

const pushMock = vi.fn()
const userViewModules = import.meta.glob('../*.vue')

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    useRouter: () => ({ push: pushMock }),
    useRoute: () => ({ path: '/users', params: {}, query: {} }),
  }
})

async function loadListView() {
  const loader = userViewModules['../List.vue']

  if (!loader) {
    return {
      module: null,
      error: new Error('List.vue is missing'),
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

describe('user list view', () => {
  beforeEach(() => {
    pushMock.mockReset()
    setActivePinia(createAppPinia())
  })

  it('系统管理员进入用户管理页后可查看用户并触发详情与管理弹窗', async () => {
    const { module, error } = await loadListView()

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
    userStore.adminUserList = [
      {
        id: 'user-1',
        username: 'zhangsan',
        email: 'zhangsan@example.com',
        realName: '张三',
        phone: '13800138001',
        status: 1,
        freezeStatus: FreezeStatus.NORMAL,
        roleId: 'role-user',
        roleName: UserRole.USER,
      },
    ]
    userStore.adminUserTotal = 1

    const fetchAdminUserListSpy = vi
      .spyOn(userStore, 'fetchAdminUserList')
      .mockResolvedValue({ total: 1, records: userStore.adminUserList })
    vi.spyOn(userStore, 'fetchRoleList').mockResolvedValue([])
    const updateUserStatusSpy = vi.spyOn(userStore, 'updateUserStatus').mockResolvedValue({
      userId: 'user-1',
      username: 'zhangsan',
      status: 0,
      freezeStatus: FreezeStatus.NORMAL,
      roleId: 'role-user',
    })

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          SearchBar: {
            template: '<div class="search-bar-stub"></div>',
          },
          Pagination: {
            template: '<div class="pagination-stub"></div>',
          },
          EmptyState: {
            template: '<div class="empty-state-stub"><slot /></div>',
          },
          FreezeStatusTag: {
            props: ['status'],
            template: '<span class="freeze-status-tag">{{ status }}</span>',
          },
          Freeze: {
            props: ['modelValue', 'user'],
            template:
              '<div class="freeze-dialog-stub">{{ modelValue ? `freeze-open-${user?.username}` : "closed" }}</div>',
          },
          RoleAssign: {
            props: ['modelValue', 'user'],
            template:
              '<div class="role-dialog-stub">{{ modelValue ? user?.username : "closed" }}</div>',
          },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElIcon: {
            template: '<i><slot /></i>',
          },
          ElTable: {
            template: '<div class="el-table-stub"><slot /></div>',
          },
          ElTableColumn: {
            template: '<div><slot :row="$attrs.row || {}" /></div>',
          },
          ElTag: {
            template: '<span><slot /></span>',
          },
        },
        directives: {
          loading: {
            mounted() {},
            updated() {},
          },
        },
      },
    })

    expect(fetchAdminUserListSpy).toHaveBeenCalledWith({ page: 1, size: 10 })
    expect(wrapper.text()).toContain('用户管理')
    expect(wrapper.text()).toContain('zhangsan')

    await wrapper.get('[data-testid="user-detail-trigger"]').trigger('click')
    expect(pushMock).toHaveBeenCalledWith('/users/user-1')

    await wrapper.get('[data-testid="user-role-trigger"]').trigger('click')
    expect(wrapper.text()).toContain('zhangsan')

    await wrapper.get('[data-testid="user-status-trigger"]').trigger('click')
    expect(updateUserStatusSpy).toHaveBeenCalledWith('user-1', {
      status: 0,
      reason: '系统管理员从用户管理页禁用账号',
    })

    await wrapper.get('[data-testid="user-freeze-trigger"]').trigger('click')
    expect(wrapper.text()).toContain('freeze-open-zhangsan')
  })

  it('关键词查询只筛选当前页结果，不向后端发送不存在的 keyword 参数', async () => {
    const { module, error } = await loadListView()

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
    userStore.adminUserList = [
      {
        id: 'user-1',
        username: 'zhangsan',
        email: 'zhangsan@example.com',
        realName: '张三',
        phone: '13800138001',
        status: 1,
        freezeStatus: FreezeStatus.NORMAL,
        roleId: 'role-user',
        roleName: UserRole.USER,
      },
      {
        id: 'user-2',
        username: 'lisi',
        email: 'lisi@example.com',
        realName: '李四',
        phone: '13800138002',
        status: 1,
        freezeStatus: FreezeStatus.NORMAL,
        roleId: 'role-user',
        roleName: UserRole.USER,
      },
    ]
    userStore.adminUserTotal = 2

    const fetchAdminUserListSpy = vi
      .spyOn(userStore, 'fetchAdminUserList')
      .mockResolvedValue({ total: 2, records: userStore.adminUserList })
    vi.spyOn(userStore, 'fetchRoleList').mockResolvedValue([])

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          SearchBar: {
            props: ['modelValue'],
            emits: ['update:modelValue', 'search', 'reset'],
            template:
              '<div><button data-testid="set-keyword" @click="$emit(\'update:modelValue\', \'zhang\')">set</button><button data-testid="search-trigger" @click="$emit(\'search\', modelValue)">search</button></div>',
          },
          Pagination: {
            template: '<div class="pagination-stub"></div>',
          },
          EmptyState: {
            template: '<div class="empty-state-stub"><slot /></div>',
          },
          FreezeStatusTag: {
            props: ['status'],
            template: '<span class="freeze-status-tag">{{ status }}</span>',
          },
          Freeze: {
            props: ['modelValue', 'user'],
            template: '<div></div>',
          },
          RoleAssign: {
            props: ['modelValue', 'user'],
            template: '<div></div>',
          },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElIcon: {
            template: '<i><slot /></i>',
          },
          ElTable: {
            template: '<div class="el-table-stub"><slot /></div>',
          },
          ElTableColumn: {
            template: '<div><slot :row="$attrs.row || {}" /></div>',
          },
          ElTag: {
            template: '<span><slot /></span>',
          },
        },
        directives: {
          loading: {
            mounted() {},
            updated() {},
          },
        },
      },
    })

    expect(fetchAdminUserListSpy).toHaveBeenCalledTimes(1)
    await wrapper.get('[data-testid="set-keyword"]').trigger('click')
    await wrapper.get('[data-testid="search-trigger"]').trigger('click')

    expect(fetchAdminUserListSpy).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('zhangsan')
    expect(wrapper.text()).not.toContain('lisi')
  })
})
