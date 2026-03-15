import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}))

vi.mock('@/api/request', () => ({
  default: {
    get: getMock,
    post: postMock,
  },
}))

import { createCategory, getCategoryTree, type CreateCategoryRequest } from '../categories'

describe('categories api', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
  })

  it('creates category through device category endpoint', async () => {
    const response = { id: 'category-1', name: '实验设备' }
    postMock.mockResolvedValue(response)

    const payload: CreateCategoryRequest = {
      name: '实验设备',
      parentName: '设备管理',
      sortOrder: 1,
      description: '一级分类',
      defaultApprovalMode: 'DEVICE_THEN_SYSTEM',
    }

    await expect(createCategory(payload)).resolves.toBe(response)
    expect(postMock).toHaveBeenCalledWith('/device-categories', payload)
  })

  it('loads category tree from tree endpoint', async () => {
    const response = [{ id: 'category-1', children: [] }]
    getMock.mockResolvedValue(response)

    await expect(getCategoryTree()).resolves.toBe(response)
    expect(getMock).toHaveBeenCalledWith('/device-categories/tree')
  })
})
