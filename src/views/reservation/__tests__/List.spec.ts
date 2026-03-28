import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ReservationDetailResponse, ReservationListItemResponse } from '@/api/reservations'
import { UserRole } from '@/enums'
import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'
import { useReservationStore } from '@/stores/modules/reservation'

const pushMock = vi.fn()
const promptMock = vi.fn()
const successMock = vi.fn()
const reservationViewModules = import.meta.glob('../*.vue')

function readReservationViewSource(fileName: string) {
  return readFileSync(resolve(process.cwd(), `src/views/reservation/${fileName}`), 'utf-8')
}

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    useRouter: () => ({ push: pushMock }),
    useRoute: () => ({ path: '/reservations' }),
  }
})

vi.mock('element-plus', async (importOriginal) => {
  const actual = await importOriginal<typeof import('element-plus')>()

  return {
    ...actual,
    ElMessage: {
      success: successMock,
    },
    ElMessageBox: {
      prompt: promptMock,
    },
  }
})

async function loadListView() {
  const loader = reservationViewModules['../List.vue']

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

const reservationRecord: ReservationListItemResponse = {
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
  startTime: '2026-03-18T09:00:00',
  endTime: '2026-03-18T10:00:00',
  purpose: '课程实验',
  status: 'APPROVED',
  signStatus: 'NOT_CHECKED_IN',
  approvalModeSnapshot: 'DEVICE_ONLY',
  cancelReason: null,
  cancelTime: null,
}

function createReservationDetailResponse(
  overrides?: Partial<ReservationDetailResponse>,
): ReservationDetailResponse {
  return {
    ...reservationRecord,
    deviceStatus: 'AVAILABLE',
    remark: null,
    deviceApproverId: null,
    deviceApproverName: null,
    deviceApprovedAt: null,
    deviceApprovalRemark: null,
    systemApproverId: null,
    systemApproverName: null,
    systemApprovedAt: null,
    systemApprovalRemark: null,
    checkedInAt: null,
    createdAt: '2026-03-16T08:00:00',
    updatedAt: '2026-03-16T08:00:00',
    ...overrides,
  }
}

describe('reservation list view', () => {
  beforeEach(() => {
    pushMock.mockReset()
    promptMock.mockReset()
    successMock.mockReset()
    setActivePinia(createAppPinia())
  })

  it('普通用户进入页面会拉取列表，并支持详情跳转与取消动作', async () => {
    const { module, error } = await loadListView()

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
    reservationStore.list = [reservationRecord]
    reservationStore.total = 1

    const fetchReservationListSpy = vi
      .spyOn(reservationStore, 'fetchReservationList')
      .mockImplementation(async () => {
        reservationStore.list = [reservationRecord]
        reservationStore.total = 1
        return { total: 1, records: [reservationRecord] }
      })
    const cancelReservationSpy = vi.spyOn(reservationStore, 'cancelReservation').mockResolvedValue(
      createReservationDetailResponse({
        status: 'CANCELLED',
        cancelReason: '课程调整',
        cancelTime: '2026-03-16T08:00:00',
      }),
    )

    promptMock.mockResolvedValue({ value: '课程调整' })

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          EmptyState: { template: '<div><slot /></div>' },
          Pagination: { template: '<div class="pagination-stub"></div>' },
          ReservationCard: {
            props: ['reservation', 'allowUserActions'],
            emits: ['detail', 'cancel', 'check-in'],
            template:
              '<article>{{ allowUserActions ? "user" : "admin" }}<button class="detail-btn" @click="$emit(\'detail\', reservation.id)">detail</button><button class="cancel-btn" @click="$emit(\'cancel\', reservation.id)">cancel</button></article>',
          },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElIcon: { template: '<i><slot /></i>' },
          ElTable: { template: '<div><slot /></div>' },
          ElTableColumn: { template: '<div><slot :row="{}" /></div>' },
        },
        directives: {
          loading: {
            mounted() {},
            updated() {},
          },
        },
      },
    })

    expect(fetchReservationListSpy).toHaveBeenCalledWith({ page: 1, size: 10 })
    expect(wrapper.find('.console-page-hero').exists()).toBe(true)
    expect(wrapper.find('.console-toolbar-shell').exists()).toBe(true)
    expect(wrapper.find('.console-table-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('我的预约')
    expect(wrapper.text()).toContain('user')
    expect(wrapper.text()).toContain('创建预约')

    await wrapper.get('.detail-btn').trigger('click')
    expect(pushMock).toHaveBeenCalledWith('/reservations/reservation-1')

    await wrapper.get('.cancel-btn').trigger('click')
    expect(cancelReservationSpy).toHaveBeenCalledWith('reservation-1', { reason: '课程调整' })
    expect(successMock).toHaveBeenCalledWith('预约已取消')
  })

  it('用户关闭取消输入框时不会把正常放弃操作抛成异常', async () => {
    const { module, error } = await loadListView()

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
    reservationStore.list = [reservationRecord]
    reservationStore.total = 1

    vi.spyOn(reservationStore, 'fetchReservationList').mockResolvedValue({
      total: 1,
      records: [reservationRecord],
    })
    const cancelReservationSpy = vi.spyOn(reservationStore, 'cancelReservation').mockResolvedValue(
      createReservationDetailResponse({
        status: 'CANCELLED',
        cancelReason: '课程调整',
        cancelTime: '2026-03-16T08:00:00',
      }),
    )

    promptMock.mockRejectedValue('cancel')

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          EmptyState: { template: '<div><slot /></div>' },
          Pagination: { template: '<div class="pagination-stub"></div>' },
          ReservationCard: {
            props: ['reservation', 'allowUserActions'],
            emits: ['detail', 'cancel', 'check-in'],
            template:
              '<article><button class="cancel-btn" @click="$emit(\'cancel\', reservation.id)">cancel</button></article>',
          },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElIcon: { template: '<i><slot /></i>' },
          ElTable: { template: '<div><slot /></div>' },
          ElTableColumn: { template: '<div><slot :row="{}" /></div>' },
        },
        directives: {
          loading: {
            mounted() {},
            updated() {},
          },
        },
      },
    })

    await expect(wrapper.get('.cancel-btn').trigger('click')).resolves.toBeUndefined()
    expect(cancelReservationSpy).not.toHaveBeenCalled()
    expect(successMock).not.toHaveBeenCalled()
  })

  it('管理员进入页面显示全部预约，并以只读模式渲染卡片动作区', async () => {
    const { module, error } = await loadListView()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'sysadmin@example.com',
      phone: '13800138000',
      realName: '系统管理员',
      role: UserRole.SYSTEM_ADMIN,
      userId: 'system-admin-1',
      username: 'sysadmin',
    })

    const reservationStore = useReservationStore()
    reservationStore.list = [reservationRecord]
    reservationStore.total = 1

    vi.spyOn(reservationStore, 'fetchReservationList').mockResolvedValue({
      total: 1,
      records: [reservationRecord],
    })

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          EmptyState: { template: '<div><slot /></div>' },
          Pagination: { template: '<div class="pagination-stub"></div>' },
          ReservationCard: {
            props: ['reservation', 'allowUserActions'],
            template: '<article>{{ allowUserActions ? "user" : "admin" }}</article>',
          },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElIcon: { template: '<i><slot /></i>' },
          ElTable: { template: '<div><slot /></div>' },
          ElTableColumn: { template: '<div><slot :row="{}" /></div>' },
        },
        directives: {
          loading: {
            mounted() {},
            updated() {},
          },
        },
      },
    })

    expect(wrapper.find('.console-page-hero').exists()).toBe(true)
    expect(wrapper.find('.console-toolbar-shell').exists()).toBe(true)
    expect(wrapper.find('.console-table-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('全部预约')
    expect(wrapper.text()).toContain('admin')
    expect(wrapper.text()).toContain('创建预约')
  })

  it('设备管理员不展示创建预约入口', async () => {
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

    const reservationStore = useReservationStore()
    reservationStore.list = [reservationRecord]
    reservationStore.total = 1

    vi.spyOn(reservationStore, 'fetchReservationList').mockResolvedValue({
      total: 1,
      records: [reservationRecord],
    })

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          EmptyState: { template: '<div><slot /></div>' },
          Pagination: { template: '<div class="pagination-stub"></div>' },
          ReservationCard: {
            props: ['reservation', 'allowUserActions'],
            template: '<article>{{ allowUserActions ? "user" : "admin" }}</article>',
          },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElIcon: { template: '<i><slot /></i>' },
          ElTable: { template: '<div><slot /></div>' },
          ElTableColumn: { template: '<div><slot :row="{}" /></div>' },
        },
        directives: {
          loading: {
            mounted() {},
            updated() {},
          },
        },
      },
    })

    expect(wrapper.find('.console-page-hero').exists()).toBe(true)
    expect(wrapper.find('.console-toolbar-shell').exists()).toBe(true)
    expect(wrapper.find('.console-table-section').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('创建预约')
  })

  it('进入预约列表页时先清空共享列表上下文，避免上一页面数据短暂闪出', async () => {
    const { module, error } = await loadListView()

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
    const resetListStateSpy = vi.spyOn(reservationStore, 'resetListState')
    vi.spyOn(reservationStore, 'fetchReservationList').mockResolvedValue({ total: 0, records: [] })

    mount(module.default, {
      global: {
        stubs: {
          EmptyState: { template: '<div><slot /></div>' },
          Pagination: { template: '<div class="pagination-stub"></div>' },
          ReservationCard: { template: '<article></article>' },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElIcon: { template: '<i><slot /></i>' },
          ElTable: { template: '<div><slot /></div>' },
          ElTableColumn: { template: '<div><slot :row="{}" /></div>' },
        },
        directives: {
          loading: { mounted() {}, updated() {} },
        },
      },
    })

    expect(resetListStateSpy).toHaveBeenCalledTimes(1)
  })

  it('列表页源码改为消费主题 token，避免表格壳层与操作提示在深色下残留浅色渐变和固定色值', () => {
    const source = readReservationViewSource('List.vue')

    // 预约列表是高频浏览入口，必须直接锁定表格壳层、链接与状态提示 token，避免深色主题回退成浅色孤岛。
    expect(source).toContain('var(--app-surface-card-strong)')
    expect(source).toContain('var(--app-tone-brand-surface)')
    expect(source).toContain('var(--app-tone-warning-text)')
    expect(source).toContain('var(--app-tone-brand-text)')
    expect(source).toContain('var(--app-shadow-card)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(source).not.toMatch(hardcodedColorPattern)
  })
})
