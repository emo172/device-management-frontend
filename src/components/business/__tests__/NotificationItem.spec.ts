import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const businessComponentModules = import.meta.glob('../*.vue')

async function loadComponent(componentName: string) {
  const loader = businessComponentModules[`../${componentName}.vue`]

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

function readComponentSource(componentName: string) {
  return readFileSync(
    resolve(process.cwd(), `src/components/business/${componentName}.vue`),
    'utf-8',
  )
}

const inAppNotification = {
  id: 'notice-1',
  notificationType: 'OVERDUE_WARNING',
  channel: 'IN_APP',
  title: '站内信提醒',
  content: '您有一条需要立即处理的站内信提醒。',
  status: 'STATUS_PLACEHOLDER',
  readFlag: 0,
  readAt: null,
  templateVars: null,
  retryCount: 0,
  relatedId: 'borrow-1',
  relatedType: 'BORROW_RECORD',
  sentAt: '2026-03-16T08:00:00',
  createdAt: '2026-03-16T08:00:00',
}

const emailNotification = {
  ...inAppNotification,
  id: 'notice-2',
  channel: 'EMAIL',
  title: '邮件提醒',
}

const readInAppNotification = {
  ...inAppNotification,
  id: 'notice-3',
  readFlag: 1,
  readAt: '2026-03-16T08:30:00',
  title: '已读站内信提醒',
}

describe('NotificationItem', () => {
  it('通知列表项外壳与图标底色只消费 tone token，不保留浅色硬编码背景', () => {
    const source = readComponentSource('NotificationItem')

    expect(source).toContain('var(--app-tone-brand-surface)')
    expect(source).toContain('var(--app-tone-info-surface)')
    expect(source).toContain('var(--app-tone-brand-text-strong)')
    expect(source).not.toContain('rgba(255, 255, 255, 0.94)')
    expect(source).not.toContain('rgba(248, 250, 252, 0.96)')
    expect(source).not.toContain('#0f766e')
  })

  it('shows read status only for in-app notifications and uses neutral copy for other channels', async () => {
    const { module, error } = await loadComponent('NotificationItem')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const inAppWrapper = mount(module.default, {
      props: {
        notification: inAppNotification,
      },
      global: {
        stubs: {
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElIcon: { template: '<i><slot /></i>' },
          ElTag: { template: '<span class="tag-stub"><slot /></span>' },
        },
      },
    })

    expect(inAppWrapper.find('.notification-item__surface').exists()).toBe(true)
    expect(inAppWrapper.text()).toContain('未读')
    expect(inAppWrapper.text()).toContain('标记已读')

    const emailWrapper = mount(module.default, {
      props: {
        notification: emailNotification,
      },
      global: {
        stubs: {
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElIcon: { template: '<i><slot /></i>' },
          ElTag: { template: '<span class="tag-stub"><slot /></span>' },
        },
      },
    })

    expect(emailWrapper.text()).toContain('无已读回执')
    expect(emailWrapper.text()).not.toContain('未读')
    expect(emailWrapper.text()).not.toContain('标记已读')
  })

  it('shows read timestamp for read in-app notifications', async () => {
    const { module, error } = await loadComponent('NotificationItem')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        notification: readInAppNotification,
      },
      global: {
        stubs: {
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElIcon: { template: '<i><slot /></i>' },
          ElTag: { template: '<span class="tag-stub"><slot /></span>' },
        },
      },
    })

    expect(wrapper.text()).toContain('已读')
    expect(wrapper.text()).toContain('已读时间')
    expect(wrapper.text()).toContain('2026-03-16 08:30:00')
  })
})
