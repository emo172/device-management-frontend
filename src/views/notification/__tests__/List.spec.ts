import { setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAppPinia } from '@/stores'
import { useNotificationStore } from '@/stores/modules/notification'

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

  it('渲染通知列表摘要，并允许按通知类型筛选', async () => {
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
          ElOption: {
            props: ['label', 'value'],
            template: '<option :value="value">{{ label }}</option>',
          },
          ElSelect: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<select data-testid="type-filter" :value="modelValue || undefined" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
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

    expect(wrapper.find('.conversation-shell').exists()).toBe(true)
    expect(wrapper.find('.notification-list-view__filters').exists()).toBe(true)
    expect(wrapper.text()).toContain('通知中心')
    expect(wrapper.text()).toContain('逾期提醒')
    expect(wrapper.text()).toContain('预约提醒')
    expect(wrapper.text()).toContain('1 条未读')

    await wrapper.get('[data-testid="type-filter"]').setValue('OVERDUE_WARNING')

    expect(wrapper.findAll('.notification-item-stub')).toHaveLength(1)
    const titles = wrapper.findAll('.notification-item-title').map((node) => node.text())
    expect(titles).toEqual(['逾期提醒'])
  })
})
