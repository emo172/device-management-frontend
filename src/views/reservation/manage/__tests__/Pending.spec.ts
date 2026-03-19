import { setActivePinia } from 'pinia'
import { defineComponent, h, provide, inject } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ReservationListItemResponse } from '@/api/reservations'
import { UserRole } from '@/enums'
import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'
import { useReservationStore } from '@/stores/modules/reservation'

const pushMock = vi.fn()
const promptMock = vi.fn()
const successMock = vi.fn()
const pendingViewModules = import.meta.glob('../*.vue')

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    useRouter: () => ({ push: pushMock }),
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

async function loadPendingView() {
  const loader = pendingViewModules['../Pending.vue']

  if (!loader) {
    return {
      module: null,
      error: new Error('Pending.vue is missing'),
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

const tableRowKey = Symbol('table-row-key')

const ElTableStub = defineComponent({
  name: 'ElTableStub',
  props: {
    data: {
      type: Array,
      default: () => [],
    },
  },
  setup(props, { slots }) {
    provide(tableRowKey, props)
    return () => h('div', slots.default?.())
  },
})

const ElTableColumnStub = defineComponent({
  name: 'ElTableColumnStub',
  setup(_, { slots }) {
    const tableProps = inject<{ data: ReservationListItemResponse[] }>(tableRowKey)
    return () => h('div', tableProps?.data?.[0] ? slots.default?.({ row: tableProps.data[0] }) : [])
  },
})

function createPendingRecord(status: string): ReservationListItemResponse {
  return {
    id: 'reservation-1',
    batchId: null,
    userId: 'user-1',
    userName: '普通用户',
    createdBy: 'user-1',
    createdByName: '普通用户',
    reservationMode: 'SELF',
    deviceId: 'device-1',
    deviceName: '示波器',
    deviceNumber: 'DEV-001',
    startTime: '2026-03-20T09:00:00',
    endTime: '2026-03-20T10:00:00',
    purpose: '实验',
    status,
    signStatus: status === 'PENDING_MANUAL' ? 'CHECKED_IN' : 'NOT_CHECKED_IN',
    approvalModeSnapshot: 'DEVICE_ONLY',
    cancelReason: null,
    cancelTime: null,
  }
}

describe('reservation pending manage view', () => {
  beforeEach(() => {
    pushMock.mockReset()
    promptMock.mockReset()
    successMock.mockReset()
    setActivePinia(createAppPinia())
  })

  it('loads device admin pending board and supports audit plus manual process actions', async () => {
    const { module, error } = await loadPendingView()

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
    reservationStore.list = [createPendingRecord('PENDING_DEVICE_APPROVAL')]
    reservationStore.total = 1

    const fetchManagedReservationPageSpy = vi
      .spyOn(
        reservationStore as typeof reservationStore & {
          fetchManagedReservationPage?: (payload: unknown) => Promise<unknown>
        },
        'fetchManagedReservationPage',
      )
      .mockResolvedValue({ total: 1, records: reservationStore.list })
    const deviceAuditReservationSpy = vi
      .spyOn(reservationStore, 'deviceAuditReservation')
      .mockResolvedValue({
        id: 'reservation-1',
        batchId: null,
        userId: 'user-1',
        createdBy: 'user-1',
        reservationMode: 'SELF',
        deviceId: 'device-1',
        status: 'APPROVED',
        signStatus: 'NOT_CHECKED_IN',
        approvalModeSnapshot: 'DEVICE_ONLY',
        deviceApproverId: 'device-admin-1',
        systemApproverId: null,
      })
    const manualProcessReservationSpy = vi
      .spyOn(reservationStore, 'manualProcessReservation')
      .mockResolvedValue({
        id: 'reservation-2',
        batchId: null,
        userId: 'user-2',
        createdBy: 'user-2',
        reservationMode: 'SELF',
        deviceId: 'device-2',
        status: 'APPROVED',
        signStatus: 'CHECKED_IN',
        approvalModeSnapshot: 'DEVICE_ONLY',
        deviceApproverId: 'device-admin-1',
        systemApproverId: null,
      })

    promptMock.mockResolvedValue({ value: '设备条件满足' })

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          EmptyState: { template: '<div><slot /></div>' },
          Pagination: { template: '<div class="pagination-stub"></div>' },
          ReservationStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          ManualProcessDialog: {
            props: ['modelValue'],
            emits: ['update:modelValue', 'submit'],
            template:
              '<div v-if="modelValue"><button class="manual-submit" @click="$emit(\'submit\', { approved: true, remark: \'已确认借用\' })">manual</button></div>',
          },
          ElButton: {
            props: ['type'],
            emits: ['click'],
            template: '<button :data-type="type" @click="$emit(\'click\')"><slot /></button>',
          },
          ElTag: { template: '<span><slot /></span>' },
          ElCard: { template: '<section><slot name="header" /><slot /></section>' },
          ElTable: ElTableStub,
          ElTableColumn: ElTableColumnStub,
        },
        directives: {
          loading: { mounted() {}, updated() {} },
        },
      },
    })

    await flushPromises()
    expect(fetchManagedReservationPageSpy).toHaveBeenCalledWith({
      role: UserRole.DEVICE_ADMIN,
      view: 'pending',
      page: 1,
      size: 10,
    })
    expect(wrapper.find('.console-table-section').exists()).toBe(true)

    await wrapper.get('[data-type="success"]').trigger('click')
    expect(deviceAuditReservationSpy).toHaveBeenCalledWith('reservation-1', {
      approved: true,
      remark: '设备条件满足',
    })
    expect(successMock).toHaveBeenCalledWith('审批操作已完成')

    reservationStore.list = [createPendingRecord('PENDING_MANUAL')]
    await wrapper.vm.$forceUpdate?.()
    await flushPromises()

    const buttons = wrapper.findAll('button')
    const manualButton = buttons.find((button) => button.text().includes('人工处理'))
    expect(manualButton).toBeTruthy()

    if (!manualButton) {
      return
    }

    await manualButton.trigger('click')
    await wrapper.get('.manual-submit').trigger('click')

    expect(manualProcessReservationSpy).toHaveBeenCalledWith('reservation-1', {
      approved: true,
      remark: '已确认借用',
    })
  })

  it('系统管理员即使拿到待人工处理记录也不显示人工处理入口', async () => {
    const { module, error } = await loadPendingView()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'system-admin@example.com',
      phone: '13800138000',
      realName: '系统管理员',
      role: UserRole.SYSTEM_ADMIN,
      userId: 'system-admin-1',
      username: 'system-admin',
    })

    const reservationStore = useReservationStore()
    reservationStore.list = [createPendingRecord('PENDING_MANUAL')]
    reservationStore.total = 1

    vi.spyOn(
      reservationStore as typeof reservationStore & {
        fetchManagedReservationPage?: (payload: unknown) => Promise<unknown>
      },
      'fetchManagedReservationPage',
    ).mockResolvedValue({ total: 1, records: reservationStore.list })
    const manualProcessReservationSpy = vi
      .spyOn(reservationStore, 'manualProcessReservation')
      .mockResolvedValue({
        id: 'reservation-1',
        batchId: null,
        userId: 'user-1',
        createdBy: 'user-1',
        reservationMode: 'SELF',
        deviceId: 'device-1',
        status: 'APPROVED',
        signStatus: 'CHECKED_IN',
        approvalModeSnapshot: 'DEVICE_ONLY',
        deviceApproverId: 'device-admin-1',
        systemApproverId: 'system-admin-1',
      })

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          EmptyState: { template: '<div><slot /></div>' },
          Pagination: { template: '<div class="pagination-stub"></div>' },
          ReservationStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          ManualProcessDialog: {
            props: ['modelValue'],
            emits: ['update:modelValue', 'submit'],
            template:
              '<div v-if="modelValue"><button class="manual-submit" @click="$emit(\'submit\', { approved: true, remark: \'已确认借用\' })">manual</button></div>',
          },
          ElButton: {
            props: ['type'],
            emits: ['click'],
            template: '<button :data-type="type" @click="$emit(\'click\')"><slot /></button>',
          },
          ElTag: { template: '<span><slot /></span>' },
          ElCard: { template: '<section><slot name="header" /><slot /></section>' },
          ElTable: ElTableStub,
          ElTableColumn: ElTableColumnStub,
        },
        directives: {
          loading: { mounted() {}, updated() {} },
        },
      },
    })

    await flushPromises()
    expect(wrapper.text()).not.toContain('人工处理')
    expect(wrapper.find('.manual-submit').exists()).toBe(false)
    expect(manualProcessReservationSpy).not.toHaveBeenCalled()
  })
})
