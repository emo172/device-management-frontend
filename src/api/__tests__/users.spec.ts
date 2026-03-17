import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FreezeStatus } from '@/enums'

const { getMock, postMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
}))

vi.mock('@/api/request', () => ({
  default: {
    get: getMock,
    post: postMock,
    put: putMock,
  },
}))

import * as usersApi from '../users'

describe('users api', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
    putMock.mockReset()
  })

  it('requests admin user list with page and size params', async () => {
    const response = {
      total: 2,
      records: [
        {
          id: 'user-1',
          username: 'user',
          email: 'user@example.com',
          realName: '普通用户',
          phone: '13800138000',
          status: 1,
          freezeStatus: 'NORMAL',
          roleId: 'role-1',
          roleName: 'USER',
        },
      ],
    }
    getMock.mockResolvedValue(response)

    await expect(usersApi.getUserList({ page: 2, size: 5 })).resolves.toBe(response)
    expect(getMock).toHaveBeenCalledWith('/admin/users', {
      params: {
        page: 2,
        size: 5,
      },
    })
  })

  it('updates user status and role with admin endpoints', async () => {
    const response = { userId: 'user-1', status: 1, roleId: 'role-1' }
    putMock.mockResolvedValue(response)

    const statusPayload = { status: 0, reason: '违规操作' }
    const rolePayload = { roleId: 'role-2' }

    await expect(usersApi.updateUserStatus('user-1', statusPayload)).resolves.toBe(response)
    await expect(usersApi.updateUserRole('user-1', rolePayload)).resolves.toBe(response)

    expect(putMock).toHaveBeenNthCalledWith(1, '/admin/users/user-1/status', statusPayload)
    expect(putMock).toHaveBeenNthCalledWith(2, '/admin/users/user-1/role', rolePayload)
  })

  it('uses freeze endpoint with backend freeze status payload', async () => {
    const response = { userId: 'user-1', freezeStatus: FreezeStatus.FROZEN }
    postMock.mockResolvedValue(response)

    const payload = { freezeStatus: FreezeStatus.FROZEN, reason: '多次逾期未处理' }

    await expect(usersApi.freezeUser('user-1', payload)).resolves.toBe(response)
    expect(postMock).toHaveBeenCalledWith('/admin/users/user-1/freeze', payload)
  })

  it('requests user detail from admin detail endpoint', async () => {
    const response = {
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
    }
    getMock.mockResolvedValue(response)

    expect(usersApi).toHaveProperty('getUserDetail')
    await expect(usersApi.getUserDetail('user-1')).resolves.toBe(response)
    expect(getMock).toHaveBeenCalledWith('/admin/users/user-1')
  })
})
