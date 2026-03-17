import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { FreezeStatus, UserRole } from '@/enums'

const {
  freezeUserMock,
  getUserDetailMock,
  getRoleListMock,
  getRolePermissionTreeMock,
  getUserListMock,
  updateRolePermissionsMock,
  updateUserRoleMock,
  updateUserStatusMock,
} = vi.hoisted(() => ({
  freezeUserMock: vi.fn(),
  getUserDetailMock: vi.fn(),
  getRoleListMock: vi.fn(),
  getRolePermissionTreeMock: vi.fn(),
  getUserListMock: vi.fn(),
  updateRolePermissionsMock: vi.fn(),
  updateUserRoleMock: vi.fn(),
  updateUserStatusMock: vi.fn(),
}))

vi.mock('@/api/users', () => ({
  freezeUser: freezeUserMock,
  getUserDetail: getUserDetailMock,
  getUserList: getUserListMock,
  updateUserRole: updateUserRoleMock,
  updateUserStatus: updateUserStatusMock,
}))

vi.mock('@/api/roles', () => ({
  getRoleList: getRoleListMock,
  getRolePermissionTree: getRolePermissionTreeMock,
  updateRolePermissions: updateRolePermissionsMock,
}))

import { useUserStore } from '../modules/user'

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void

  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve
  })

  return { promise, resolve }
}

