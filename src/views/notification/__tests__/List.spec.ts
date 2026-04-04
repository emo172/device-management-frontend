import { setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { createAppPinia } from '@/stores'
import { useNotificationStore } from '@/stores/modules/notification'

const appSelectStub = {
  name: 'AppSelect',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    clearable: Boolean,
    placeholder: {
      type: String,
      default: '',
    },
    disabled: Boolean,
  },
  emits: ['update:modelValue'],
  template:
    '<div class="app-select-stub" :class="$attrs.class" :style="$attrs.style" :data-placeholder="placeholder">' +
    '<select class="app-select-stub__control" data-testid="type-filter" :value="modelValue ?? String()" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>' +
    '<button v-if="clearable" type="button" data-testid="type-filter-clear" @click="$emit(\'update:modelValue\', \'\')">清空</button>' +
    '</div>',
}

const paginationStub = {
  name: 'Pagination',
  props: {
    currentPage: {
      type: Number,
      required: true,
    },
    pageSize: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    disabled: Boolean,
  },
  emits: ['change'],
  template:
    '<div class="pagination-stub" :data-current-page="currentPage" :data-page-size="pageSize" :data-total="total">' +
    '<button type="button" data-testid="pagination-page-2" @click="$emit(\'change\', { currentPage: 2, pageSize })">切到第 2 页</button>' +
    '<button type="button" data-testid="pagination-size-2" @click="$emit(\'change\', { currentPage, pageSize: 2 })">每页 2 条</button>' +
    '</div>',
}

const notificationViewModules = import.meta.glob('../*.vue')

