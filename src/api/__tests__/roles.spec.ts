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

import { getRoleList, updateRolePermissions } from '../roles'

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
})
