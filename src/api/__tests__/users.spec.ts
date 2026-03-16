import { beforeEach, describe, expect, it, vi } from 'vitest'

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

import { freezeUser, getUserList, updateUserRole, updateUserStatus } from '../users'

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

    await expect(getUserList({ page: 2, size: 5 })).resolves.toBe(response)
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

    await expect(updateUserStatus('user-1', statusPayload)).resolves.toBe(response)
    await expect(updateUserRole('user-1', rolePayload)).resolves.toBe(response)

    expect(putMock).toHaveBeenNthCalledWith(1, '/admin/users/user-1/status', statusPayload)
    expect(putMock).toHaveBeenNthCalledWith(2, '/admin/users/user-1/role', rolePayload)
  })

  it('uses freeze endpoint with backend freeze status payload', async () => {
    const response = { userId: 'user-1', freezeStatus: 'FROZEN' }
    postMock.mockResolvedValue(response)

    const payload = { freezeStatus: 'FROZEN', reason: '多次逾期未处理' }

    await expect(freezeUser('user-1', payload)).resolves.toBe(response)
    expect(postMock).toHaveBeenCalledWith('/admin/users/user-1/freeze', payload)
  })
})
