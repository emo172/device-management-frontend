import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  putMock: vi.fn(),
}))

vi.mock('@/api/request', () => ({
  default: {
    get: getMock,
    put: putMock,
  },
}))

import { getRoleList, getRolePermissionTree, updateRolePermissions } from '../roles'

describe('roles api', () => {
  beforeEach(() => {
    getMock.mockReset()
    putMock.mockReset()
  })

  it('loads role list from admin roles endpoint', async () => {
    const response = [{ id: 'role-1', name: 'SYSTEM_ADMIN' }]
    getMock.mockResolvedValue(response)

    await expect(getRoleList()).resolves.toBe(response)
    expect(getMock).toHaveBeenCalledWith('/admin/roles')
  })

  it('updates role permissions with backend payload', async () => {
    putMock.mockResolvedValue(undefined)

    const payload = { permissionIds: ['permission-1', 'permission-2'] }

    await expect(updateRolePermissions('role-1', payload)).resolves.toBeUndefined()
    expect(putMock).toHaveBeenCalledWith('/admin/roles/role-1/permissions', payload)
  })

  it('loads role permission tree for selected role from backend', async () => {
    const response = [
      {
        module: 'DEVICE',
        permissions: [
          {
            permissionId: 'permission-1',
            code: 'device:view',
            name: '查看设备',
            description: '允许查看设备详情',
            selected: true,
          },
        ],
      },
    ]

    getMock.mockResolvedValue(response)

    await expect(getRolePermissionTree('role-1')).resolves.toBe(response)
    expect(getMock).toHaveBeenCalledWith('/admin/roles/role-1/permissions/tree')
  })
})
