import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const {
  freezeUserMock,
  getRoleListMock,
  getUserListMock,
  updateRolePermissionsMock,
  updateUserRoleMock,
  updateUserStatusMock,
} = vi.hoisted(() => ({
  freezeUserMock: vi.fn(),
  getRoleListMock: vi.fn(),
  getUserListMock: vi.fn(),
  updateRolePermissionsMock: vi.fn(),
  updateUserRoleMock: vi.fn(),
  updateUserStatusMock: vi.fn(),
}))

vi.mock('@/api/users', () => ({
  freezeUser: freezeUserMock,
  getUserList: getUserListMock,
  updateUserRole: updateUserRoleMock,
  updateUserStatus: updateUserStatusMock,
}))

vi.mock('@/api/roles', () => ({
  getRoleList: getRoleListMock,
  updateRolePermissions: updateRolePermissionsMock,
}))

import { useUserStore } from '../modules/user'

describe('user store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    freezeUserMock.mockReset()
    getRoleListMock.mockReset()
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
      freezeStatus: 'NORMAL',
      roleId: 'role-2',
    })
    freezeUserMock.mockResolvedValue({
      userId: 'user-1',
      username: 'demo',
      status: 0,
      freezeStatus: 'FROZEN',
      roleId: 'role-2',
    })

    const store = useUserStore()
    await store.updateUserStatus('user-1', { status: 0, reason: '禁用' })
    await store.updateUserRole('user-1', { roleId: 'role-2' })
    await store.freezeUser('user-1', { freezeStatus: 'FROZEN', reason: '违规' })

    expect(store.currentManagedUser?.freezeStatus).toBe('FROZEN')
    expect(updateUserRoleMock).toHaveBeenCalledWith('user-1', { roleId: 'role-2' })
  })

  it('tracks last role permission update result', async () => {
    updateRolePermissionsMock.mockResolvedValue(undefined)

    const store = useUserStore()
    await store.updateRolePermissions('role-2', { permissionIds: ['perm-1', 'perm-2'] })

    expect(store.lastPermissionUpdate).toEqual({
      roleId: 'role-2',
      permissionIds: ['perm-1', 'perm-2'],
    })
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
        freezeStatus: 'NORMAL',
        roleId: 'role-user',
        roleName: 'USER',
      },
    ]

    store.resetState()

    expect(store.reservationTargetUsers).toEqual([])
  })
})