async function loadNotificationListView() {
  const loader = notificationViewModules['../List.vue']

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

function readNotificationViewSource() {
  return readFileSync(resolve(process.cwd(), 'src/views/notification/List.vue'), 'utf-8')
}

function createNotificationFixture(
  id: string,
  overrides: Partial<{
    notificationType: string
    channel: string
    title: string
    content: string
    readFlag: number
    readAt: string | null
    sentAt: string | null
    createdAt: string | null
  }> = {},
) {
  return {
    id,
    notificationType: overrides.notificationType ?? 'OVERDUE_WARNING',
    channel: overrides.channel ?? 'IN_APP',
    title: overrides.title ?? `通知-${id}`,
    content: overrides.content ?? `通知-${id}-摘要`,
    status: 'STATUS_PLACEHOLDER',
    readFlag: overrides.readFlag ?? 0,
    readAt: overrides.readAt ?? null,
    templateVars: null,
    retryCount: 0,
    relatedId: `${id}-related`,
    relatedType: 'BORROW_RECORD',
    sentAt: overrides.sentAt ?? '2026-03-16T08:00:00',
    createdAt: overrides.createdAt ?? '2026-03-16T08:00:00',
  }
}

const notificationFixtures = [
  createNotificationFixture('notice-1', {
    notificationType: 'OVERDUE_WARNING',
    channel: 'IN_APP',
    title: '逾期提醒',
    content: '您有一条设备借用已逾期，请尽快处理。',
    createdAt: '2026-03-18T10:00:00',
  }),
  createNotificationFixture('notice-2', {
    notificationType: 'RESERVATION_REMINDER',
    channel: 'EMAIL',
    title: '预约提醒',
    content: '您预约的设备将在明天 09:00 开始。',
    readFlag: 1,
    createdAt: '2026-03-17T09:00:00',
  }),
  createNotificationFixture('notice-3', {
    notificationType: 'OVERDUE_WARNING',
    channel: 'IN_APP',
    title: '二次逾期提醒',
    content: '第二条逾期站内信仍未处理。',
    createdAt: '2026-03-16T08:00:00',
  }),
]

function cloneNotifications() {
  return notificationFixtures.map((item) => ({ ...item }))
}

function countUnread(notifications: ReturnType<typeof cloneNotifications>) {
  return notifications.filter((item) => item.channel === 'IN_APP' && item.readFlag === 0).length
}

function normalizeQuery(query?: {
  page?: number
  size?: number
  notificationType?: string
}) {
  return {
    page: query?.page ?? 1,
    size: query?.size ?? 10,
    notificationType: query?.notificationType || undefined,
  }
}

function createNotificationStoreHarness(initialQuery?: {
  page?: number
  size?: number
  notificationType?: string
}) {
  const notificationStore = useNotificationStore()
  const seedQuery = normalizeQuery(initialQuery)

  let serverNotifications = cloneNotifications()
  let markAllInvocationQuery:
    | { page?: number; size?: number; notificationType?: string }
    | null = null

  notificationStore.query = { ...seedQuery }
  notificationStore.unreadCount = countUnread(serverNotifications)

  const fetchNotificationListSpy = vi
    .spyOn(notificationStore, 'fetchNotificationList')
    .mockImplementation(async (query) => {
      const nextQuery = normalizeQuery(query)
      const filtered = nextQuery.notificationType
        ? serverNotifications.filter(
            (item) => item.notificationType === nextQuery.notificationType,
          )
        : serverNotifications
      const start = (nextQuery.page - 1) * nextQuery.size
      const records = filtered.slice(start, start + nextQuery.size).map((item) => ({ ...item }))

      notificationStore.query = { ...nextQuery }
      notificationStore.list = records
      notificationStore.notifications = records
      notificationStore.total = filtered.length

      return records
    })

  const fetchUnreadCountSpy = vi
    .spyOn(notificationStore, 'fetchUnreadCount')
    .mockImplementation(async () => {
      notificationStore.unreadCount = countUnread(serverNotifications)
      return notificationStore.unreadCount
    })

  const markAsReadSpy = vi.spyOn(notificationStore, 'markAsRead').mockImplementation(async (id) => {
    serverNotifications = serverNotifications.map((item) =>
      item.id === id ? { ...item, readFlag: 1, readAt: '2026-03-18T12:00:00' } : item,
    )

    notificationStore.list = notificationStore.list.map((item) =>
      item.id === id ? { ...item, readFlag: 1, readAt: '2026-03-18T12:00:00' } : item,
    )
    notificationStore.notifications = notificationStore.list
    notificationStore.unreadCount = countUnread(serverNotifications)

    return {
      notificationId: id,
      readFlag: 1,
      readAt: '2026-03-18T12:00:00',
      unreadCount: notificationStore.unreadCount,
    }
  })

  const markAllAsReadSpy = vi.spyOn(notificationStore, 'markAllAsRead').mockImplementation(async () => {
    const currentQuery = { ...notificationStore.query }

    markAllInvocationQuery = currentQuery

    serverNotifications = serverNotifications.map((item) =>
      item.channel === 'IN_APP'
        ? { ...item, readFlag: 1, readAt: item.readAt ?? '2026-03-18T12:30:00' }
        : item,
    )

    notificationStore.unreadCount = countUnread(serverNotifications)
    await notificationStore.fetchNotificationList(currentQuery)

    return {
      updatedCount: 2,
      readAt: '2026-03-18T12:30:00',
      unreadCount: notificationStore.unreadCount,
    }
  })

    return {
      notificationStore,
      fetchNotificationListSpy,
      fetchUnreadCountSpy,
      markAsReadSpy,
      markAllAsReadSpy,
      getMarkAllInvocationQuery: () => markAllInvocationQuery,
    }
}

function buildMountOptions() {
  return {
    global: {
      stubs: {
        EmptyState: {
          props: ['title', 'description', 'actionText'],
          template:
            '<div class="empty-state-stub">' +
            '<h3 class="empty-state-stub__title">{{ title }}</h3>' +
            '<p class="empty-state-stub__description">{{ description }}</p>' +
            '<slot />' +
            '<button type="button" @click="$emit(\'action\')">{{ actionText }}</button>' +
            '</div>',
          emits: ['action'],
        },
        Pagination: paginationStub,
        ElButton: {
          props: ['disabled', 'loading', 'text', 'type'],
          emits: ['click'],
          template:
            '<button :disabled="disabled" :data-loading="loading ? \'true\' : \'false\'" @click="$emit(\'click\')"><slot /></button>',
        },
        ElIcon: { template: '<i><slot /></i>' },
        AppSelect: appSelectStub,
        ElOption: {
          props: ['label', 'value'],
          template: '<option :value="value">{{ label }}</option>',
        },
        ElTag: { template: '<span class="tag-stub"><slot /></span>' },
      },
      directives: {
        loading: {
          mounted() {},
          updated() {},
        },
      },
    },
  }
}

async function mountNotificationListView(initialQuery?: {
  page?: number
  size?: number
  notificationType?: string
}) {
  const { module, error } = await loadNotificationListView()

  expect(error).toBeNull()
  expect(module).toBeTruthy()

  if (!module) {
    throw error ?? new Error('List.vue failed to load')
  }

  const harness = createNotificationStoreHarness(initialQuery)
  const wrapper = mount(module.default, buildMountOptions())

  await flushPromises()

  return {
    wrapper,
    ...harness,
  }
}

function getLastFetchQuery(fetchNotificationListSpy: ReturnType<typeof vi.fn>) {
  const calls = fetchNotificationListSpy.mock.calls
  const lastCall = calls[calls.length - 1]

  return lastCall?.[0] as
    | { page?: number; size?: number; notificationType?: string }
    | undefined
}

function findButtonByText(
  wrapper: ReturnType<typeof mount>,
  text: string,
  options: { exact?: boolean } = {},
) {
  return wrapper.findAll('button').find((node) => {
    const buttonText = node.text().trim()

    return options.exact ? buttonText === text : buttonText.includes(text)
  })
}

describe('notification list view', () => {
  beforeEach(() => {
    setActivePinia(createAppPinia())
  })

  it('通知页源码改为 ConsoleTableSection + 原生 table + Pagination，并移除卡片列表旧实现', () => {
    const source = readNotificationViewSource()

    expect(source).toContain("import AppSelect from '@/components/common/dropdown/AppSelect.vue'")
    expect(source).toContain("import Pagination from '@/components/common/Pagination.vue'")
    expect(source).toContain("import ConsoleTableSection from '@/components/layout/ConsoleTableSection.vue'")
    expect(source).toContain('<AppSelect')
    expect(source).toContain('<ConsoleTableSection')
    expect(source).toContain('<table')
    expect(source).toContain('<Pagination')
    expect(source).not.toContain('NotificationItem')
    expect(source).not.toContain('filteredNotifications')
    expect(source).toContain('notificationStore.list')
    expect(source).not.toContain('notificationStore.notifications')
  })

  it('渲染通知表格并把分页状态绑定到 store 的 list / total / query 真相源', async () => {
    const { wrapper, fetchNotificationListSpy, fetchUnreadCountSpy } =
      await mountNotificationListView({ page: 2, size: 1 })

    expect(fetchNotificationListSpy).toHaveBeenCalledTimes(1)
    expect(fetchUnreadCountSpy).toHaveBeenCalledTimes(1)
    expect(getLastFetchQuery(fetchNotificationListSpy)).toEqual({ page: 2, size: 1 })

    const pagination = wrapper.getComponent({ name: 'Pagination' })

    expect(pagination.props('currentPage')).toBe(2)
    expect(pagination.props('pageSize')).toBe(1)
    expect(pagination.props('total')).toBe(3)
    expect(wrapper.get('.console-filter-panel').text()).toContain('刷新列表')
    expect(wrapper.get('.console-table-section').text()).toContain('通知列表')
    expect(wrapper.text()).toContain('通知时间')
    expect(wrapper.text()).toContain('通知类型')
    expect(wrapper.text()).toContain('渠道')
    expect(wrapper.text()).toContain('标题与摘要')
    expect(wrapper.text()).toContain('已读状态')
    expect(wrapper.text()).toContain('已读时间')
    expect(wrapper.text()).toContain('操作')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.text()).toContain('预约提醒')
    expect(wrapper.text()).toContain('无已读回执')
    expect(wrapper.text()).toContain('共 3 条')
  })

  it('通知类型变化时重置到第一页，且分页大小变化保持当前页码不变', async () => {
    const { wrapper, fetchNotificationListSpy } = await mountNotificationListView({
      page: 2,
      size: 1,
    })

    await wrapper.get('.app-select-stub__control').setValue('OVERDUE_WARNING')
    await flushPromises()

    const afterFilterQuery = getLastFetchQuery(fetchNotificationListSpy)
    const pagination = wrapper.getComponent({ name: 'Pagination' })

    expect(afterFilterQuery).toEqual({
      page: 1,
      size: 1,
      notificationType: 'OVERDUE_WARNING',
    })
    expect(pagination.props('currentPage')).toBe(1)
    expect(pagination.props('pageSize')).toBe(1)
    expect(pagination.props('total')).toBe(2)
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.text()).toContain('逾期提醒')
    expect(findButtonByText(wrapper, '标记已读', { exact: true })).toBeTruthy()

    await wrapper.get('[data-testid="pagination-page-2"]').trigger('click')
    await flushPromises()

    expect(getLastFetchQuery(fetchNotificationListSpy)).toEqual({
      page: 2,
      size: 1,
      notificationType: 'OVERDUE_WARNING',
    })
    expect(pagination.props('currentPage')).toBe(2)

    await wrapper.get('[data-testid="pagination-size-2"]').trigger('click')
    await flushPromises()

    expect(getLastFetchQuery(fetchNotificationListSpy)).toEqual({
      page: 2,
      size: 2,
      notificationType: 'OVERDUE_WARNING',
    })
    expect(pagination.props('currentPage')).toBe(2)
    expect(pagination.props('pageSize')).toBe(2)
  })

  it('未知通知类型筛选返回空记录时展示空态，而不是回退到本地旧列表', async () => {
    const { wrapper, fetchNotificationListSpy } = await mountNotificationListView({
      page: 2,
      size: 1,
    })

    const typeFilter = wrapper.getComponent({ name: 'AppSelect' })

    typeFilter.vm.$emit('update:modelValue', 'UNKNOWN_NOTIFICATION_TYPE')
    await flushPromises()

    const pagination = wrapper.getComponent({ name: 'Pagination' })

    expect(getLastFetchQuery(fetchNotificationListSpy)).toEqual({
      page: 1,
      size: 1,
      notificationType: 'UNKNOWN_NOTIFICATION_TYPE',
    })
    expect(pagination.props('currentPage')).toBe(1)
    expect(pagination.props('pageSize')).toBe(1)
    expect(pagination.props('total')).toBe(0)
    expect(wrapper.find('.empty-state-stub').exists()).toBe(true)
    expect(wrapper.find('.notification-list-view__table-wrapper').exists()).toBe(false)
    expect(wrapper.findAll('tbody tr')).toHaveLength(0)
    expect(wrapper.findAll('.notification-list-view__headline')).toHaveLength(0)
    expect(wrapper.text()).toContain('暂无符合条件的通知')
  })

  it('刷新列表按当前 query 重拉，全部已读后保留当前页并刷新当前页', async () => {
    const {
      wrapper,
      fetchNotificationListSpy,
      fetchUnreadCountSpy,
      markAllAsReadSpy,
      markAsReadSpy,
      getMarkAllInvocationQuery,
    } = await mountNotificationListView({
      page: 2,
      size: 1,
      notificationType: 'OVERDUE_WARNING',
    })

    const markReadButton = findButtonByText(wrapper, '标记已读', { exact: true })

    expect(markReadButton).toBeTruthy()

    if (!markReadButton) {
      return
    }

    await markReadButton.trigger('click')
    await flushPromises()

    expect(markAsReadSpy).toHaveBeenCalledWith('notice-3')
    expect(wrapper.text()).toContain('已读')
    expect(findButtonByText(wrapper, '标记已读', { exact: true })).toBeUndefined()

    const refreshButton = findButtonByText(wrapper, '刷新列表')
    const markAllButton = findButtonByText(wrapper, '全部标记已读')

    expect(refreshButton).toBeTruthy()
    expect(markAllButton).toBeTruthy()

    if (!refreshButton || !markAllButton) {
      return
    }

    await refreshButton.trigger('click')
    await flushPromises()

    expect(fetchUnreadCountSpy).toHaveBeenCalledTimes(2)
    expect(getLastFetchQuery(fetchNotificationListSpy)).toEqual({
      page: 2,
      size: 1,
      notificationType: 'OVERDUE_WARNING',
    })

    await markAllButton.trigger('click')
    await flushPromises()

    const pagination = wrapper.getComponent({ name: 'Pagination' })

    expect(markAllAsReadSpy).toHaveBeenCalledTimes(1)
    expect(getMarkAllInvocationQuery()).toEqual({
      page: 2,
      size: 1,
      notificationType: 'OVERDUE_WARNING',
    })
    expect(getLastFetchQuery(fetchNotificationListSpy)).toEqual({
      page: 2,
      size: 1,
      notificationType: 'OVERDUE_WARNING',
    })
    expect(pagination.props('currentPage')).toBe(2)
    expect(wrapper.get('.notification-list-view__hero-actions').text()).toContain('0 条未读')
  })

  it('通知页源码继续消费主题 token，避免表格迁移后残留硬编码颜色', () => {
    const source = readNotificationViewSource()

    expect(source).toContain('var(--app-surface-card-strong)')
    expect(source).toContain('var(--app-border-soft)')
    expect(source).toContain('var(--app-text-primary)')
    expect(source).toContain('var(--app-text-secondary)')
    expect(source).toContain(':deep(.console-table-section__body)')
    expect(source).toContain(':deep(.console-table-section__footer)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(source).not.toMatch(hardcodedColorPattern)
  })
})
