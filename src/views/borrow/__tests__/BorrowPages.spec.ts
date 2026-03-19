import { setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BorrowStatus, BorrowStatusLabel, UserRole } from '@/enums'
import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'
import { useBorrowStore } from '@/stores/modules/borrow'
import { useReservationStore } from '@/stores/modules/reservation'

const pushMock = vi.fn()
const messageSuccessMock = vi.fn()
const routeState = {
  path: '/borrows',
  params: {} as Record<string, string>,
  query: {} as Record<string, string>,
}

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    useRoute: () => routeState,
    useRouter: () => ({ push: pushMock }),
  }
})

vi.mock('element-plus', async (importOriginal) => {
  const actual = await importOriginal<typeof import('element-plus')>()

  return {
    ...actual,
    ElMessage: {
      success: messageSuccessMock,
    },
  }
})

const borrowViewModules = import.meta.glob('../*.vue')

async function loadBorrowView(componentName: string) {
  const loader = borrowViewModules[`../${componentName}.vue`]

  if (!loader) {
    return {
      module: null,
      error: new Error(`${componentName}.vue is missing`),
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

const reservationCandidate = {
  id: 'reservation-1',
  batchId: null,
  userId: 'user-1',
  userName: '张三',
  createdBy: 'user-1',
  createdByName: '张三',
  reservationMode: 'SELF',
  deviceId: 'device-1',
  deviceName: '热成像仪',
  deviceNumber: 'DEV-001',
  startTime: '2024-01-02T09:00:00',
  endTime: '2024-01-02T10:00:00',
  purpose: '设备调试',
  status: 'APPROVED',
  signStatus: 'CHECKED_IN',
  approvalModeSnapshot: 'DEVICE_ONLY',
  cancelReason: null,
  cancelTime: null,
} as const

const reservationNonCandidate = {
  ...reservationCandidate,
  id: 'reservation-2',
  deviceName: '不应出现在候选中的设备',
  signStatus: 'NOT_CHECKED_IN',
} as const

const borrowedRecord = {
  id: 'borrow-1',
  reservationId: 'reservation-1',
  deviceId: 'device-1',
  userId: 'user-1',
  borrowTime: '2024-01-02T09:05:00',
  returnTime: null,
  expectedReturnTime: '2024-01-02T10:00:00',
  status: BorrowStatus.BORROWED,
  borrowCheckStatus: 'NORMAL',
  returnCheckStatus: null,
  remark: null,
  operatorId: 'device-admin-1',
  returnOperatorId: null,
} as const

const returnedRecord = {
  ...borrowedRecord,
  id: 'borrow-2',
  status: BorrowStatus.RETURNED,
  returnTime: '2024-01-02T10:05:00',
} as const

const commonGlobal = {
  stubs: {
    BorrowStatusTag: {
      props: ['status'],
      setup() {
        return { BorrowStatusLabel }
      },
      template: '<span class="borrow-status-stub">{{ BorrowStatusLabel[status] ?? status }}</span>',
    },
    EmptyState: {
      template: '<div class="empty-state-stub"><slot /></div>',
    },
    Pagination: {
      template: '<div class="pagination-stub"></div>',
    },
    ElButton: {
      props: ['type', 'loading', 'disabled'],
      emits: ['click'],
      template:
        '<button :disabled="disabled" :data-type="type" :data-loading="loading" @click="$emit(\'click\')"><slot /></button>',
    },
    ElIcon: {
      template: '<i><slot /></i>',
    },
    ElTable: {
      template: '<div><slot /></div>',
    },
    ElTableColumn: {
      template: '<div><slot :row="{}" /></div>',
    },
    ElInput: {
      props: ['modelValue', 'type'],
      emits: ['update:modelValue'],
      template:
        '<textarea v-if="type === \"textarea\"" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /><input v-else :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    },
    ElScrollbar: {
      template: '<div><slot /></div>',
    },
    RouterLink: {
      props: ['to'],
      template: '<a :href="typeof to === \"string\" ? to : to.path"><slot /></a>',
    },
  },
  directives: {
    loading: {
      mounted() {},
      updated() {},
    },
  },
}

describe('borrow pages', () => {
  beforeEach(() => {
    pushMock.mockReset()
    messageSuccessMock.mockReset()
    routeState.path = '/borrows'
    routeState.params = {}
    routeState.query = {}
    setActivePinia(createAppPinia())
  })

  it('借还列表页会拉取默认分页，并为设备管理员展示确认入口', async () => {
    const { module, error } = await loadBorrowView('List')

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

    const borrowStore = useBorrowStore()
    borrowStore.list = [borrowedRecord]
    borrowStore.total = 1

    const fetchBorrowListSpy = vi
      .spyOn(borrowStore, 'fetchBorrowList')
      .mockResolvedValue({ total: 1, records: [borrowedRecord] })

    const wrapper = mount(module.default, { global: commonGlobal })

    expect(fetchBorrowListSpy).toHaveBeenCalledWith({ page: 1, size: 10, status: undefined })
    expect(wrapper.find('.console-page-hero').exists()).toBe(true)
    expect(wrapper.find('.console-summary-grid').exists()).toBe(true)
    expect(wrapper.find('.console-toolbar-shell').exists()).toBe(true)
    expect(wrapper.find('.console-table-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('借用确认')
    expect(wrapper.text()).toContain('归还确认')
  })

  it('普通用户访问借还列表页时不展示管理员确认入口', async () => {
    const { module, error } = await loadBorrowView('List')

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

    const borrowStore = useBorrowStore()
    vi.spyOn(borrowStore, 'fetchBorrowList').mockResolvedValue({
      total: 1,
      records: [borrowedRecord],
    })

    const wrapper = mount(module.default, { global: commonGlobal })

    expect(wrapper.find('.borrow-list-view__hero-actions').exists()).toBe(false)
  })

  it('借用确认页仅展示已批准且已签到的候选预约，并可直接确认借出', async () => {
    const { module, error } = await loadBorrowView('Confirm')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    routeState.path = '/borrows/confirm'
    routeState.query = { reservationId: reservationCandidate.id }

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
    reservationStore.list = [reservationCandidate, reservationNonCandidate]
    const fetchReservationListSpy = vi
      .spyOn(reservationStore, 'fetchReservationList')
      .mockResolvedValue({ total: 2, records: [reservationCandidate, reservationNonCandidate] })

    const borrowStore = useBorrowStore()
    const confirmBorrowSpy = vi
      .spyOn(borrowStore, 'confirmBorrow')
      .mockResolvedValue(borrowedRecord)

    const wrapper = mount(module.default, { global: commonGlobal })

    expect(fetchReservationListSpy).toHaveBeenCalledWith({ page: 1, size: 10 })
    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('热成像仪')
    expect(wrapper.text()).not.toContain('不应出现在候选中的设备')

    await wrapper.get('.borrow-confirm-view__submit').trigger('click')

    expect(confirmBorrowSpy).toHaveBeenCalledWith(reservationCandidate.id, undefined)
  })

  it('借用确认页切换分页时会重新拉取新的预约候选页', async () => {
    const { module, error } = await loadBorrowView('Confirm')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    routeState.path = '/borrows/confirm'

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
    reservationStore.list = [reservationCandidate]
    const fetchReservationListSpy = vi
      .spyOn(reservationStore, 'fetchReservationList')
      .mockResolvedValue({ total: 20, records: [reservationCandidate] })

    const wrapper = mount(module.default, {
      global: {
        ...commonGlobal,
        stubs: {
          ...commonGlobal.stubs,
          Pagination: {
            emits: ['change'],
            template:
              '<button class="pagination-next" @click="$emit(\'change\', { currentPage: 2, pageSize: 10 })">next</button>',
          },
        },
      },
    })

    await wrapper.get('.pagination-next').trigger('click')

    expect(fetchReservationListSpy).toHaveBeenLastCalledWith({ page: 2, size: 10 })
  })

  it('归还确认页只拉取借用中记录，并可对预选记录执行归还确认', async () => {
    const { module, error } = await loadBorrowView('Return')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    routeState.path = '/borrows/return'
    routeState.query = { recordId: borrowedRecord.id }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'device-admin@example.com',
      phone: '13800138000',
      realName: '设备管理员',
      role: UserRole.DEVICE_ADMIN,
      userId: 'device-admin-1',
      username: 'device-admin',
    })

    const borrowStore = useBorrowStore()
    borrowStore.list = [borrowedRecord, returnedRecord]
    const fetchBorrowListSpy = vi
      .spyOn(borrowStore, 'fetchBorrowList')
      .mockResolvedValue({ total: 1, records: [borrowedRecord] })
    const confirmReturnSpy = vi
      .spyOn(borrowStore, 'confirmReturn')
      .mockResolvedValue(returnedRecord)

    const wrapper = mount(module.default, { global: commonGlobal })

    expect(fetchBorrowListSpy).toHaveBeenCalledWith({
      page: 1,
      size: 10,
      status: BorrowStatus.BORROWED,
    })
    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)

    await wrapper.get('.borrow-return-view__submit').trigger('click')

    expect(confirmReturnSpy).toHaveBeenCalledWith(borrowedRecord.id, undefined)
  })

  it('归还确认页切换分页时会继续以借用中条件拉取新页数据', async () => {
    const { module, error } = await loadBorrowView('Return')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    routeState.path = '/borrows/return'

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'device-admin@example.com',
      phone: '13800138000',
      realName: '设备管理员',
      role: UserRole.DEVICE_ADMIN,
      userId: 'device-admin-1',
      username: 'device-admin',
    })

    const borrowStore = useBorrowStore()
    borrowStore.list = [borrowedRecord]
    const fetchBorrowListSpy = vi
      .spyOn(borrowStore, 'fetchBorrowList')
      .mockResolvedValue({ total: 20, records: [borrowedRecord] })

    const wrapper = mount(module.default, {
      global: {
        ...commonGlobal,
        stubs: {
          ...commonGlobal.stubs,
          Pagination: {
            emits: ['change'],
            template:
              '<button class="pagination-next" @click="$emit(\'change\', { currentPage: 2, pageSize: 10 })">next</button>',
          },
        },
      },
    })

    await wrapper.get('.pagination-next').trigger('click')

    expect(fetchBorrowListSpy).toHaveBeenLastCalledWith({
      page: 2,
      size: 10,
      status: BorrowStatus.BORROWED,
    })
  })

  it('借还详情页会按路由主键拉取详情并展示状态', async () => {
    const { module, error } = await loadBorrowView('Detail')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    routeState.path = '/borrows/borrow-1'
    routeState.params = { id: borrowedRecord.id }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'user@example.com',
      phone: '13800138000',
      realName: '普通用户',
      role: UserRole.USER,
      userId: 'user-1',
      username: 'user',
    })

    const borrowStore = useBorrowStore()
    borrowStore.currentRecord = borrowedRecord
    const fetchBorrowDetailSpy = vi
      .spyOn(borrowStore, 'fetchBorrowDetail')
      .mockResolvedValue(borrowedRecord)

    const wrapper = mount(module.default, { global: commonGlobal })

    expect(fetchBorrowDetailSpy).toHaveBeenCalledWith(borrowedRecord.id)
    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('借用中')
    expect(wrapper.text()).toContain(borrowedRecord.deviceId)
  })
})
