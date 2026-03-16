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
    fetchAllMock.mockReset()
    fetchReservationListMock.mockReset()
    fetchDeviceListMock.mockReset()
    fetchBorrowListMock.mockReset()
    fetchOverdueListMock.mockReset()
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

    expect(fetchAllMock).toHaveBeenCalledTimes(1)
    expect(fetchReservationListMock).toHaveBeenCalledWith({ page: 1, size: 8 })
    expect(fetchDeviceListMock).not.toHaveBeenCalled()
    expect(fetchBorrowListMock).not.toHaveBeenCalled()
    expect(fetchOverdueListMock).not.toHaveBeenCalled()
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

    expect(wrapper.text()).toContain('今日统计正在加载')
    expect(wrapper.text()).not.toContain('当前设备数')
    expect(wrapper.text()).not.toContain('当前页借用记录')
  })
})
