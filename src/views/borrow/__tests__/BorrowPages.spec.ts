import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
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

function readBorrowViewSource(fileName: string) {
  return readFileSync(resolve(process.cwd(), `src/views/borrow/${fileName}`), 'utf-8')
}

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

const reservationCandidateWithOnlyIds = {
  ...reservationCandidate,
  id: 'reservation-3',
  userName: '',
  deviceName: '',
  deviceNumber: '',
} as const

const borrowedRecord = {
  id: 'borrow-1',
  reservationId: 'reservation-1',
  deviceId: 'device-1',
  deviceName: '热成像仪',
  deviceNumber: 'DEV-001',
  userId: 'user-1',
  userName: '张三',
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

const overdueRecord = {
  ...borrowedRecord,
  id: 'borrow-3',
  status: BorrowStatus.OVERDUE,
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
      inheritAttrs: false,
      props: ['type', 'loading', 'disabled'],
      emits: ['click'],
      template:
        '<button v-bind="$attrs" :disabled="disabled" :data-type="type" :data-loading="loading" @click="$emit(\'click\')"><slot /></button>',
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
    const filterPanels = wrapper.findAll('.console-filter-panel')
    const filterPanel = filterPanels[0]!
    const filterButtons = filterPanel.findAll('.borrow-list-view__filter-actions button')

    expect(filterPanels).toHaveLength(1)
    expect(wrapper.find('.console-toolbar-shell').exists()).toBe(false)
    expect(wrapper.find('.console-table-section').exists()).toBe(true)
    expect(filterPanel.text()).toContain('借还状态筛选')
    expect(filterPanel.findAll('.borrow-list-view__field select')).toHaveLength(1)
    expect(filterButtons).toHaveLength(2)
    expect(filterButtons[0]?.text()).toContain('查询')
    expect(filterButtons[1]?.text()).toContain('重置')
    expect(wrapper.text()).toContain(borrowedRecord.deviceName)
    expect(wrapper.text()).toContain(borrowedRecord.userName)
    expect(wrapper.text()).toContain('借用确认')
    expect(wrapper.text()).toContain('归还确认')

    const detailAction = wrapper.get('.borrow-list-view__table-actions .app-detail-action')
    const returnAction = wrapper
      .findAll('.borrow-list-view__table-actions button')
      .find((node) => node.text().includes('去归还确认'))
    const recordLink = wrapper.get('.borrow-list-view__link')

    expect(detailAction.text()).toContain('详情')
    expect(detailAction.attributes('data-type')).toBe('primary')
    expect(detailAction.find('i').exists()).toBe(true)
    expect(detailAction.find('svg').exists()).toBe(true)
    expect(returnAction).toBeTruthy()
    expect(returnAction?.classes()).not.toContain('app-detail-action')
    expect(recordLink.classes()).not.toContain('app-detail-action')
  })

  it('借还列表页改用统一筛选卡片后，查询与重置仍会驱动状态筛选请求', async () => {
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
    const fetchBorrowListSpy = vi
      .spyOn(borrowStore, 'fetchBorrowList')
      .mockResolvedValue({ total: 0, records: [] })

    const wrapper = mount(module.default, { global: commonGlobal })
    const statusSelect = wrapper.get('.borrow-list-view__field select')
    const filterButtons = wrapper.findAll('.borrow-list-view__filter-actions button')

    await statusSelect.setValue(BorrowStatus.OVERDUE)
    await filterButtons[0]!.trigger('click')
    await flushPromises()

    expect(fetchBorrowListSpy).toHaveBeenLastCalledWith({
      page: 1,
      size: 10,
      status: BorrowStatus.OVERDUE,
    })

    await filterButtons[1]!.trigger('click')
    await flushPromises()

    expect((statusSelect.element as HTMLSelectElement).value).toBe('')
    expect(fetchBorrowListSpy).toHaveBeenLastCalledWith({
      page: 1,
      size: 10,
      status: undefined,
    })
  })

  it('借还域页面源码改为消费主题 token，避免列表、表单壳层和详情说明面板在深色下残留浅色硬编码', () => {
    const listSource = readBorrowViewSource('List.vue')
    const confirmSource = readBorrowViewSource('Confirm.vue')
    const returnSource = readBorrowViewSource('Return.vue')
    const detailSource = readBorrowViewSource('Detail.vue')

    // 借还域页同时承载台账筛选、管理员确认和详情追溯，必须直接锁定页面级 token，避免深色主题下出现白底面板或固定强调色。
    expect(listSource).toContain('var(--app-surface-card-strong)')
    expect(listSource).toContain('var(--app-tone-brand-surface)')
    expect(listSource).toContain('var(--app-shadow-card)')

    expect(confirmSource).toContain('var(--app-surface-card)')
    expect(confirmSource).toContain('var(--app-tone-warning-surface)')
    expect(confirmSource).toContain('var(--app-border-soft)')

    expect(returnSource).toContain('var(--app-surface-card)')
    expect(returnSource).toContain('var(--app-tone-warning-border)')
    expect(returnSource).toContain('var(--app-text-secondary)')

    expect(detailSource).toContain('var(--app-surface-card)')
    expect(detailSource).toContain('var(--app-tone-info-surface)')
    expect(detailSource).toContain('var(--app-text-primary)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(listSource).not.toMatch(hardcodedColorPattern)
    expect(confirmSource).not.toMatch(hardcodedColorPattern)
    expect(returnSource).not.toMatch(hardcodedColorPattern)
    expect(detailSource).not.toMatch(hardcodedColorPattern)
  })

  it('借还列表把横向滚动收口到本地表格 wrapper，避免超长字段把整页主区撑宽', () => {
    const listSource = readBorrowViewSource('List.vue')

    expect(listSource).toMatch(
      /\.borrow-list-view__table-wrapper\s*\{[\s\S]*?width:\s*100%;[\s\S]*?max-width:\s*100%;[\s\S]*?overflow:\s*auto;/,
    )
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
    const fetchBorrowCandidatePageSpy = vi
      .spyOn(reservationStore, 'fetchBorrowCandidatePage')
      .mockImplementation(async () => {
        reservationStore.list = [reservationCandidate]
        reservationStore.total = 1
        return { total: 1, records: [reservationCandidate] }
      })

    const borrowStore = useBorrowStore()
    const confirmBorrowSpy = vi
      .spyOn(borrowStore, 'confirmBorrow')
      .mockResolvedValue(borrowedRecord)

    const wrapper = mount(module.default, { global: commonGlobal })

    await flushPromises()

    expect(fetchBorrowCandidatePageSpy).toHaveBeenCalledWith({ page: 1, size: 10 })
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
    const fetchBorrowCandidatePageSpy = vi
      .spyOn(reservationStore, 'fetchBorrowCandidatePage')
      .mockImplementation(async (payload: { page: number; size: number }) => {
        reservationStore.list = [reservationCandidate]
        reservationStore.total = 20
        reservationStore.query = { page: payload.page, size: payload.size }
        return { total: 20, records: [reservationCandidate] }
      })

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

    await flushPromises()

    await wrapper.get('.pagination-next').trigger('click')

    expect(fetchBorrowCandidatePageSpy).toHaveBeenLastCalledWith({ page: 2, size: 10 })
  })

  it('借用确认页在缺少设备名和借用人姓名时会回退展示真实 ID', async () => {
    const { module, error } = await loadBorrowView('Confirm')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    routeState.path = '/borrows/confirm'
    routeState.query = { reservationId: reservationCandidateWithOnlyIds.id }

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
    vi.spyOn(reservationStore, 'fetchBorrowCandidatePage').mockImplementation(async () => {
      reservationStore.list = [reservationCandidateWithOnlyIds]
      reservationStore.total = 1
      return {
        total: 1,
        records: [reservationCandidateWithOnlyIds],
      }
    })

    const wrapper = mount(module.default, { global: commonGlobal })

    await flushPromises()

    expect(wrapper.text()).toContain(reservationCandidateWithOnlyIds.deviceId)
    expect(wrapper.text()).toContain(reservationCandidateWithOnlyIds.userId)
    expect(wrapper.text()).not.toContain('undefined')
  })

  it('归还确认页会拉取当前分页可见记录，并可对预选记录执行归还确认', async () => {
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
    })
    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain(borrowedRecord.deviceName)
    expect(wrapper.text()).toContain(borrowedRecord.userName)

    await wrapper.get('.borrow-return-view__submit').trigger('click')

    expect(confirmReturnSpy).toHaveBeenCalledWith(borrowedRecord.id, undefined)
  })

  it('归还确认页当前页只有逾期记录时会默认选中首条可归还记录', async () => {
    const { module, error } = await loadBorrowView('Return')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    routeState.path = '/borrows/return'
    routeState.query = {}

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
    borrowStore.list = [overdueRecord]
    const fetchBorrowListSpy = vi
      .spyOn(borrowStore, 'fetchBorrowList')
      .mockResolvedValue({ total: 1, records: [overdueRecord] })
    const confirmReturnSpy = vi
      .spyOn(borrowStore, 'confirmReturn')
      .mockResolvedValue(returnedRecord)

    const wrapper = mount(module.default, { global: commonGlobal })

    await flushPromises()

    expect(fetchBorrowListSpy).toHaveBeenCalledWith({ page: 1, size: 10 })

    await wrapper.get('.borrow-return-view__submit').trigger('click')

    expect(confirmReturnSpy).toHaveBeenCalledWith(overdueRecord.id, undefined)
  })

  it('借还列表页会为已逾期记录继续开放归还确认入口', async () => {
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
    borrowStore.list = [overdueRecord]
    borrowStore.total = 1
    vi.spyOn(borrowStore, 'fetchBorrowList').mockResolvedValue({
      total: 1,
      records: [overdueRecord],
    })

    const wrapper = mount(module.default, { global: commonGlobal })

    expect(wrapper.text()).toContain('去归还确认')

    const returnAction = wrapper
      .findAll('button')
      .find((node) => node.text().includes('去归还确认'))

    expect(returnAction).toBeTruthy()

    await returnAction?.trigger('click')

    expect(pushMock).toHaveBeenCalledWith(`/borrows/return?recordId=${overdueRecord.id}`)
  })

  it('归还确认页切换分页时会继续保留无状态筛选的新页查询', async () => {
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
    })
  })

  /**
   * 通用归还确认入口改成无状态分页后，当前页可能只有已归还记录；
   * 这里验证页面会保留分页入口，而不是直接整页空状态把管理员锁死在第一页。
   */
  it('归还确认页当前页没有可归还记录时仍保留分页能力', async () => {
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
    borrowStore.list = [returnedRecord]
    borrowStore.total = 20
    const fetchBorrowListSpy = vi
      .spyOn(borrowStore, 'fetchBorrowList')
      .mockResolvedValue({ total: 20, records: [returnedRecord] })

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

    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.findAll('.empty-state-stub').length).toBeGreaterThan(0)
    expect(wrapper.find('.pagination-next').exists()).toBe(true)

    await wrapper.get('.pagination-next').trigger('click')

    expect(fetchBorrowListSpy).toHaveBeenLastCalledWith({
      page: 2,
      size: 10,
    })
  })

  it('归还确认页会补拉预选的逾期记录并允许继续完成归还闭环', async () => {
    const { module, error } = await loadBorrowView('Return')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    routeState.path = '/borrows/return'
    routeState.query = { recordId: overdueRecord.id }

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
    borrowStore.list = []
    vi.spyOn(borrowStore, 'fetchBorrowList').mockResolvedValue({ total: 0, records: [] })
    const fetchBorrowDetailSpy = vi
      .spyOn(borrowStore, 'fetchBorrowDetail')
      .mockResolvedValue(overdueRecord)
    const confirmReturnSpy = vi
      .spyOn(borrowStore, 'confirmReturn')
      .mockResolvedValue(returnedRecord)

    const wrapper = mount(module.default, { global: commonGlobal })

    await flushPromises()

    expect(fetchBorrowDetailSpy).toHaveBeenCalledWith(overdueRecord.id)
    expect(wrapper.text()).toContain(overdueRecord.deviceName)
    expect(wrapper.text()).toContain(overdueRecord.userName)

    await wrapper.get('.borrow-return-view__submit').trigger('click')

    expect(confirmReturnSpy).toHaveBeenCalledWith(overdueRecord.id, undefined)
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
    expect(wrapper.text()).toContain(borrowedRecord.deviceName)
    expect(wrapper.text()).toContain(borrowedRecord.userName)
    expect(wrapper.text()).toContain(borrowedRecord.deviceNumber)
  })
})
