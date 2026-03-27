import { setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'
import { useNotificationStore } from '@/stores/modules/notification'
import { UserRole } from '@/enums/UserRole'

const pushMock = vi.fn()
const routeState = {
  path: '/reservations/manage/pending',
  name: 'ReservationPendingAudit',
  meta: {
    title: '预约审核',
  },
  matched: [
    {
      name: 'ReservationList',
      meta: { title: '预约管理' },
      path: '/reservations',
    },
    {
      name: 'ReservationPendingAudit',
      meta: { title: '预约审核' },
      path: '/reservations/manage/pending',
    },
  ],
}

function setRouteState(nextRouteState: Partial<typeof routeState>) {
  Object.assign(routeState, nextRouteState)
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

function mountHeader() {
  return mount(AppHeader, {
    global: {
      stubs: {
        ElAvatar: { template: '<div><slot /></div>' },
        ElBadge: {
          props: ['hidden', 'value'],
          template: '<div><slot />{{ hidden ? 0 : value }}</div>',
        },
        ElBreadcrumb: {
          props: ['separator'],
          template: '<nav class="el-breadcrumb-stub" :data-separator="separator"><slot /></nav>',
        },
        ElBreadcrumbItem: {
          template: '<span class="el-breadcrumb-item-stub"><slot /></span>',
        },
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
}

async function cleanupMountedHeader(wrapper: ReturnType<typeof mountHeader>) {
  await flushPromises()
  wrapper.unmount()
}

describe('AppHeader', () => {
  beforeEach(() => {
    pushMock.mockReset()
    window.localStorage.clear()
    setActivePinia(createAppPinia())
    setRouteState({
      path: '/reservations/manage/pending',
      name: 'ReservationPendingAudit',
      meta: {
        title: '预约审核',
      },
      matched: [
        {
          name: 'ReservationList',
          meta: { title: '预约管理' },
          path: '/reservations',
        },
        {
          name: 'ReservationPendingAudit',
          meta: { title: '预约审核' },
          path: '/reservations/manage/pending',
        },
      ],
    })
  })

  it('展示当前页面标题与面包屑上下文', async () => {
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

    const wrapper = mountHeader()

    expect(wrapper.find('.app-header__surface').exists()).toBe(true)
    expect(wrapper.find('.app-header__context').exists()).toBe(true)
    expect(wrapper.get('.app-header__page-title').text()).toBe('预约审核')
    expect(wrapper.findAll('.el-breadcrumb-item-stub').map((item) => item.text())).toEqual([
      '预约业务',
      '预约审核',
    ])

    await cleanupMountedHeader(wrapper)
  })

  it('设备管理员进入借用确认页时展示所属导航与当前页面标题', async () => {
    setRouteState({
      path: '/borrows/confirm',
      name: 'BorrowConfirm',
      meta: {
        title: '借用确认',
      },
      matched: [
        {
          name: 'BorrowList',
          meta: { title: '借还管理' },
          path: '/borrows',
        },
        {
          name: 'BorrowConfirm',
          meta: { title: '借用确认' },
          path: '/borrows/confirm',
        },
      ],
    })

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'device-admin@example.com',
      phone: '13800138000',
      realName: '设备管理员',
      role: UserRole.DEVICE_ADMIN,
      userId: 'device-admin-1',
      username: 'device-admin',
    })

    const notificationStore = useNotificationStore()
    vi.spyOn(notificationStore, 'fetchUnreadCount').mockResolvedValue(0)
    vi.spyOn(notificationStore, 'startPolling').mockImplementation(() => undefined)
    vi.spyOn(notificationStore, 'stopPolling').mockImplementation(() => undefined)

    const wrapper = mountHeader()

    expect(wrapper.get('.app-header__page-title').text()).toBe('借用确认')
    expect(wrapper.findAll('.el-breadcrumb-item-stub').map((item) => item.text())).toEqual([
      '设备与资产',
      '借还管理',
      '借用确认',
    ])

    await cleanupMountedHeader(wrapper)
  })

  it('保留通知数量展示与通知中心跳转行为', async () => {
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

    const wrapper = mountHeader()

    expect(wrapper.find('.app-header__notifications').exists()).toBe(true)
    expect(wrapper.find('.app-header__user-zone').exists()).toBe(true)
    expect(wrapper.text()).toContain('系统管理员')
    expect(wrapper.text()).toContain('5')
    expect(wrapper.text()).not.toContain('AI 对话')

    await wrapper.get('[data-testid="notification-entry"]').trigger('click')

    expect(pushMock).toHaveBeenCalledWith('/notifications')

    await cleanupMountedHeader(wrapper)
  })

  it('导航未命中时仍依赖 route meta.title 展示最低可用标题', async () => {
    setRouteState({
      path: '/reports/custom-view',
      name: 'CustomReportView',
      meta: {
        title: '自定义报表',
      },
      matched: [
        {
          name: 'CustomReportView',
          meta: { title: '自定义报表' },
          path: '/reports/custom-view',
        },
      ],
    })

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
    vi.spyOn(notificationStore, 'fetchUnreadCount').mockResolvedValue(0)
    vi.spyOn(notificationStore, 'startPolling').mockImplementation(() => undefined)
    vi.spyOn(notificationStore, 'stopPolling').mockImplementation(() => undefined)

    const wrapper = mountHeader()

    expect(wrapper.get('.app-header__page-title').text()).toBe('自定义报表')
    expect(wrapper.findAll('.el-breadcrumb-item-stub').map((item) => item.text())).toEqual([
      '自定义报表',
    ])

    await cleanupMountedHeader(wrapper)
  })

  it('未登录且缺少 route meta.title 时使用稳定通用标题而不是暴露路径', async () => {
    setRouteState({
      path: '/internal/raw-debug-path',
      name: 'InternalDebugPage',
      meta: {
        title: '',
      },
      matched: [
        {
          name: 'InternalDebugPage',
          meta: { title: '' },
          path: '/internal/raw-debug-path',
        },
      ],
    })

    const authStore = useAuthStore()
    authStore.setCurrentUser(null)

    const wrapper = mountHeader()

    expect(wrapper.get('.app-header__page-title').text()).toBe('当前页面')
    expect(wrapper.text()).not.toContain('/internal/raw-debug-path')

    await cleanupMountedHeader(wrapper)
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

    const wrapper = mountHeader()

    await flushPromises()

    expect(startPollingSpy).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it('组件卸载早于未读数请求完成时不会重新启动轮询', async () => {
    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'admin@example.com',
      phone: '13800138000',
      realName: '系统管理员',
      role: UserRole.SYSTEM_ADMIN,
      userId: 'admin-1',
      username: 'admin',
    })

    let resolveUnreadRequest: (() => void) | null = null
    const notificationStore = useNotificationStore()
    vi.spyOn(notificationStore, 'fetchUnreadCount').mockImplementation(
      () =>
        new Promise<number>((resolve) => {
          resolveUnreadRequest = () => resolve(3)
        }),
    )
    const startPollingSpy = vi
      .spyOn(notificationStore, 'startPolling')
      .mockImplementation(() => undefined)
    vi.spyOn(notificationStore, 'stopPolling').mockImplementation(() => undefined)

    const wrapper = mountHeader()

    wrapper.unmount()
    const finishUnreadRequest = resolveUnreadRequest as null | (() => void)
    if (typeof finishUnreadRequest === 'function') {
      finishUnreadRequest()
    }
    await flushPromises()

    expect(startPollingSpy).not.toHaveBeenCalled()
  })
})
