import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import type { ReservationDetailResponse } from '@/api/reservations'
import { UserRole } from '@/enums'
import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'
import { useReservationStore } from '@/stores/modules/reservation'

const reservationViewModules = import.meta.glob('../*.vue')
const pushMock = vi.fn()
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
    useRouter: () => ({ push: pushMock }),
    useRoute: () => routeState.current,
  }
})

async function loadDetailView() {
  const loader = reservationViewModules['../Detail.vue']

  if (!loader) {
    return {
      module: null,
      error: new Error('Detail.vue is missing'),
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
    approvalModeSnapshot: 'DEVICE_THEN_SYSTEM',
    deviceApproverId: 'device-admin-1',
    deviceApproverName: '设备管理员',
    deviceApprovedAt: '2026-03-18T08:20:00',
    deviceApprovalRemark: '设备通过',
    systemApproverId: 'system-admin-1',
    systemApproverName: '系统管理员',
    systemApprovedAt: '2026-03-18T08:40:00',
    systemApprovalRemark: '系统通过',
    cancelReason: null,
    cancelTime: null,
    checkedInAt: null,
    createdAt: '2026-03-18T08:00:00',
    updatedAt: '2026-03-18T08:40:00',
  }
}

describe('reservation detail view', () => {
  beforeEach(() => {
    pushMock.mockReset()
    setActivePinia(createAppPinia())

    if (routeState.current) {
      routeState.current.params.id = 'reservation-1'
    }
  })

  it('加载预约详情并展示审批模式、审批信息与状态时间线', async () => {
    const { module, error } = await loadDetailView()

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
    const fetchReservationDetailSpy = vi
      .spyOn(reservationStore, 'fetchReservationDetail')
      .mockResolvedValue(detail)

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          ReservationTimeline: {
            props: ['reservation'],
            template: '<div class="timeline-stub">{{ reservation.createdAt }}</div>',
          },
          ReservationStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          CheckInStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          EmptyState: { template: '<div><slot /></div>' },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElDescriptions: { template: '<div><slot /></div>' },
          ElDescriptionsItem: { template: '<div><slot /></div>' },
          ElCard: { template: '<section><slot name="header" /><slot /></section>' },
          ElTag: { template: '<span><slot /></span>' },
        },
      },
    })

    expect(fetchReservationDetailSpy).toHaveBeenCalledWith('reservation-1')
    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('预约详情')
    expect(wrapper.text()).toContain('设备后系统审批')
    expect(wrapper.text()).toContain('设备管理员')
    expect(wrapper.text()).toContain('系统管理员')
    expect(wrapper.find('.timeline-stub').exists()).toBe(true)
  })

  it('只消费与当前路由匹配的预约详情，避免上一条详情串单', async () => {
    const { module, error } = await loadDetailView()

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
      deviceName: '旧详情设备',
    }

    const currentDetail = createReservationDetail()
    vi.spyOn(reservationStore, 'fetchReservationDetail').mockImplementation(async () => {
      reservationStore.currentReservation = currentDetail
      return currentDetail
    })

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          ReservationTimeline: {
            props: ['reservation'],
            template: '<div class="timeline-stub">{{ reservation.createdAt }}</div>',
          },
          ReservationStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          CheckInStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          EmptyState: { template: '<div><slot /></div>' },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElDescriptions: { template: '<div><slot /></div>' },
          ElDescriptionsItem: { template: '<div><slot /></div>' },
          ElCard: { template: '<section><slot name="header" /><slot /></section>' },
          ElTag: { template: '<span><slot /></span>' },
        },
      },
    })

    expect(wrapper.text()).not.toContain('旧详情设备')
    await flushPromises()
    expect(wrapper.text()).toContain('示波器')
  })

  it('同一组件实例内路由参数切换时会重新拉取并展示新预约详情', async () => {
    const { module, error } = await loadDetailView()

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
          ReservationTimeline: {
            props: ['reservation'],
            template: '<div class="timeline-stub">{{ reservation.createdAt }}</div>',
          },
          ReservationStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          CheckInStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          EmptyState: { template: '<div><slot /></div>' },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElDescriptions: { template: '<div><slot /></div>' },
          ElDescriptionsItem: { template: '<div><slot /></div>' },
          ElCard: { template: '<section><slot name="header" /><slot /></section>' },
          ElTag: { template: '<span><slot /></span>' },
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

  it('详情页源码改为消费主题 token，避免详情卡与审批侧栏在深色下残留浅色玻璃效果', () => {
    const source = readReservationViewSource('Detail.vue')

    // 详情页需要并排展示主信息和审批信息，必须锁定卡片与侧栏 token，避免深色下出现灰白块打断审批阅读。
    expect(source).toContain('var(--app-surface-card)')
    expect(source).toContain('var(--app-tone-info-surface)')
    expect(source).toContain('var(--app-border-soft)')
    expect(source).toContain('var(--app-shadow-card)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(source).not.toMatch(hardcodedColorPattern)
  })
})
