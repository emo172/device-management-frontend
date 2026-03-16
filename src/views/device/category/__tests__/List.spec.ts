import { setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApprovalMode } from '@/enums'
import { UserRole } from '@/enums'
import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'
import { useCategoryStore } from '@/stores/modules/category'

const categoryViewModules = import.meta.glob('../*.vue')

async function loadListView() {
  const loader = categoryViewModules['../List.vue']

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

const categoryTree = [
  {
    id: 'category-1',
    name: '测试设备',
    parentId: null,
    sortOrder: 1,
    description: '一级分类',
    defaultApprovalMode: ApprovalMode.DEVICE_ONLY,
    children: [],
  },
]

describe('category list view', () => {
  beforeEach(() => {
    setActivePinia(createAppPinia())
  })

  it('进入分类页会加载分类树，并为设备管理员展示新建入口', async () => {
    const { module, error } = await loadListView()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'device-admin@example.com',
      phone: '13800138000',
      realName: '设备管理员',
      role: UserRole.DEVICE_ADMIN,
      userId: 'device-admin-1',
      username: 'device-admin',
    })

    const categoryStore = useCategoryStore()
    categoryStore.tree = categoryTree
    vi.spyOn(categoryStore, 'fetchCategoryTree').mockResolvedValue(categoryTree)

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          Manage: {
            props: ['modelValue'],
            template: '<div v-if="modelValue" class="manage-visible"></div>',
          },
          EmptyState: { template: '<div><slot /></div>' },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElCard: { template: '<section><slot /></section>' },
          ElIcon: { template: '<i><slot /></i>' },
          ElTag: { template: '<span><slot /></span>' },
          ElTree: { template: '<div class="category-tree"></div>' },
        },
      },
    })

    expect(categoryStore.fetchCategoryTree).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('新建分类')

    await wrapper.get('.category-list-view__create').trigger('click')

    expect(wrapper.find('.manage-visible').exists()).toBe(true)
  })
})
