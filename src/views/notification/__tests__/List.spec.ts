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

const notifications = [
  {
    id: 'notice-1',
    notificationType: 'OVERDUE_WARNING',
    channel: 'IN_APP',
    title: '逾期提醒',
    content: '您有一条设备借用已逾期，请尽快处理。',
    status: 'STATUS_PLACEHOLDER',
    readFlag: 0,
    readAt: null,
    templateVars: '{"deviceName":"热像仪"}',
    retryCount: 0,
    relatedId: 'borrow-1',
    relatedType: 'BORROW_RECORD',
    sentAt: '2026-03-16T08:00:00',
    createdAt: '2026-03-16T08:00:00',
  },
  {
    id: 'notice-2',
    notificationType: 'RESERVATION_REMINDER',
    channel: 'EMAIL',
    title: '预约提醒',
    content: '您预约的设备将在明天 09:00 开始。',
    status: 'STATUS_PLACEHOLDER',
    readFlag: 1,
    readAt: null,
    templateVars: null,
    retryCount: 1,
    relatedId: 'reservation-1',
    relatedType: 'RESERVATION',
    sentAt: '2026-03-15T18:00:00',
    createdAt: '2026-03-15T18:00:00',
  },
]

describe('notification list view', () => {
  beforeEach(() => {
    setActivePinia(createAppPinia())
  })

  it('通知页源码通过 AppSelect 收口类型筛选，并移除页面直连 el-select', () => {
    const source = readNotificationViewSource()

    expect(source).toContain("import AppSelect from '@/components/common/dropdown/AppSelect.vue'")
    expect(source).toContain('<AppSelect')
    expect(source).not.toContain('<el-select')
  })

  it('渲染顶部筛选卡片与单主列通知列表，并允许按通知类型筛选', async () => {
    const { module, error } = await loadNotificationListView()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const notificationStore = useNotificationStore()
    notificationStore.notifications = notifications
    notificationStore.unreadCount = 1

    vi.spyOn(notificationStore, 'fetchNotificationList').mockResolvedValue(notifications)
    vi.spyOn(notificationStore, 'fetchUnreadCount').mockResolvedValue(1)

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          EmptyState: { template: '<div class="empty-state-stub"><slot /></div>' },
          NotificationItem: {
            props: ['notification'],
            emits: ['mark-read'],
            template:
              '<article class="notification-item-stub">' +
              '<span class="notification-item-title">{{ notification.title }}</span>' +
              '<button class="notification-item-read" @click="$emit(\'mark-read\', notification.id)">已读</button>' +
              '</article>',
          },
          ElButton: {
            props: ['disabled'],
            emits: ['click'],
            template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
          ElIcon: { template: '<i><slot /></i>' },
          AppSelect: appSelectStub,
          ElOption: {
            props: ['label', 'value'],
            template: '<option :value="value">{{ label }}</option>',
          },
          ElTag: { template: '<span><slot /></span>' },
        },
        directives: {
          loading: {
            mounted() {},
            updated() {},
          },
        },
      },
    })

    await flushPromises()

    const typeFilter = wrapper.getComponent({ name: 'AppSelect' })
    const typeFilterRoot = wrapper.get('.notification-list-view__select.app-select-stub')

    expect(typeFilter.props('modelValue')).toBe('')
    expect(typeFilter.props('clearable')).toBe(true)
    expect(typeFilter.props('placeholder')).toBe('筛选通知类型')
    expect(typeFilterRoot.attributes('data-placeholder')).toBe('筛选通知类型')
    const heroActions = wrapper.get('.notification-list-view__hero-actions')
    const filterPanel = wrapper.find('.console-filter-panel')
    const listShell = wrapper.find('.notification-list-view__list-shell')

    expect(wrapper.find('.conversation-shell').exists()).toBe(false)
    expect(wrapper.find('.notification-list-view__filters').exists()).toBe(false)
    expect(filterPanel.exists()).toBe(true)
    expect(listShell.exists()).toBe(true)
    expect(listShell.find('.notification-list-view__list-header').exists()).toBe(true)
    expect(wrapper.text()).toContain('通知中心')
    expect(wrapper.text()).toContain('逾期提醒')
    expect(wrapper.text()).toContain('预约提醒')
    expect(wrapper.text()).toContain('1 条未读')
    expect(heroActions.text()).toContain('1 条未读')
    expect(heroActions.text()).not.toContain('刷新列表')
    expect(filterPanel.text()).toContain('刷新列表')
    expect(filterPanel.text()).toContain('全部标记已读')

    await wrapper.get('.app-select-stub__control').setValue('OVERDUE_WARNING')

    expect(wrapper.findAll('.notification-item-stub')).toHaveLength(1)
    const titles = wrapper.findAll('.notification-item-title').map((node) => node.text())
    expect(titles).toEqual(['逾期提醒'])

    await wrapper.get('[data-testid="type-filter-clear"]').trigger('click')

    expect(typeFilter.props('modelValue')).toBe('')
    expect(wrapper.findAll('.notification-item-stub')).toHaveLength(2)
  })

  it('AppSelect 发出 undefined 或 null 时，会把筛选值收敛为空字符串并恢复全量通知列表', async () => {
    const { module, error } = await loadNotificationListView()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const notificationStore = useNotificationStore()
    notificationStore.notifications = notifications
    notificationStore.unreadCount = 1

    vi.spyOn(notificationStore, 'fetchNotificationList').mockResolvedValue(notifications)
    vi.spyOn(notificationStore, 'fetchUnreadCount').mockResolvedValue(1)

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          EmptyState: { template: '<div class="empty-state-stub"><slot /></div>' },
          NotificationItem: {
            props: ['notification'],
            emits: ['mark-read'],
            template:
              '<article class="notification-item-stub">' +
              '<span class="notification-item-title">{{ notification.title }}</span>' +
              '<button class="notification-item-read" @click="$emit(\'mark-read\', notification.id)">已读</button>' +
              '</article>',
          },
          ElButton: {
            props: ['disabled'],
            emits: ['click'],
            template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
          ElIcon: { template: '<i><slot /></i>' },
          AppSelect: appSelectStub,
          ElOption: {
            props: ['label', 'value'],
            template: '<option :value="value">{{ label }}</option>',
          },
          ElTag: { template: '<span><slot /></span>' },
        },
        directives: {
          loading: {
            mounted() {},
            updated() {},
          },
        },
      },
    })

    await flushPromises()

    const typeFilter = wrapper.getComponent({ name: 'AppSelect' })

    await wrapper.get('.app-select-stub__control').setValue('OVERDUE_WARNING')

    expect(typeFilter.props('modelValue')).toBe('OVERDUE_WARNING')
    expect(wrapper.findAll('.notification-item-stub')).toHaveLength(1)

    typeFilter.vm.$emit('update:modelValue', undefined)
    await flushPromises()

    expect(typeFilter.props('modelValue')).toBe('')
    expect(wrapper.findAll('.notification-item-stub')).toHaveLength(2)
    expect(wrapper.findAll('.notification-item-title').map((node) => node.text())).toEqual([
      '逾期提醒',
      '预约提醒',
    ])

    await wrapper.get('.app-select-stub__control').setValue('OVERDUE_WARNING')

    expect(typeFilter.props('modelValue')).toBe('OVERDUE_WARNING')
    expect(wrapper.findAll('.notification-item-stub')).toHaveLength(1)

    typeFilter.vm.$emit('update:modelValue', null)
    await flushPromises()

    expect(typeFilter.props('modelValue')).toBe('')
    expect(wrapper.findAll('.notification-item-stub')).toHaveLength(2)
    expect(wrapper.findAll('.notification-item-title').map((node) => node.text())).toEqual([
      '逾期提醒',
      '预约提醒',
    ])
  })

  it('筛选卡片里的刷新与全部已读动作仍连通通知 store', async () => {
    const { module, error } = await loadNotificationListView()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const notificationStore = useNotificationStore()
    notificationStore.notifications = notifications
    notificationStore.unreadCount = 1

    const fetchNotificationListSpy = vi
      .spyOn(notificationStore, 'fetchNotificationList')
      .mockResolvedValue(notifications)
    const fetchUnreadCountSpy = vi.spyOn(notificationStore, 'fetchUnreadCount').mockResolvedValue(1)
    const markAllAsReadSpy = vi.spyOn(notificationStore, 'markAllAsRead').mockResolvedValue({
      updatedCount: 1,
      readAt: '2026-03-16T09:00:00',
      unreadCount: 0,
    })

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          EmptyState: { template: '<div class="empty-state-stub"><slot /></div>' },
          NotificationItem: {
            props: ['notification'],
            emits: ['mark-read'],
            template:
              '<article class="notification-item-stub">' +
              '<span class="notification-item-title">{{ notification.title }}</span>' +
              '<button class="notification-item-read" @click="$emit(\'mark-read\', notification.id)">已读</button>' +
              '</article>',
          },
          ElButton: {
            props: ['disabled'],
            emits: ['click'],
            template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
          ElIcon: { template: '<i><slot /></i>' },
          AppSelect: appSelectStub,
          ElOption: {
            props: ['label', 'value'],
            template: '<option :value="value">{{ label }}</option>',
          },
          ElTag: { template: '<span><slot /></span>' },
        },
        directives: {
          loading: {
            mounted() {},
            updated() {},
          },
        },
      },
    })

    await flushPromises()

    const filterPanel = wrapper.get('.console-filter-panel')
    const actionButtons = filterPanel.findAll('button')
    const refreshButton = actionButtons.find((node) => node.text().includes('刷新列表'))
    const markAllButton = actionButtons.find((node) => node.text().includes('全部标记已读'))

    expect(refreshButton).toBeTruthy()
    expect(markAllButton).toBeTruthy()

    if (!refreshButton || !markAllButton) {
      return
    }

    expect(fetchNotificationListSpy).toHaveBeenCalledTimes(1)
    expect(fetchUnreadCountSpy).toHaveBeenCalledTimes(1)

    await refreshButton.trigger('click')
    await flushPromises()

    expect(fetchNotificationListSpy).toHaveBeenCalledTimes(2)
    expect(fetchUnreadCountSpy).toHaveBeenCalledTimes(2)

    await markAllButton.trigger('click')

    expect(markAllAsReadSpy).toHaveBeenCalledTimes(1)
  })

  it('通知页源码继续消费主题 token，避免暗色主题下残留硬编码颜色', () => {
    const source = readNotificationViewSource()

    // 新布局的结构迁移由挂载测试守护；源码层只继续兜住 design token 与颜色约束，避免测试对历史类名耦合过深。
    expect(source).toContain('var(--app-surface-card-strong)')
    expect(source).toContain('var(--app-surface-card)')
    expect(source).toContain('var(--app-text-primary)')
    expect(source).toContain('var(--app-text-secondary)')
    expect(source).toContain(':deep(.console-page-hero__title)')
    expect(source).toContain(':deep(.console-page-hero__description)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(source).not.toMatch(hardcodedColorPattern)
  })
})
