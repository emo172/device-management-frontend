import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { defineComponent, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserRole } from '@/enums/UserRole'

const authState = reactive({
  userRole: UserRole.DEVICE_ADMIN,
  currentUser: {
    userId: 'device-admin-1',
    username: 'device-admin',
    email: 'device-admin@example.com',
    realName: '设备管理员',
    phone: '13800138000',
    role: UserRole.DEVICE_ADMIN,
  },
})

const statisticsState = reactive({
  overview: null as Record<string, unknown> | null,
  loading: false,
})
const reservationState = reactive({
  list: [] as Array<Record<string, unknown>>,
  total: 0,
  loading: false,
})
const deviceState = reactive({
  list: [] as Array<Record<string, unknown>>,
  total: 0,
  loading: false,
})
const borrowState = reactive({
  list: [] as Array<Record<string, unknown>>,
  total: 0,
  loading: false,
})
const overdueState = reactive({
  list: [] as Array<Record<string, unknown>>,
  total: 0,
  loading: false,
})

const fetchOverviewMock = vi.fn()
const fetchAllMock = vi.fn()
const fetchReservationListMock = vi.fn()
const fetchDeviceListMock = vi.fn()
const fetchBorrowListMock = vi.fn()
const fetchOverdueListMock = vi.fn()

vi.mock('@/stores/modules/auth', () => ({
  useAuthStore: () => authState,
}))

vi.mock('@/stores/modules/statistics', () => ({
  useStatisticsStore: () => ({
    get overview() {
      return statisticsState.overview
    },
    get loading() {
      return statisticsState.loading
    },
    fetchOverview: fetchOverviewMock,
    fetchAll: fetchAllMock,
  }),
}))

vi.mock('@/stores/modules/reservation', () => ({
  useReservationStore: () => ({
    get list() {
      return reservationState.list
    },
    get total() {
      return reservationState.total
    },
    get loading() {
      return reservationState.loading
    },
    fetchReservationList: fetchReservationListMock,
  }),
}))

vi.mock('@/stores/modules/device', () => ({
  useDeviceStore: () => ({
    get list() {
      return deviceState.list
    },
    get total() {
      return deviceState.total
    },
    fetchDeviceList: fetchDeviceListMock,
  }),
}))

vi.mock('@/stores/modules/borrow', () => ({
  useBorrowStore: () => ({
    get list() {
      return borrowState.list
    },
    get total() {
      return borrowState.total
    },
    fetchBorrowList: fetchBorrowListMock,
  }),
}))

vi.mock('@/stores/modules/overdue', () => ({
  useOverdueStore: () => ({
    get list() {
      return overdueState.list
    },
    get total() {
      return overdueState.total
    },
    fetchOverdueList: fetchOverdueListMock,
  }),
}))