describe('user store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    freezeUserMock.mockReset()
    getUserDetailMock.mockReset()
    getRoleListMock.mockReset()
    getRolePermissionTreeMock.mockReset()
    getUserListMock.mockReset()
    updateRolePermissionsMock.mockReset()
    updateUserRoleMock.mockReset()
    updateUserStatusMock.mockReset()
  })

  it('loads available role list without fabricating user list api', async () => {
    getRoleListMock.mockResolvedValue([
      { id: 'role-1', name: 'USER', description: '普通用户' },
      { id: 'role-2', name: 'SYSTEM_ADMIN', description: '系统管理员' },
    ])

    const store = useUserStore()
    await store.fetchRoleList()

    expect(store.roleList).toHaveLength(2)
  })

  it('loads reservation target users and filters non-user roles', async () => {
    getUserListMock.mockResolvedValue({
      total: 3,
      records: [
        {
          id: 'user-1',
          username: 'user-1',
          email: 'user1@example.com',
          realName: '普通用户甲',
          phone: '13800138001',
          status: 1,
          freezeStatus: 'NORMAL',
          roleId: 'role-user',
          roleName: 'USER',
        },
        {
          id: 'admin-1',
          username: 'sysadmin',
          email: 'admin@example.com',
          realName: '系统管理员',
          phone: '13800138002',
          status: 1,
          freezeStatus: 'NORMAL',
          roleId: 'role-admin',
          roleName: 'SYSTEM_ADMIN',
        },
        {
          id: 'user-2',
          username: 'user-2',
          email: 'user2@example.com',
          realName: '普通用户乙',
          phone: '13800138003',
          status: 1,
          freezeStatus: 'NORMAL',
          roleId: 'role-user',
          roleName: 'USER',
        },
      ],
    })

    const store = useUserStore()
    await store.fetchReservationTargetUsers({ page: 1, size: 20 })

    expect(getUserListMock).toHaveBeenCalledWith({ page: 1, size: 20 })
    expect(store.reservationTargetUsers).toEqual([
      {
        id: 'user-1',
        username: 'user-1',
        email: 'user1@example.com',
        realName: '普通用户甲',
        phone: '13800138001',
        status: 1,
        freezeStatus: 'NORMAL',
        roleId: 'role-user',
        roleName: 'USER',
      },
      {
        id: 'user-2',
        username: 'user-2',
        email: 'user2@example.com',
        realName: '普通用户乙',
        phone: '13800138003',
        status: 1,
        freezeStatus: 'NORMAL',
        roleId: 'role-user',
        roleName: 'USER',
      },
    ])
  })

  it('updates user admin state via status role and freeze actions', async () => {
    getRoleListMock.mockResolvedValue([
      { id: 'role-1', name: 'USER', description: '普通用户' },
      { id: 'role-2', name: 'SYSTEM_ADMIN', description: '系统管理员' },
    ])
    getUserListMock.mockResolvedValue({
      total: 1,
      records: [
        {
          id: 'user-1',
          username: 'demo',
          email: 'demo@example.com',
          realName: '演示账号',
          phone: '13800138000',
          status: 1,
          freezeStatus: 'NORMAL',
          roleId: 'role-1',
          roleName: 'USER',
        },
      ],
    })
    updateUserStatusMock.mockResolvedValue({
      userId: 'user-1',
      username: 'demo',
      status: 0,
      freezeStatus: 'NORMAL',
      roleId: 'role-1',
    })
    updateUserRoleMock.mockResolvedValue({
      userId: 'user-1',
      username: 'demo',
      status: 0,
      freezeStatus: FreezeStatus.NORMAL,
      roleId: 'role-2',
    })
    freezeUserMock.mockResolvedValue({
      userId: 'user-1',
      username: 'demo',
      status: 0,
      freezeStatus: FreezeStatus.FROZEN,
      roleId: 'role-2',
    })

    const store = useUserStore()
    await store.fetchRoleList()
    await store.fetchAdminUserList({ page: 1, size: 10 })
    await store.updateUserStatus('user-1', { status: 0, reason: '禁用' })
    await store.updateUserRole('user-1', { roleId: 'role-2' })
    await store.freezeUser('user-1', { freezeStatus: FreezeStatus.FROZEN, reason: '违规' })

    expect(store.currentManagedUser?.freezeStatus).toBe('FROZEN')
    expect(store.adminUserList[0]).toMatchObject({
      id: 'user-1',
      status: 0,
      freezeStatus: 'FROZEN',
      roleId: 'role-2',
      roleName: 'SYSTEM_ADMIN',
    })
    expect(updateUserRoleMock).toHaveBeenCalledWith('user-1', { roleId: 'role-2' })
  })

  it('loads admin user detail and keeps detail snapshot for user detail page', async () => {
    getUserDetailMock.mockResolvedValue({
      id: 'user-1',
      username: 'detail-user',
      email: 'detail@example.com',
      realName: '详情用户',
      phone: '13800138008',
      status: 1,
      freezeStatus: 'RESTRICTED',
      freezeReason: '存在逾期提醒',
      freezeExpireTime: '2024-03-10T09:00:00',
      roleId: 'role-user',
      roleName: 'USER',
      lastLoginTime: '2024-03-09T08:00:00',
      createdAt: '2024-02-01T10:00:00',
      updatedAt: '2024-03-09T08:00:00',
    })

    const store = useUserStore()
    expect(typeof store.fetchUserDetail).toBe('function')

    await store.fetchUserDetail('user-1')

    expect(getUserDetailMock).toHaveBeenCalledWith('user-1')
    expect(store.currentManagedUser).toMatchObject({
      id: 'user-1',
      freezeStatus: 'RESTRICTED',
      freezeReason: '存在逾期提醒',
    })
  })

  it('ignores stale detail response when newer user detail request finishes first', async () => {
    const firstDetailDeferred = createDeferred<{
      id: string
      username: string
      email: string
      realName: string
      phone: string
      status: number
      freezeStatus: FreezeStatus
      freezeReason: string | null
      freezeExpireTime: string | null
      roleId: string
      roleName: UserRole
      lastLoginTime: string | null
      createdAt: string
      updatedAt: string
    }>()
    const secondDetailDeferred = createDeferred<{
      id: string
      username: string
      email: string
      realName: string
      phone: string
      status: number
      freezeStatus: FreezeStatus
      freezeReason: string | null
      freezeExpireTime: string | null
      roleId: string
      roleName: UserRole
      lastLoginTime: string | null
      createdAt: string
      updatedAt: string
    }>()

    getUserDetailMock
      .mockReturnValueOnce(firstDetailDeferred.promise)
      .mockReturnValueOnce(secondDetailDeferred.promise)

    const store = useUserStore()
    const firstRequest = store.fetchUserDetail('user-1')
    const secondRequest = store.fetchUserDetail('user-2')

    secondDetailDeferred.resolve({
      id: 'user-2',
      username: 'new-user',
      email: 'new@example.com',
      realName: '新用户',
      phone: '13800138002',
      status: 1,
      freezeStatus: FreezeStatus.NORMAL,
      freezeReason: null,
      freezeExpireTime: null,
      roleId: 'role-user',
      roleName: UserRole.USER,
      lastLoginTime: null,
      createdAt: '2024-02-01T10:00:00',
      updatedAt: '2024-03-09T08:00:00',
    })
    await secondRequest

    firstDetailDeferred.resolve({
      id: 'user-1',
      username: 'old-user',
      email: 'old@example.com',
      realName: '旧用户',
      phone: '13800138001',
      status: 1,
      freezeStatus: FreezeStatus.RESTRICTED,
      freezeReason: '旧请求晚到',
      freezeExpireTime: null,
      roleId: 'role-user',
      roleName: UserRole.USER,
      lastLoginTime: null,
      createdAt: '2024-02-01T10:00:00',
      updatedAt: '2024-03-09T08:00:00',
    })
    await firstRequest

    expect(store.currentManagedUser).toMatchObject({
      id: 'user-2',
      username: 'new-user',
    })
    expect(store.detailLoading).toBe(false)
  })

  it('keeps loading true until concurrent requests all finish', async () => {
    const roleDeferred = createDeferred<Array<{ id: string; name: string; description: string }>>()
    const listDeferred = createDeferred<{
      total: number
      records: Array<{
        id: string
        username: string
        email: string
        realName: string
        phone: string
        status: number
        freezeStatus: FreezeStatus.NORMAL
        roleId: string
        roleName: UserRole.USER
      }>
    }>()

    getRoleListMock.mockReturnValue(roleDeferred.promise)
    getUserListMock.mockReturnValue(listDeferred.promise)

    const store = useUserStore()
    const rolePromise = store.fetchRoleList()
    const listPromise = store.fetchAdminUserList({ page: 1, size: 10 })

    expect(store.loading).toBe(true)

    roleDeferred.resolve([{ id: 'role-1', name: 'USER', description: '普通用户' }])
    await Promise.resolve()

    expect(store.loading).toBe(true)

    listDeferred.resolve({
      total: 1,
      records: [
        {
          id: 'user-1',
          username: 'user-1',
          email: 'user1@example.com',
          realName: '普通用户甲',
          phone: '13800138001',
          status: 1,
          freezeStatus: FreezeStatus.NORMAL,
          roleId: 'role-1',
          roleName: UserRole.USER,
        },
      ],
    })

    await Promise.all([rolePromise, listPromise])

    expect(store.loading).toBe(false)
  })

  it('loads selected role permission tree and keeps selected role context', async () => {
    getRolePermissionTreeMock.mockResolvedValue([
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
          {
            permissionId: 'perm-2',
            code: 'device:edit',
            name: '编辑设备',
            description: '允许维护设备信息',
            selected: false,
          },
        ],
      },
    ])

    const store = useUserStore()
    await store.fetchRolePermissionTree('role-2')

    expect(getRolePermissionTreeMock).toHaveBeenCalledWith('role-2')
    expect(store.selectedRoleId).toBe('role-2')
    expect(store.currentRolePermissionTree).toEqual([
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
          {
            permissionId: 'perm-2',
            code: 'device:edit',
            name: '编辑设备',
            description: '允许维护设备信息',
            selected: false,
          },
        ],
      },
    ])
  })

  it('tracks last role permission update result and rewrites selected tree snapshot', async () => {
    updateRolePermissionsMock.mockResolvedValue(undefined)

    const store = useUserStore()
    store.selectedRoleId = 'role-2'
    store.currentRolePermissionTree = [
      {
        module: 'DEVICE',
        permissions: [
          {
            permissionId: 'perm-1',
            code: 'device:view',
            name: '查看设备',
            description: '允许查看设备详情',
            selected: false,
          },
          {
            permissionId: 'perm-2',
            code: 'device:edit',
            name: '编辑设备',
            description: '允许维护设备信息',
            selected: false,
          },
        ],
      },
    ]

    await store.updateRolePermissions('role-2', { permissionIds: ['perm-1', 'perm-2'] })

    expect(store.lastPermissionUpdate).toMatchObject({
      roleId: 'role-2',
      permissionIds: ['perm-1', 'perm-2'],
      updatedAt: expect.any(String),
    })
    expect(store.currentRolePermissionTree[0]?.permissions).toEqual([
      expect.objectContaining({ permissionId: 'perm-1', selected: true }),
      expect.objectContaining({ permissionId: 'perm-2', selected: true }),
    ])
  })

  it('resetState also clears reservation target users', async () => {
    const store = useUserStore()
    store.reservationTargetUsers = [
      {
        id: 'user-1',
        username: 'user-1',
        email: 'user1@example.com',
        realName: '普通用户甲',
        phone: '13800138001',
        status: 1,
        freezeStatus: FreezeStatus.NORMAL,
        roleId: 'role-user',
        roleName: UserRole.USER,
      },
    ]
    store.selectedRoleId = 'role-2'
    store.currentRolePermissionTree = [
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

    store.resetState()

    expect(store.reservationTargetUsers).toEqual([])
    expect(store.selectedRoleId).toBe('role-2')
    expect(store.currentRolePermissionTree).toHaveLength(1)
  })
})
