import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const userViewModules = import.meta.glob('../*.vue')
const fetchUserDetailMock = vi.fn()
const resetCurrentManagedUserMock = vi.fn()

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

    mount(module.default, {
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
  })
})