describe('AdminDashboard', () => {
  const readDashboardSource = () => {
    return readFileSync(resolve(process.cwd(), 'src/views/dashboard/AdminDashboard.vue'), 'utf-8')
  }

  beforeEach(() => {
    authState.userRole = UserRole.DEVICE_ADMIN
    authState.currentUser = {
      userId: 'device-admin-1',
      username: 'device-admin',
      email: 'device-admin@example.com',
      realName: '设备管理员',
      phone: '13800138000',
      role: UserRole.DEVICE_ADMIN,
    }
    statisticsState.overview = null
    statisticsState.loading = false
    reservationState.list = [
      { id: 'reservation-1', status: 'PENDING_DEVICE_APPROVAL', signStatus: 'NOT_SIGNED' },
      { id: 'reservation-2', status: 'PENDING_MANUAL', signStatus: 'NOT_SIGNED' },
    ]
    reservationState.total = 2
    deviceState.list = [
      { id: 'device-1', status: 'AVAILABLE' },
      { id: 'device-2', status: 'BORROWED' },
    ]
    deviceState.total = 2
    borrowState.list = [{ id: 'borrow-1', status: 'BORROWED' }]
    borrowState.total = 1
    overdueState.list = [{ id: 'overdue-1', processingStatus: 'PENDING' }]
    overdueState.total = 1
    fetchOverviewMock.mockReset()
    fetchAllMock.mockReset()
    fetchReservationListMock.mockReset()
    fetchDeviceListMock.mockReset()
    fetchBorrowListMock.mockReset()
    fetchOverdueListMock.mockReset()
  })

  it('管理员仪表盘源码改为消费主题 token，避免概览卡与快捷入口在深色下残留浅色硬编码', () => {
    const source = readDashboardSource()

    // 管理员仪表盘承担概览卡、审批提醒和快捷入口，必须直接锁定 token，避免角色分支在深色下各自退回浅色表面。
    expect(source).toContain('var(--app-surface-card)')
    expect(source).toContain('var(--app-tone-warning-surface)')
    expect(source).toContain('var(--app-tone-brand-surface)')
    expect(source).toContain('var(--app-shadow-card)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(source).not.toMatch(hardcodedColorPattern)
  })

  it('设备管理员用真实列表接口拼管理概览且不调用统计接口', async () => {
    const AdminDashboard = (await import('@/views/dashboard/AdminDashboard.vue')).default
    const wrapper = mount(AdminDashboard, {
      global: {
        stubs: {
          RouterLink: defineComponent({
            props: { to: { type: [String, Object], default: '' } },
            template: '<a><slot /></a>',
          }),
        },
      },
    })

    await flushPromises()

    expect(fetchAllMock).not.toHaveBeenCalled()
    expect(fetchDeviceListMock).toHaveBeenCalledWith({ page: 1, size: 8 })
    expect(fetchReservationListMock).toHaveBeenCalledWith({ page: 1, size: 8 })
    expect(fetchBorrowListMock).toHaveBeenCalledWith({ page: 1, size: 8 })
    expect(fetchOverdueListMock).toHaveBeenCalledWith({ page: 1, size: 8 })
    expect(wrapper.find('.console-page-hero').exists()).toBe(true)
    expect(wrapper.find('.console-summary-grid').exists()).toBe(true)
    expect(wrapper.text()).toContain('待审核预约提醒')
    expect(wrapper.text()).toContain('预约审核')
    expect(wrapper.text()).toContain('借还管理')
  })

  it('系统管理员走统计接口分支且不走设备管理员拼装分支', async () => {
    authState.userRole = UserRole.SYSTEM_ADMIN
    authState.currentUser = {
      userId: 'system-admin-1',
      username: 'system-admin',
      email: 'system-admin@example.com',
      realName: '系统管理员',
      phone: '13800138000',
      role: UserRole.SYSTEM_ADMIN,
    }
    statisticsState.overview = {
      totalReservations: 18,
      approvedReservations: 12,
      rejectedReservations: 1,
      cancelledReservations: 2,
      expiredReservations: 3,
      totalBorrows: 9,
      totalReturns: 7,
      totalOverdue: 2,
      totalOverdueHours: 14,
      utilizationRate: 68,
      statDate: '2026-03-16',
    }

    const AdminDashboard = (await import('@/views/dashboard/AdminDashboard.vue')).default
    const wrapper = mount(AdminDashboard, {
      global: {
        stubs: {
          RouterLink: defineComponent({
            props: { to: { type: [String, Object], default: '' } },
            template: '<a><slot /></a>',
          }),
        },
      },
    })

    await flushPromises()

    expect(fetchOverviewMock).toHaveBeenCalledTimes(1)
    expect(fetchAllMock).not.toHaveBeenCalled()
    expect(fetchReservationListMock).toHaveBeenCalledWith({ page: 1, size: 8 })
    expect(fetchDeviceListMock).not.toHaveBeenCalled()
    expect(fetchBorrowListMock).not.toHaveBeenCalled()
    expect(fetchOverdueListMock).not.toHaveBeenCalled()
    expect(wrapper.find('.console-page-hero').exists()).toBe(true)
    expect(wrapper.find('.console-summary-grid').exists()).toBe(true)
    expect(wrapper.text()).toContain('今日预约')
    expect(wrapper.text()).toContain('今日借用')
    expect(wrapper.text()).toContain('今日逾期')
    expect(wrapper.text()).toContain('统计分析')
    expect(wrapper.text()).not.toContain('借还管理')
  })

  it('系统管理员在统计数据未回填时展示系统管理员首屏占位而不是设备管理员口径', async () => {
    authState.userRole = UserRole.SYSTEM_ADMIN
    authState.currentUser = {
      userId: 'system-admin-1',
      username: 'system-admin',
      email: 'system-admin@example.com',
      realName: '系统管理员',
      phone: '13800138000',
      role: UserRole.SYSTEM_ADMIN,
    }
    statisticsState.overview = null
    fetchOverviewMock.mockImplementation(() => {
      statisticsState.loading = true
      return new Promise(() => undefined)
    })

    const AdminDashboard = (await import('@/views/dashboard/AdminDashboard.vue')).default
    const wrapper = mount(AdminDashboard, {
      global: {
        stubs: {
          RouterLink: defineComponent({
            props: { to: { type: [String, Object], default: '' } },
            template: '<a><slot /></a>',
          }),
        },
      },
    })

    await Promise.resolve()

    expect(wrapper.text()).toContain('今日统计正在加载')
    expect(wrapper.text()).not.toContain('当前设备数')
    expect(wrapper.text()).not.toContain('当前页借用记录')
  })

  it('系统管理员统计接口失败时展示管理侧异常占位而不是退回设备管理员口径', async () => {
    authState.userRole = UserRole.SYSTEM_ADMIN
    authState.currentUser = {
      userId: 'system-admin-1',
      username: 'system-admin',
      email: 'system-admin@example.com',
      realName: '系统管理员',
      phone: '13800138000',
      role: UserRole.SYSTEM_ADMIN,
    }
    statisticsState.overview = null
    fetchOverviewMock.mockImplementation(async () => {
      statisticsState.loading = true
      await Promise.resolve()
      statisticsState.loading = false
      throw new Error('overview failed')
    })

    const AdminDashboard = (await import('@/views/dashboard/AdminDashboard.vue')).default
    const wrapper = mount(AdminDashboard, {
      global: {
        stubs: {
          RouterLink: defineComponent({
            props: { to: { type: [String, Object], default: '' } },
            template: '<a><slot /></a>',
          }),
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('今日统计暂不可用')
    expect(wrapper.text()).not.toContain('当前设备数')
    expect(wrapper.text()).not.toContain('当前页借用记录')
  })

  it('系统管理员存在旧概览缓存时，新请求失败后不继续展示旧统计口径', async () => {
    authState.userRole = UserRole.SYSTEM_ADMIN
    authState.currentUser = {
      userId: 'system-admin-1',
      username: 'system-admin',
      email: 'system-admin@example.com',
      realName: '系统管理员',
      phone: '13800138000',
      role: UserRole.SYSTEM_ADMIN,
    }
    statisticsState.overview = {
      totalReservations: 18,
      approvedReservations: 12,
      rejectedReservations: 1,
      cancelledReservations: 2,
      expiredReservations: 3,
      totalBorrows: 9,
      totalReturns: 7,
      totalOverdue: 2,
      totalOverdueHours: 14,
      utilizationRate: 68,
      statDate: '2026-03-16',
    }
    fetchOverviewMock.mockImplementation(async () => {
      statisticsState.loading = true
      statisticsState.overview = null
      await Promise.resolve()
      statisticsState.loading = false
      throw new Error('overview failed')
    })

    const AdminDashboard = (await import('@/views/dashboard/AdminDashboard.vue')).default
    const wrapper = mount(AdminDashboard, {
      global: {
        stubs: {
          RouterLink: defineComponent({
            props: { to: { type: [String, Object], default: '' } },
            template: '<a><slot /></a>',
          }),
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('今日统计暂不可用')
    expect(wrapper.text()).not.toContain('今日预约')
    expect(wrapper.text()).not.toContain('今日借用')
  })
})
