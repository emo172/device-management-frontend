import { setActivePinia } from 'pinia'
import { defineComponent, h, inject, provide } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserRole } from '@/enums'
import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'
import { useReservationStore } from '@/stores/modules/reservation'

const historyViewModules = import.meta.glob('../*.vue')
const pushMock = vi.fn()

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    useRouter: () => ({ push: pushMock }),
  }
})

async function loadHistoryView() {
  const loader = historyViewModules['../History.vue']

  if (!loader) {
    return {
      module: null,
      error: new Error('History.vue is missing'),
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

const tableRowKey = Symbol('history-table-row-key')

const ElTableStub = defineComponent({
  name: 'HistoryElTableStub',
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
  name: 'HistoryElTableColumnStub',
  setup(_, { slots }) {
    const tableProps = inject<{ data: Array<Record<string, unknown>> }>(tableRowKey)
    return () => h('div', tableProps?.data?.[0] ? slots.default?.({ row: tableProps.data[0] }) : [])
  },
})

describe('reservation history manage view', () => {
  beforeEach(() => {
    pushMock.mockReset()
    setActivePinia(createAppPinia())
  })

  it('loads system admin history board from local grouped reservation data', async () => {
    const { module, error } = await loadHistoryView()

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
    reservationStore.list = [
      {
        id: 'reservation-2',
        batchId: null,
        userId: 'user-2',
        userName: '普通用户2',
        createdBy: 'user-2',
        createdByName: '普通用户2',
        reservationMode: 'SELF',
        deviceId: 'device-2',
        deviceName: '频谱仪',
        deviceNumber: 'DEV-002',
        startTime: '2026-03-20T10:00:00',
        endTime: '2026-03-20T11:00:00',
        purpose: '实验',
        status: 'APPROVED',
        signStatus: 'NOT_CHECKED_IN',
        approvalModeSnapshot: 'DEVICE_THEN_SYSTEM',
        cancelReason: null,
        cancelTime: null,
      },
    ]
    reservationStore.total = 1

    const fetchManagedReservationPageSpy = vi
      .spyOn(
        reservationStore as typeof reservationStore & {
          fetchManagedReservationPage?: (payload: unknown) => Promise<unknown>
        },
        'fetchManagedReservationPage',
      )
      .mockResolvedValue({ total: 1, records: reservationStore.list })

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          EmptyState: { template: '<div><slot /></div>' },
          Pagination: { template: '<div class="pagination-stub"></div>' },
          ReservationStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElIcon: { template: '<i><slot /></i>' },
          ElTag: { template: '<span><slot /></span>' },
          ElTable: ElTableStub,
          ElTableColumn: ElTableColumnStub,
        },
        directives: {
          loading: { mounted() {}, updated() {} },
        },
      },
    })

    expect(fetchManagedReservationPageSpy).toHaveBeenCalledWith({
      role: UserRole.SYSTEM_ADMIN,
      view: 'history',
      page: 1,
      size: 10,
    })
    expect(wrapper.find('.console-table-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('审批历史')
    expect(wrapper.text()).toContain('APPROVED')
  })

  it('分页切换时重新请求历史页数据', async () => {
    const { module, error } = await loadHistoryView()

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
    reservationStore.list = [
      {
        id: 'reservation-2',
        batchId: null,
        userId: 'user-2',
        userName: '普通用户2',
        createdBy: 'user-2',
        createdByName: '普通用户2',
        reservationMode: 'SELF',
        deviceId: 'device-2',
        deviceName: '频谱仪',
        deviceNumber: 'DEV-002',
        startTime: '2026-03-20T10:00:00',
        endTime: '2026-03-20T11:00:00',
        purpose: '实验',
        status: 'APPROVED',
        signStatus: 'NOT_CHECKED_IN',
        approvalModeSnapshot: 'DEVICE_THEN_SYSTEM',
        cancelReason: null,
        cancelTime: null,
      },
    ]
    reservationStore.total = 11

    const fetchManagedReservationPageSpy = vi
      .spyOn(
        reservationStore as typeof reservationStore & {
          fetchManagedReservationPage?: (payload: unknown) => Promise<unknown>
        },
        'fetchManagedReservationPage',
      )
      .mockResolvedValue({ total: 11, records: reservationStore.list })

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          EmptyState: { template: '<div><slot /></div>' },
          Pagination: {
            emits: ['change'],
            template:
              '<button class="history-page-change" @click="$emit(\'change\', { currentPage: 2, pageSize: 10 })"></button>',
          },
          ReservationStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElIcon: { template: '<i><slot /></i>' },
          ElTag: { template: '<span><slot /></span>' },
          ElTable: ElTableStub,
          ElTableColumn: ElTableColumnStub,
        },
        directives: {
          loading: { mounted() {}, updated() {} },
        },
      },
    })

    await wrapper.get('.history-page-change').trigger('click')

    expect(fetchManagedReservationPageSpy).toHaveBeenLastCalledWith({
      role: UserRole.SYSTEM_ADMIN,
      view: 'history',
      page: 2,
      size: 10,
    })
  })
})
