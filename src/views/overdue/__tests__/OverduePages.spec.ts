import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  OverdueHandleType,
  OverdueHandleTypeLabel,
  OverdueProcessingStatus,
  OverdueProcessingStatusLabel,
  UserRole,
} from '@/enums'
import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'
import { useOverdueStore } from '@/stores/modules/overdue'

const pushMock = vi.fn()
const messageSuccessMock = vi.fn()
const messageWarningMock = vi.fn()
const routeState = {
  path: '/overdue',
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
      warning: messageWarningMock,
    },
  }
})

const overdueViewModules = import.meta.glob('../*.vue')

function readOverdueViewSource(componentName: string) {
  return readFileSync(resolve(process.cwd(), `src/views/overdue/${componentName}`), 'utf-8')
}

async function loadOverdueView(componentName: string) {
  const loader = overdueViewModules[`../${componentName}.vue`]

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

const pendingRecord = {
  id: 'overdue-1',
  borrowRecordId: 'borrow-1',
  userId: 'user-1',
  userName: '张三',
  deviceId: 'device-1',
  deviceName: '热成像仪',
  deviceNumber: 'DEV-001',
  overdueHours: 11,
  overdueDays: 1,
  processingStatus: OverdueProcessingStatus.PENDING,
  processingMethod: null,
  processingRemark: null,
  processorId: null,
  processingTime: null,
  compensationAmount: null,
  notificationSent: 1,
  createdAt: '2024-01-03T12:00:00',
} as const

const processedRecord = {
  ...pendingRecord,
  id: 'overdue-2',
  processingStatus: OverdueProcessingStatus.PROCESSED,
  processingMethod: OverdueHandleType.WARNING,
  processingRemark: '已警告',
  processorId: 'device-admin-1',
  processingTime: '2024-01-03T12:30:00',
  compensationAmount: 0,
} as const

const commonGlobal = {
  stubs: {
    EmptyState: {
      template: '<div class="empty-state-stub"><slot /></div>',
    },
    Pagination: {
      template: '<div class="pagination-stub"></div>',
    },
    OverdueAlert: {
      props: ['pendingCount', 'totalOverdueHours', 'isAdmin'],
      template:
        '<div class="overdue-alert-stub">{{ pendingCount }}-{{ totalOverdueHours }}-{{ isAdmin }}</div>',
    },
    OverdueProcessingStatusTag: {
      props: ['status'],
      setup() {
        return { OverdueProcessingStatusLabel }
      },
      template:
        '<span class="overdue-status-stub">{{ OverdueProcessingStatusLabel[status] ?? status }}</span>',
    },
    OverdueHandleTypeTag: {
      props: ['type'],
      setup() {
        return { OverdueHandleTypeLabel }
      },
      template:
        '<span class="overdue-type-stub">{{ type ? OverdueHandleTypeLabel[type] : "未处理" }}</span>',
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

describe('overdue pages', () => {
  beforeEach(() => {
    pushMock.mockReset()
    messageSuccessMock.mockReset()
    messageWarningMock.mockReset()
    routeState.path = '/overdue'
    routeState.params = {}
    routeState.query = {}
    setActivePinia(createAppPinia())
  })

  it('逾期列表页会拉取默认分页，并为设备管理员展示处理入口', async () => {
    const { module, error } = await loadOverdueView('List')

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

    const overdueStore = useOverdueStore()
    overdueStore.list = [pendingRecord, processedRecord]
    overdueStore.total = 2

    const fetchOverdueListSpy = vi
      .spyOn(overdueStore, 'fetchOverdueList')
      .mockResolvedValue({ total: 2, records: [pendingRecord, processedRecord] })

    const wrapper = mount(module.default, { global: commonGlobal })

    expect(fetchOverdueListSpy).toHaveBeenCalledWith({
      page: 1,
      size: 10,
      processingStatus: undefined,
    })
    expect(wrapper.find('.console-page-hero').exists()).toBe(true)
    const filterPanels = wrapper.findAll('.console-filter-panel')
    const filterPanel = filterPanels[0]!
    const filterButtons = filterPanel.findAll('.overdue-list-view__filter-actions button')

    expect(filterPanels).toHaveLength(1)
    expect(wrapper.find('.console-toolbar-shell').exists()).toBe(false)
    expect(wrapper.find('.console-table-section').exists()).toBe(true)
    expect(filterPanel.text()).toContain('处理状态筛选')
    expect(filterPanel.findAll('.overdue-list-view__field select')).toHaveLength(1)
    expect(filterButtons).toHaveLength(2)
    expect(filterButtons[0]?.text()).toContain('查询')
    expect(filterButtons[1]?.text()).toContain('重置')
    expect(wrapper.text()).toContain(pendingRecord.deviceName)
    expect(wrapper.text()).toContain(pendingRecord.userName)
    expect(wrapper.text()).toContain('处理逾期')
  })

  it('逾期列表页改用统一筛选卡片后，查询与重置仍会驱动处理状态请求', async () => {
    const { module, error } = await loadOverdueView('List')

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

    const overdueStore = useOverdueStore()
    const fetchOverdueListSpy = vi
      .spyOn(overdueStore, 'fetchOverdueList')
      .mockResolvedValue({ total: 0, records: [] })

    const wrapper = mount(module.default, { global: commonGlobal })
    const statusSelect = wrapper.get('.overdue-list-view__field select')
    const filterButtons = wrapper.findAll('.overdue-list-view__filter-actions button')

    await statusSelect.setValue(OverdueProcessingStatus.PROCESSED)
    await filterButtons[0]!.trigger('click')
    await flushPromises()

    expect(fetchOverdueListSpy).toHaveBeenLastCalledWith({
      page: 1,
      size: 10,
      processingStatus: OverdueProcessingStatus.PROCESSED,
    })

    await filterButtons[1]!.trigger('click')
    await flushPromises()

    expect((statusSelect.element as HTMLSelectElement).value).toBe('')
    expect(fetchOverdueListSpy).toHaveBeenLastCalledWith({
      page: 1,
      size: 10,
      processingStatus: undefined,
    })
  })

  it('逾期列表把横向滚动收口到本地表格 wrapper，避免超长记录把整页主区撑宽', () => {
    const listSource = readOverdueViewSource('List.vue')

    expect(listSource).toMatch(
      /\.overdue-list-view__table-wrapper\s*\{[\s\S]*?width:\s*100%;[\s\S]*?max-width:\s*100%;[\s\S]*?overflow:\s*auto;/,
    )
  })

  it('当前页没有待处理记录时，处理逾期按钮会改拉待处理数据后再跳转', async () => {
    const { module, error } = await loadOverdueView('List')

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

    const overdueStore = useOverdueStore()
    overdueStore.list = [processedRecord]
    const fetchOverdueListSpy = vi
      .spyOn(overdueStore, 'fetchOverdueList')
      .mockResolvedValueOnce({ total: 1, records: [processedRecord] })
      .mockResolvedValueOnce({ total: 1, records: [pendingRecord] })

    const wrapper = mount(module.default, { global: commonGlobal })

    await wrapper.get('.overdue-list-view__hero-handle').trigger('click')

    expect(fetchOverdueListSpy).toHaveBeenLastCalledWith({
      page: 1,
      size: 10,
      processingStatus: OverdueProcessingStatus.PENDING,
    })
    expect(pushMock).toHaveBeenCalledWith(`/overdue/${pendingRecord.id}/handle`)
  })

  it('普通用户访问逾期列表页时不展示管理员处理入口', async () => {
    const { module, error } = await loadOverdueView('List')

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

    const overdueStore = useOverdueStore()
    vi.spyOn(overdueStore, 'fetchOverdueList').mockResolvedValue({
      total: 1,
      records: [pendingRecord],
    })

    const wrapper = mount(module.default, { global: commonGlobal })

    expect(wrapper.find('.overdue-list-view__hero-actions').exists()).toBe(false)
  })

  it('逾期处理页会按路由主键拉取详情，并在赔偿模式下提交金额', async () => {
    const { module, error } = await loadOverdueView('Handle')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    routeState.path = '/overdue/overdue-1/handle'
    routeState.params = { id: pendingRecord.id }
    routeState.query = { method: OverdueHandleType.COMPENSATION }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'device-admin@example.com',
      phone: '13800138000',
      realName: '设备管理员',
      role: UserRole.DEVICE_ADMIN,
      userId: 'device-admin-1',
      username: 'device-admin',
    })

    const overdueStore = useOverdueStore()
    overdueStore.currentRecord = pendingRecord
    const fetchOverdueDetailSpy = vi
      .spyOn(overdueStore, 'fetchOverdueDetail')
      .mockResolvedValue(pendingRecord)
    const processRecordSpy = vi
      .spyOn(overdueStore, 'processRecord')
      .mockResolvedValue(processedRecord)

    const wrapper = mount(module.default, { global: commonGlobal })

    expect(fetchOverdueDetailSpy).toHaveBeenCalledWith(pendingRecord.id)
    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain(pendingRecord.deviceName)
    expect(wrapper.text()).toContain(pendingRecord.userName)

    await wrapper.get('textarea').setValue('已确认损坏')
    await wrapper.get('input[type="number"]').setValue('120')
    await wrapper.get('.overdue-handle-view__submit').trigger('click')

    expect(processRecordSpy).toHaveBeenCalledWith(pendingRecord.id, {
      processingMethod: OverdueHandleType.COMPENSATION,
      remark: '已确认损坏',
      compensationAmount: 120,
    })
  })

  it('逾期处理页在赔偿模式下未填写赔偿金额时阻止提交', async () => {
    const { module, error } = await loadOverdueView('Handle')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    routeState.path = '/overdue/overdue-1/handle'
    routeState.params = { id: pendingRecord.id }
    routeState.query = { method: OverdueHandleType.COMPENSATION }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'device-admin@example.com',
      phone: '13800138000',
      realName: '设备管理员',
      role: UserRole.DEVICE_ADMIN,
      userId: 'device-admin-1',
      username: 'device-admin',
    })

    const overdueStore = useOverdueStore()
    overdueStore.currentRecord = pendingRecord
    vi.spyOn(overdueStore, 'fetchOverdueDetail').mockResolvedValue(pendingRecord)
    const processRecordSpy = vi
      .spyOn(overdueStore, 'processRecord')
      .mockResolvedValue(processedRecord)

    const wrapper = mount(module.default, { global: commonGlobal })

    await wrapper.get('textarea').setValue('仍需赔偿')
    await wrapper.get('.overdue-handle-view__submit').trigger('click')

    expect(processRecordSpy).not.toHaveBeenCalled()
    expect(messageWarningMock).toHaveBeenCalledWith('赔偿金额不能为空')
  })

  it('逾期详情页会按路由主键拉取详情并展示处理状态', async () => {
    const { module, error } = await loadOverdueView('Detail')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    routeState.path = '/overdue/overdue-1'
    routeState.params = { id: pendingRecord.id }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'user@example.com',
      phone: '13800138000',
      realName: '普通用户',
      role: UserRole.USER,
      userId: 'user-1',
      username: 'user',
    })

    const overdueStore = useOverdueStore()
    overdueStore.currentRecord = pendingRecord
    const fetchOverdueDetailSpy = vi
      .spyOn(overdueStore, 'fetchOverdueDetail')
      .mockResolvedValue(pendingRecord)

    const wrapper = mount(module.default, { global: commonGlobal })

    expect(fetchOverdueDetailSpy).toHaveBeenCalledWith(pendingRecord.id)
    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('待处理')
    expect(wrapper.text()).toContain(pendingRecord.deviceName)
    expect(wrapper.text()).toContain(pendingRecord.userName)
    expect(wrapper.text()).toContain(pendingRecord.borrowRecordId)
  })

  it('普通用户进入处理页时不会提交逾期处理结果', async () => {
    const { module, error } = await loadOverdueView('Handle')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    routeState.path = '/overdue/overdue-1/handle'
    routeState.params = { id: pendingRecord.id }
    routeState.query = { method: OverdueHandleType.WARNING }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'user@example.com',
      phone: '13800138000',
      realName: '普通用户',
      role: UserRole.USER,
      userId: 'user-1',
      username: 'user',
    })

    const overdueStore = useOverdueStore()
    overdueStore.currentRecord = pendingRecord
    vi.spyOn(overdueStore, 'fetchOverdueDetail').mockResolvedValue(pendingRecord)
    const processRecordSpy = vi
      .spyOn(overdueStore, 'processRecord')
      .mockResolvedValue(processedRecord)

    const wrapper = mount(module.default, { global: commonGlobal })

    await wrapper.get('.overdue-handle-view__submit').trigger('click')

    expect(processRecordSpy).not.toHaveBeenCalled()
  })

  it('处理页在记录尚未加载完成时不会提交处理请求', async () => {
    const { module, error } = await loadOverdueView('Handle')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    routeState.path = '/overdue/overdue-1/handle'
    routeState.params = { id: pendingRecord.id }
    routeState.query = { method: OverdueHandleType.WARNING }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'device-admin@example.com',
      phone: '13800138000',
      realName: '设备管理员',
      role: UserRole.DEVICE_ADMIN,
      userId: 'device-admin-1',
      username: 'device-admin',
    })

    const overdueStore = useOverdueStore()
    overdueStore.currentRecord = null
    vi.spyOn(overdueStore, 'fetchOverdueDetail').mockResolvedValue(undefined as never)
    const processRecordSpy = vi
      .spyOn(overdueStore, 'processRecord')
      .mockResolvedValue(processedRecord)

    const wrapper = mount(module.default, { global: commonGlobal })

    await wrapper.get('.overdue-handle-view__submit').trigger('click')

    expect(processRecordSpy).not.toHaveBeenCalled()
  })

  it('处理页当前缓存记录与路由 id 不一致时不会沿用旧记录提交', async () => {
    const { module, error } = await loadOverdueView('Handle')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    routeState.path = '/overdue/overdue-2/handle'
    routeState.params = { id: 'overdue-2' }
    routeState.query = { method: OverdueHandleType.WARNING }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'device-admin@example.com',
      phone: '13800138000',
      realName: '设备管理员',
      role: UserRole.DEVICE_ADMIN,
      userId: 'device-admin-1',
      username: 'device-admin',
    })

    const overdueStore = useOverdueStore()
    overdueStore.currentRecord = pendingRecord
    vi.spyOn(overdueStore, 'fetchOverdueDetail').mockResolvedValue(undefined as never)
    const processRecordSpy = vi
      .spyOn(overdueStore, 'processRecord')
      .mockResolvedValue(processedRecord)

    const wrapper = mount(module.default, { global: commonGlobal })

    await wrapper.get('.overdue-handle-view__submit').trigger('click')

    expect(processRecordSpy).not.toHaveBeenCalled()
  })

  it('逾期域页面源码改为消费主题 token，避免告警红色、详情面板与处理表单在深色下残留浅色硬编码', () => {
    const listSource = readOverdueViewSource('List.vue')
    const detailSource = readOverdueViewSource('Detail.vue')
    const handleSource = readOverdueViewSource('Handle.vue')

    // 逾期域同时承载风险提示、详情追溯与管理员裁决，页面源码必须直接绑定语义 token，深色主题下才能维持红色告警和表单可读性。
    expect(listSource).toContain('var(--app-tone-danger-text)')
    expect(listSource).toContain(':deep(.console-page-hero__eyebrow)')
    expect(listSource).toContain(':deep(.console-page-hero__title)')
    expect(listSource).toContain('var(--app-tone-danger-text-strong)')
    expect(listSource).toContain('var(--app-surface-card-strong)')
    expect(listSource).toContain('var(--app-border-soft)')

    expect(detailSource).toContain('var(--app-surface-card)')
    expect(detailSource).toContain('var(--app-tone-danger-surface)')
    expect(detailSource).toContain(':deep(.console-page-hero__eyebrow)')
    expect(detailSource).toContain(':deep(.console-page-hero__title)')
    expect(detailSource).toContain('var(--app-tone-danger-text-strong)')
    expect(detailSource).toContain('var(--app-text-secondary)')

    expect(handleSource).toContain('var(--app-surface-card)')
    expect(handleSource).toContain('var(--app-tone-danger-border)')
    expect(handleSource).toContain(':deep(.console-page-hero__eyebrow)')
    expect(handleSource).toContain(':deep(.console-page-hero__title)')
    expect(handleSource).toContain('var(--app-tone-danger-text-strong)')
    expect(handleSource).toContain('var(--app-text-primary)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(listSource).not.toMatch(hardcodedColorPattern)
    expect(detailSource).not.toMatch(hardcodedColorPattern)
    expect(handleSource).not.toMatch(hardcodedColorPattern)
  })
})
