import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FreezeStatus, UserRole } from '@/enums'
import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'

const pushMock = vi.fn()
const userViewModules = import.meta.glob('../*.vue')

function readUserViewSource(fileName: string) {
  return readFileSync(resolve(process.cwd(), `src/views/user/${fileName}`), 'utf-8')
}

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
    const initialRecords = [
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
    userStore.adminUserList = initialRecords
    userStore.adminUserTotal = 1

    const fetchAdminUserListSpy = vi
      .spyOn(userStore, 'fetchAdminUserList')
      .mockImplementation(async () => {
        userStore.adminUserList = initialRecords
        userStore.adminUserTotal = 1
        return { total: 1, records: initialRecords }
      })
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
    expect(wrapper.find('.console-table-section').exists()).toBe(true)
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
    const initialRecords = [
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
    userStore.adminUserList = initialRecords
    userStore.adminUserTotal = 2

    const fetchAdminUserListSpy = vi
      .spyOn(userStore, 'fetchAdminUserList')
      .mockImplementation(async () => {
        userStore.adminUserList = initialRecords
        userStore.adminUserTotal = 2
        return { total: 2, records: initialRecords }
      })
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

  it('重新进入页面且首次加载失败时，会先清空旧列表上下文避免继续操作陈旧数据', async () => {
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
        id: 'user-stale',
        username: 'stale-user',
        email: 'stale@example.com',
        realName: '旧用户',
        phone: '13800138009',
        status: 1,
        freezeStatus: FreezeStatus.NORMAL,
        roleId: 'role-user',
        roleName: UserRole.USER,
      },
    ]
    userStore.adminUserTotal = 1

    vi.spyOn(userStore, 'fetchAdminUserList').mockRejectedValue(new Error('load failed'))
    vi.spyOn(userStore, 'fetchRoleList').mockResolvedValue([])

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          SearchBar: { template: '<div class="search-bar-stub"></div>' },
          Pagination: { template: '<div class="pagination-stub"></div>' },
          EmptyState: { template: '<div class="empty-state-stub"><slot /></div>' },
          FreezeStatusTag: {
            props: ['status'],
            template: '<span class="freeze-status-tag">{{ status }}</span>',
          },
          Freeze: { props: ['modelValue', 'user'], template: '<div></div>' },
          RoleAssign: { props: ['modelValue', 'user'], template: '<div></div>' },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElIcon: { template: '<i><slot /></i>' },
          ElTable: { template: '<div class="el-table-stub"><slot /></div>' },
          ElTableColumn: { template: '<div><slot :row="$attrs.row || {}" /></div>' },
          ElTag: { template: '<span><slot /></span>' },
        },
        directives: {
          loading: {
            mounted() {},
            updated() {},
          },
        },
      },
    })

    await flushPromises()

    expect(userStore.adminUserList).toEqual([])
    expect(userStore.adminUserTotal).toBe(0)
    expect(wrapper.text()).not.toContain('stale-user')
  })

  it('受限账号入口文案会明确提示调整限制，而不是继续显示冻结账号', async () => {
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
        id: 'user-3',
        username: 'wangwu',
        email: 'wangwu@example.com',
        realName: '王五',
        phone: '13800138003',
        status: 1,
        freezeStatus: FreezeStatus.RESTRICTED,
        roleId: 'role-user',
        roleName: UserRole.USER,
      },
    ]
    userStore.adminUserTotal = 1

    vi.spyOn(userStore, 'fetchAdminUserList').mockResolvedValue({
      total: 1,
      records: userStore.adminUserList,
    })
    vi.spyOn(userStore, 'fetchRoleList').mockResolvedValue([])

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          SearchBar: { template: '<div class="search-bar-stub"></div>' },
          Pagination: { template: '<div class="pagination-stub"></div>' },
          EmptyState: { template: '<div class="empty-state-stub"><slot /></div>' },
          FreezeStatusTag: {
            props: ['status'],
            template: '<span class="freeze-status-tag">{{ status }}</span>',
          },
          Freeze: { props: ['modelValue', 'user'], template: '<div></div>' },
          RoleAssign: { props: ['modelValue', 'user'], template: '<div></div>' },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElIcon: { template: '<i><slot /></i>' },
          ElTable: { template: '<div class="el-table-stub"><slot /></div>' },
          ElTableColumn: { template: '<div><slot :row="$attrs.row || {}" /></div>' },
          ElTag: { template: '<span><slot /></span>' },
        },
        directives: {
          loading: {
            mounted() {},
            updated() {},
          },
        },
      },
    })

    expect(wrapper.get('[data-testid="user-freeze-trigger"]').text()).toBe('调整限制')
  })

  it('用户管理页源码改为消费主题 token，避免 hero 和用户卡在深色下残留浅色硬编码', () => {
    const source = readUserViewSource('List.vue')

    // 用户管理页同时包含 hero、摘要卡和表格壳层，这里直接锁定语义 token，避免后续把浅色卡片重新写回列表页。
    expect(source).toContain('var(--app-surface-card)')
    expect(source).toContain('var(--app-tone-brand-surface)')
    expect(source).toContain('var(--app-shadow-card)')
    expect(source).toContain('var(--app-border-soft)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(source).not.toMatch(hardcodedColorPattern)
  })
})
