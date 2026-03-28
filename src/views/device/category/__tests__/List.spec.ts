import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApprovalMode } from '@/enums'
import { UserRole } from '@/enums'
import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'
import { useCategoryStore } from '@/stores/modules/category'

const categoryViewModules = import.meta.glob('../*.vue')

function readCategoryViewSource(fileName: 'List.vue') {
  return readFileSync(resolve(process.cwd(), `src/views/device/category/${fileName}`), 'utf-8')
}

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
            props: ['modelValue', 'categoryOptions'],
            template:
              '<div><div v-if="modelValue" class="manage-visible"></div><div class="manage-options">{{ categoryOptions[0]?.value }}|{{ categoryOptions[0]?.children?.length ?? 0 }}</div></div>',
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
    expect(wrapper.get('.manage-options').text()).toBe('测试设备|0')

    await wrapper.get('.category-list-view__create').trigger('click')

    expect(wrapper.find('.manage-visible').exists()).toBe(true)
  })

  it('分类树页源码改为消费主题 token，避免树节点和统计壳层在深色下继续贴着默认底色', () => {
    const source = readCategoryViewSource('List.vue')

    // 分类树文字密度高且包含层级关系，必须锁定树容器和节点 token，否则深色下最容易出现节点贴底与文字发灰。
    expect(source).toContain('var(--app-surface-card)')
    expect(source).toContain('var(--app-surface-muted)')
    expect(source).toContain('var(--app-border-soft)')
    expect(source).toContain('var(--app-tone-brand-surface)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(source).not.toMatch(hardcodedColorPattern)
  })
})
