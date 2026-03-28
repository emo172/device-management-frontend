import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import type { ReservationDetailResponse, ReservationResponse } from '@/api/reservations'
import { UserRole } from '@/enums'
import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'
import { useReservationStore } from '@/stores/modules/reservation'

const reservationViewModules = import.meta.glob('../*.vue')
const successMock = vi.fn()
const { routeState } = vi.hoisted(() => ({
  routeState: {
    current: null as { params: { id: string } } | null,
  },
}))

function readReservationViewSource(fileName: string) {
  return readFileSync(resolve(process.cwd(), `src/views/reservation/${fileName}`), 'utf-8')
}

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  const { reactive } = await import('vue')

  if (!routeState.current) {
    routeState.current = reactive({ params: { id: 'reservation-1' } })
  }

  return {
    ...actual,
    useRoute: () => routeState.current,
    useRouter: () => ({ push: vi.fn() }),
  }
})

vi.mock('element-plus', async (importOriginal) => {
  const actual = await importOriginal<typeof import('element-plus')>()

  return {
    ...actual,
    ElMessage: {
      success: successMock,
    },
  }
})

async function loadCheckInView() {
  const loader = reservationViewModules['../CheckIn.vue']

  if (!loader) {
    return {
      module: null,
      error: new Error('CheckIn.vue is missing'),
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

function createReservationDetail(): ReservationDetailResponse {
  return {
    id: 'reservation-1',
    batchId: null,
    userId: 'user-1',
    userName: 'demo-user',
    createdBy: 'user-1',
    createdByName: 'demo-user',
    reservationMode: 'SELF',
    deviceId: 'device-1',
    deviceName: '示波器',
    deviceNumber: 'DEV-001',
    deviceStatus: 'AVAILABLE',
    startTime: '2026-03-18T09:00:00',
    endTime: '2026-03-18T10:00:00',
    purpose: '课程实验',
    remark: '请提前准备',
    status: 'APPROVED',
    signStatus: 'NOT_CHECKED_IN',
    approvalModeSnapshot: 'DEVICE_ONLY',
    deviceApproverId: 'device-admin-1',
    deviceApproverName: '设备管理员',
    deviceApprovedAt: '2026-03-18T08:20:00',
    deviceApprovalRemark: '设备通过',
    systemApproverId: null,
    systemApproverName: null,
    systemApprovedAt: null,
    systemApprovalRemark: null,
    cancelReason: null,
    cancelTime: null,
    checkedInAt: null,
    createdAt: '2026-03-18T08:00:00',
    updatedAt: '2026-03-18T08:20:00',
  }
}

function createReservationActionResponse(
  overrides?: Partial<ReservationResponse>,
): ReservationResponse {
  return {
    ...createReservationDetail(),
    ...overrides,
  }
}

describe('reservation check-in view', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-18T09:40:00'))
    successMock.mockReset()
    setActivePinia(createAppPinia())

    if (routeState.current) {
      routeState.current.params.id = 'reservation-1'
    }
  })

  it('本人预约在签到窗口内可一键签到，并反馈超时签到结果', async () => {
    const { module, error } = await loadCheckInView()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'user@example.com',
      phone: '13800138000',
      realName: '普通用户',
      role: UserRole.USER,
      userId: 'user-1',
      username: 'user',
    })

    const reservationStore = useReservationStore()
    const detail = createReservationDetail()
    reservationStore.currentReservation = detail
    vi.spyOn(reservationStore, 'fetchReservationDetail').mockResolvedValue(detail)
    const checkInReservationSpy = vi
      .spyOn(reservationStore, 'checkInReservation')
      .mockResolvedValue(
        createReservationActionResponse({
          signStatus: 'CHECKED_IN_TIMEOUT',
        }),
      )

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          ReservationStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          CheckInStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          EmptyState: { template: '<div><slot /></div>' },
          ElButton: {
            emits: ['click'],
            template: '<button class="check-in-btn" @click="$emit(\'click\')"><slot /></button>',
          },
          ElDescriptions: { template: '<div><slot /></div>' },
          ElDescriptionsItem: { template: '<div><slot /></div>' },
          ElCard: { template: '<section><slot name="header" /><slot /></section>' },
          ElAlert: { template: '<div><slot /></div>' },
        },
      },
    })

    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('一键签到')
    await wrapper.get('.check-in-btn').trigger('click')

    expect(checkInReservationSpy).toHaveBeenCalledWith('reservation-1', {
      checkInTime: '2026-03-18T09:40:00',
    })
    expect(successMock).toHaveBeenCalled()
    expect(wrapper.text()).toContain('超时签到')
    expect(wrapper.find('.check-in-btn').exists()).toBe(false)
  })

  it('非本人或超过签到时限时不展示签到按钮，并提示预约已过期', async () => {
    vi.setSystemTime(new Date('2026-03-18T10:01:00'))

    const { module, error } = await loadCheckInView()

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

    const reservationStore = useReservationStore()
    const detail = createReservationDetail()
    reservationStore.currentReservation = detail
    vi.spyOn(reservationStore, 'fetchReservationDetail').mockResolvedValue(detail)

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          ReservationStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          CheckInStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          EmptyState: { template: '<div><slot /></div>' },
          ElButton: {
            emits: ['click'],
            template: '<button class="check-in-btn" @click="$emit(\'click\')"><slot /></button>',
          },
          ElDescriptions: { template: '<div><slot /></div>' },
          ElDescriptionsItem: { template: '<div><slot /></div>' },
          ElCard: { template: '<section><slot name="header" /><slot /></section>' },
          ElAlert: { template: '<div><slot /></div>' },
        },
      },
    })

    expect(wrapper.find('.check-in-btn').exists()).toBe(false)
    expect(wrapper.text()).toContain('已过期')
  })

  it('只消费与当前路由匹配的预约详情，避免签到页误用旧详情上下文', async () => {
    const { module, error } = await loadCheckInView()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'user@example.com',
      phone: '13800138000',
      realName: '普通用户',
      role: UserRole.USER,
      userId: 'user-1',
      username: 'user',
    })

    const reservationStore = useReservationStore()
    reservationStore.currentReservation = {
      ...createReservationDetail(),
      id: 'reservation-2',
      deviceName: '旧签到详情',
    }

    const currentDetail = createReservationDetail()
    vi.spyOn(reservationStore, 'fetchReservationDetail').mockImplementation(async () => {
      reservationStore.currentReservation = currentDetail
      return currentDetail
    })

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          ReservationStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          CheckInStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          EmptyState: { template: '<div><slot /></div>' },
          ElButton: {
            emits: ['click'],
            template: '<button class="check-in-btn" @click="$emit(\'click\')"><slot /></button>',
          },
          ElDescriptions: { template: '<div><slot /></div>' },
          ElDescriptionsItem: { template: '<div><slot /></div>' },
          ElCard: { template: '<section><slot name="header" /><slot /></section>' },
          ElAlert: { template: '<div><slot /></div>' },
        },
      },
    })

    expect(wrapper.text()).not.toContain('旧签到详情')
    await flushPromises()
    expect(wrapper.text()).toContain('示波器')
  })

  it('同一组件实例内路由参数切换时会刷新并展示新预约签到信息', async () => {
    const { module, error } = await loadCheckInView()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'user@example.com',
      phone: '13800138000',
      realName: '普通用户',
      role: UserRole.USER,
      userId: 'user-1',
      username: 'user',
    })

    const reservationStore = useReservationStore()
    const detailA = createReservationDetail()
    const detailB = {
      ...createReservationDetail(),
      id: 'reservation-2',
      deviceId: 'device-2',
      deviceName: '频谱分析仪',
      deviceNumber: 'DEV-002',
    }
    const fetchReservationDetailSpy = vi
      .spyOn(reservationStore, 'fetchReservationDetail')
      .mockImplementation(async (reservationId: string) => {
        const detail = reservationId === 'reservation-2' ? detailB : detailA
        reservationStore.currentReservation = detail
        return detail
      })

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          ReservationStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          CheckInStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          EmptyState: { template: '<div><slot /></div>' },
          ElButton: {
            emits: ['click'],
            template: '<button class="check-in-btn" @click="$emit(\'click\')"><slot /></button>',
          },
          ElDescriptions: { template: '<div><slot /></div>' },
          ElDescriptionsItem: { template: '<div><slot /></div>' },
          ElCard: { template: '<section><slot name="header" /><slot /></section>' },
          ElAlert: { template: '<div><slot /></div>' },
        },
      },
    })

    await flushPromises()
    expect(wrapper.text()).toContain('示波器')

    routeState.current!.params.id = 'reservation-2'
    await nextTick()
    await flushPromises()

    expect(fetchReservationDetailSpy).toHaveBeenCalledWith('reservation-2')
    expect(wrapper.text()).toContain('频谱分析仪')
  })

  it('签到页源码改为消费主题 token，避免信息面板与签到反馈在深色下保留浅色底', () => {
    const source = readReservationViewSource('CheckIn.vue')

    // 签到页的结果提示决定用户是否还能操作，必须锁定信息卡和反馈面板 token，避免深色下提示区失去可读性。
    expect(source).toContain('var(--app-surface-card)')
    expect(source).toContain('var(--app-tone-info-surface)')
    expect(source).toContain('var(--app-border-soft)')
    expect(source).toContain('var(--app-shadow-card)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(source).not.toMatch(hardcodedColorPattern)
  })
})
