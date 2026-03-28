import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const userViewModules = import.meta.glob('../*.vue')
const fetchUserDetailMock = vi.fn()
const resetCurrentManagedUserMock = vi.fn()

function readUserViewSource(fileName: string) {
  return readFileSync(resolve(process.cwd(), `src/views/user/${fileName}`), 'utf-8')
}

const routeState = {
  params: { id: 'user-2' },
}

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    useRoute: () => routeState,
  }
})

vi.mock('@/stores/modules/user', () => ({
  useUserStore: () => ({
    currentManagedUser: {
      id: 'user-1',
      username: 'old-user',
      email: 'old@example.com',
      realName: '旧用户',
      phone: '13800138000',
      status: 1,
      freezeStatus: 'NORMAL',
      freezeReason: null,
      freezeExpireTime: null,
      roleId: 'role-user',
      roleName: 'USER',
      lastLoginTime: null,
      createdAt: '2024-01-01T10:00:00',
      updatedAt: '2024-01-01T10:00:00',
    },
    detailLoading: false,
    fetchUserDetail: fetchUserDetailMock,
    resetCurrentManagedUser: resetCurrentManagedUserMock,
  }),
}))

describe('user detail view', () => {
  beforeEach(() => {
    fetchUserDetailMock.mockReset()
    resetCurrentManagedUserMock.mockReset()
  })

  it('loads new detail after clearing stale managed user snapshot', async () => {
    const loader = userViewModules['../Detail.vue']

    expect(loader).toBeTypeOf('function')

    if (!loader) {
      return
    }

    const module = (await loader()) as { default: object }

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          FreezeStatusTag: { template: '<div></div>' },
          EmptyState: { template: '<div></div>' },
          ElCard: { template: '<div><slot /><slot name="header" /></div>' },
          ElTag: { template: '<span><slot /></span>' },
          ElDescriptions: { template: '<div><slot /></div>' },
          ElDescriptionsItem: { template: '<div><slot /></div>' },
        },
      },
    })

    expect(resetCurrentManagedUserMock).toHaveBeenCalledTimes(1)
    expect(fetchUserDetailMock).toHaveBeenCalledWith('user-2')
    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
  })

  it('用户详情页源码改为消费主题 token，避免详情卡和风险面板在深色下残留浅色硬编码', () => {
    const source = readUserViewSource('Detail.vue')

    // 详情页需要统一收口主卡片和风险侧栏的层级语义，否则深色下最容易残留浅色背景与阴影口径。
    expect(source).toContain('var(--app-surface-card)')
    expect(source).toContain('var(--app-tone-danger-surface)')
    expect(source).toContain('var(--app-shadow-card)')
    expect(source).toContain('var(--app-border-soft)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(source).not.toMatch(hardcodedColorPattern)
  })
})
