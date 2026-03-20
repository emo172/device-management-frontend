import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { createCategoryMock, getCategoryTreeMock } = vi.hoisted(() => ({
  createCategoryMock: vi.fn(),
  getCategoryTreeMock: vi.fn(),
}))

vi.mock('@/api/categories', () => ({
  createCategory: createCategoryMock,
  getCategoryTree: getCategoryTreeMock,
}))

import { useCategoryStore } from '../modules/category'

const categoryTree = [
  {
    id: 'category-1',
    name: '测试设备',
    parentId: null,
    sortOrder: 1,
    description: '一级分类',
    defaultApprovalMode: 'DEVICE_ONLY' as const,
    children: [
      {
        id: 'category-2',
        name: '高端仪器',
        parentId: 'category-1',
        sortOrder: 1,
        description: '二级分类',
        defaultApprovalMode: 'DEVICE_THEN_SYSTEM' as const,
        children: [],
      },
    ],
  },
]

describe('category store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    createCategoryMock.mockReset()
    getCategoryTreeMock.mockReset()
  })

  it('加载分类树并提供树形选项', async () => {
    getCategoryTreeMock.mockResolvedValue(categoryTree)

    const store = useCategoryStore()
    const result = await store.fetchCategoryTree()

    expect(getCategoryTreeMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual(categoryTree)
    expect(store.tree).toEqual(categoryTree)
    expect(store.options).toEqual([
      {
        label: '测试设备',
        value: '测试设备',
        children: [{ label: '高端仪器', value: '高端仪器' }],
      },
    ])
  })

  it('创建分类后会把新节点并入本地树，便于弹窗关闭后立即回显', async () => {
    getCategoryTreeMock.mockResolvedValue(categoryTree)
    createCategoryMock.mockResolvedValue({
      id: 'category-3',
      name: '传感器',
      parentId: null,
      sortOrder: 2,
      description: '新增分类',
      defaultApprovalMode: 'DEVICE_ONLY',
      children: [],
    })

    const store = useCategoryStore()
    await store.fetchCategoryTree()
    await store.createCategory({
      name: '传感器',
      parentName: null,
      sortOrder: 2,
      description: '新增分类',
      defaultApprovalMode: 'DEVICE_ONLY',
    })

    expect(store.tree).toHaveLength(2)
    expect(store.tree[1]?.name).toBe('传感器')
  })

  it('本地树插入只接受根分类 parentName，非根名称不能被当作受支持契约', () => {
    const store = useCategoryStore()
    store.tree = structuredClone(categoryTree)

    store.insertCategoryNode(
      {
        id: 'category-4',
        name: '非法子分类',
        parentId: 'category-2',
        sortOrder: 2,
        description: '不应插入到非根节点',
        defaultApprovalMode: 'DEVICE_ONLY',
        children: [],
      },
      '高端仪器',
    )

    /*
     * 后端只按根分类名解析 `parentName`，
     * 因此前端本地树也不能把非根分类名当成合法父级，否则页面回显会与真实接口契约不一致。
     */
    expect(store.tree[0]?.children).toHaveLength(1)
    expect(store.tree[0]?.children[0]?.name).toBe('高端仪器')
    expect(store.tree[0]?.children[0]?.children).toHaveLength(0)
  })
})
