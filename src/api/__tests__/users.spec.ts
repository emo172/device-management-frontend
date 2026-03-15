import { beforeEach, describe, expect, it, vi } from 'vitest'

const { postMock, putMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  putMock: vi.fn(),
}))

vi.mock('@/api/request', () => ({
  default: {
    post: postMock,
    put: putMock,
  },
}))

import { freezeUser, updateUserRole, updateUserStatus } from '../users'

describe('users api', () => {
  beforeEach(() => {
    postMock.mockReset()
    putMock.mockReset()
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
