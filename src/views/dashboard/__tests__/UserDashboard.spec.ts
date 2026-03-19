import { defineComponent, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserRole } from '@/enums/UserRole'

const authState = reactive({
  currentUser: {
    userId: 'user-1',
    username: 'demo-user',
    email: 'user@example.com',
    realName: '演示用户',
    phone: '13800138000',
    role: UserRole.USER,
  },
})

const reservationState = reactive({
  list: [] as Array<Record<string, unknown>>,
  total: 0,
  loading: false,
})

const fetchReservationListMock = vi.fn()

vi.mock('@/stores/modules/auth', () => ({
  useAuthStore: () => authState,
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

describe('UserDashboard', () => {
  beforeEach(() => {
    fetchReservationListMock.mockReset()
    reservationState.loading = false
    reservationState.total = 6
    reservationState.list = [
      {
        id: 'reservation-1',
        deviceName: '示波器',
        startTime: '2026-03-16T09:20:00',
        endTime: '2026-03-16T10:00:00',
        status: 'APPROVED',
        signStatus: 'NOT_CHECKED_IN',
      },
      {
        id: 'reservation-2',
        deviceName: '热像仪',
        startTime: '2026-03-17T14:00:00',
        endTime: '2026-03-17T15:00:00',
        status: 'PENDING_DEVICE_APPROVAL',
        signStatus: 'NOT_CHECKED_IN',
      },
      {
        id: 'reservation-3',
        deviceName: '单片机开发板',
        startTime: '2026-03-18T09:00:00',
        endTime: '2026-03-18T10:00:00',
        status: 'APPROVED',
        signStatus: 'CHECKED_IN',
      },
      {
        id: 'reservation-4',
        deviceName: '焊台',
        startTime: '2026-03-19T09:00:00',
        endTime: '2026-03-19T10:00:00',
        status: 'APPROVED',
        signStatus: 'CHECKED_IN_TIMEOUT',
      },
      {
        id: 'reservation-5',
        deviceName: '相机',
        startTime: '2026-03-20T09:00:00',
        endTime: '2026-03-20T10:00:00',
        status: 'CANCELLED',
        signStatus: 'NOT_CHECKED_IN',
      },
      {
        id: 'reservation-6',
        deviceName: '3D 打印机',
        startTime: '2026-03-21T09:00:00',
        endTime: '2026-03-21T10:00:00',
        status: 'APPROVED',
        signStatus: 'NOT_CHECKED_IN',
      },
    ]
  })

  it('加载最近预约并展示待签到提醒与 AI 快捷入口', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-16T09:00:00'))

    const UserDashboard = (await import('@/views/dashboard/UserDashboard.vue')).default
    const wrapper = mount(UserDashboard, {
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

    expect(fetchReservationListMock).toHaveBeenCalledWith({ page: 1, size: 5 })
    expect(wrapper.find('.console-page-hero').exists()).toBe(true)
    expect(wrapper.find('.console-summary-grid').exists()).toBe(true)
    expect(wrapper.text()).toContain('演示用户')
    expect(wrapper.text()).toContain('待签到提醒')
    expect(wrapper.text()).toContain('AI 对话')
    expect(wrapper.text()).toContain('示波器')
    expect(wrapper.text()).toContain('待签到')
    expect(wrapper.text()).toContain('签到超时')
    expect(wrapper.text()).not.toContain('3D 打印机')

    vi.useRealTimers()
  })

  it('兼容旧签到状态别名，避免待签到提醒漏算', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-16T09:00:00'))

    reservationState.list = [
      {
        id: 'reservation-legacy',
        deviceName: '热像仪',
        startTime: '2026-03-16T09:20:00',
        endTime: '2026-03-16T10:00:00',
        status: 'APPROVED',
        signStatus: 'NOT_SIGNED',
      },
    ]

    const UserDashboard = (await import('@/views/dashboard/UserDashboard.vue')).default
    const wrapper = mount(UserDashboard, {
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

    expect(wrapper.text()).toContain('热像仪')
    expect(wrapper.text()).toContain('待签到')

    vi.useRealTimers()
  })
})
