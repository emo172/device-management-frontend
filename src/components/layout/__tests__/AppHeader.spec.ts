import { setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'
import { useNotificationStore } from '@/stores/modules/notification'
import { UserRole } from '@/enums/UserRole'

const pushMock = vi.fn()
const routeState = {
  matched: [
    { meta: { title: '仪表盘' }, path: '/dashboard' },
    { meta: { title: '统计分析' }, path: '/statistics' },
  ],
}

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    useRoute: () => routeState,
    useRouter: () => ({ push: pushMock }),
  }
})

const AppHeader = (await import('../AppHeader.vue')).default

describe('AppHeader', () => {
  beforeEach(() => {
    pushMock.mockReset()
    setActivePinia(createAppPinia())
  })

  it('展示当前用户与未读通知数量，并支持跳转通知中心', async () => {
    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'admin@example.com',
      phone: '13800138000',
      realName: '系统管理员',
      role: UserRole.SYSTEM_ADMIN,
      userId: 'admin-1',
      username: 'admin',
    })

    const notificationStore = useNotificationStore()
    notificationStore.unreadCount = 5
    vi.spyOn(notificationStore, 'fetchUnreadCount').mockResolvedValue(5)
    vi.spyOn(notificationStore, 'startPolling').mockImplementation(() => undefined)
    vi.spyOn(notificationStore, 'stopPolling').mockImplementation(() => undefined)

    const wrapper = mount(AppHeader, {
      global: {
        stubs: {
          ElAvatar: { template: '<div><slot /></div>' },
          ElBadge: {
            props: ['value'],
            template: '<div><slot />{{ value }}</div>',
          },
          ElBreadcrumb: { template: '<div><slot /></div>' },
          ElBreadcrumbItem: { template: '<span><slot /></span>' },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElDropdown: { template: '<div><slot /><slot name="dropdown" /></div>' },
          ElDropdownItem: { template: '<button><slot /></button>' },
          ElDropdownMenu: { template: '<div><slot /></div>' },
          ElIcon: { template: '<i><slot /></i>' },
        },
      },
    })

    expect(wrapper.text()).toContain('系统管理员')
    expect(wrapper.text()).toContain('5')

    await wrapper.get('[data-testid="notification-entry"]').trigger('click')

    expect(pushMock).toHaveBeenCalledWith('/notifications')
  })

  it('首次获取未读数失败时仍会启动轮询', async () => {
    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'admin@example.com',
      phone: '13800138000',
      realName: '系统管理员',
      role: UserRole.SYSTEM_ADMIN,
      userId: 'admin-1',
      username: 'admin',
    })

    const notificationStore = useNotificationStore()
    vi.spyOn(notificationStore, 'fetchUnreadCount').mockRejectedValue(new Error('network error'))
    const startPollingSpy = vi
      .spyOn(notificationStore, 'startPolling')
      .mockImplementation(() => undefined)
    vi.spyOn(notificationStore, 'stopPolling').mockImplementation(() => undefined)

    mount(AppHeader, {
      global: {
        stubs: {
          ElAvatar: { template: '<div><slot /></div>' },
          ElBadge: {
            props: ['value'],
            template: '<div><slot />{{ value }}</div>',
          },
          ElBreadcrumb: { template: '<div><slot /></div>' },
          ElBreadcrumbItem: { template: '<span><slot /></span>' },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElDropdown: { template: '<div><slot /><slot name="dropdown" /></div>' },
          ElDropdownItem: { template: '<button><slot /></button>' },
          ElDropdownMenu: { template: '<div><slot /></div>' },
          ElIcon: { template: '<i><slot /></i>' },
        },
      },
    })

    await flushPromises()

    expect(startPollingSpy).toHaveBeenCalledTimes(1)
  })
})
