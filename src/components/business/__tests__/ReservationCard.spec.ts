import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

function createReservationRecord(overrides?: Record<string, unknown>) {
  return {
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
    ...overrides,
  }
}

describe('ReservationCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('预约卡片只消费 brand 和 warning 语义 token，不保留浅色径向高亮硬编码', () => {
    const source = readComponentSource('ReservationCard')

    expect(source).toContain('var(--app-tone-brand-surface)')
    expect(source).toContain('var(--app-tone-brand-text)')
    expect(source).toContain('var(--app-tone-warning-text)')
    expect(source).not.toContain('rgba(255, 255, 255, 0.96)')
    expect(source).not.toContain('rgba(14, 165, 233, 0.12)')
    expect(source).not.toContain('#0369a1')
  })

  it('普通用户在签到窗口内看到签到动作', async () => {
    vi.setSystemTime(new Date('2026-03-18T08:45:00'))

    const { module, error } = await loadComponent('ReservationCard')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        reservation: createReservationRecord(),
        allowUserActions: true,
      },
      global: {
        stubs: {
          CheckInStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          ReservationStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          ElIcon: { template: '<i class="el-icon"><slot /></i>' },
          ElButton: {
            emits: ['click'],
            template:
              '<button v-bind="$attrs" :data-button-type="$attrs.type" @click="$emit(\'click\')"><slot /></button>',
          },
          ElTag: { template: '<span><slot /></span>' },
        },
      },
    })

    expect(wrapper.text()).toContain('签到')
    expect(wrapper.text()).not.toContain('取消预约')
    const detailButton = wrapper.get('.reservation-card__detail')
    expect(detailButton.classes()).toContain('app-detail-action')
    expect(detailButton.attributes('data-button-type')).toBe('primary')
    expect(detailButton.find('.el-icon').exists()).toBe(true)
    expect(detailButton.find('svg').exists()).toBe(true)
    expect(wrapper.get('.reservation-card__check-in').classes()).not.toContain('app-detail-action')

    await detailButton.trigger('click')
    await wrapper.get('.reservation-card__check-in').trigger('click')
    expect(wrapper.emitted('detail')).toEqual([['reservation-1']])
    expect(wrapper.emitted('check-in')).toEqual([['reservation-1']])
  })

  it('普通用户在开始前超过 24 小时看到取消动作，并在 24 小时内改为提示', async () => {
    const { module, error } = await loadComponent('ReservationCard')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    vi.setSystemTime(new Date('2026-03-16T08:00:00'))

    const wrapper = mount(module.default, {
      props: {
        reservation: createReservationRecord({ startTime: '2026-03-18T09:00:00' }),
        allowUserActions: true,
      },
      global: {
        stubs: {
          CheckInStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          ReservationStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          ElIcon: { template: '<i class="el-icon"><slot /></i>' },
          ElButton: {
            emits: ['click'],
            template:
              '<button v-bind="$attrs" :data-button-type="$attrs.type" @click="$emit(\'click\')"><slot /></button>',
          },
          ElTag: { template: '<span><slot /></span>' },
        },
      },
    })

    expect(wrapper.text()).toContain('取消预约')
    const detailButton = wrapper.get('.reservation-card__detail')
    expect(detailButton.classes()).toContain('app-detail-action')
    expect(detailButton.attributes('data-button-type')).toBe('primary')
    expect(detailButton.find('.el-icon').exists()).toBe(true)
    expect(detailButton.find('svg').exists()).toBe(true)
    expect(wrapper.get('.reservation-card__cancel').classes()).not.toContain('app-detail-action')

    await wrapper.get('.reservation-card__cancel').trigger('click')
    expect(wrapper.emitted('cancel')).toEqual([['reservation-1']])

    vi.setSystemTime(new Date('2026-03-17T12:00:00'))
    await (
      wrapper as InstanceType<typeof Object> & {
        setProps: (props: Record<string, unknown>) => Promise<void>
      }
    ).setProps({
      reservation: createReservationRecord({ startTime: '2026-03-18T09:00:00' }),
    })

    expect(wrapper.text()).toContain('24 小时内请联系管理员处理')
    expect(wrapper.find('.reservation-card__cancel').exists()).toBe(false)
  })

  it('待审批与待人工处理预约在活动取消窗口内仍显示取消动作与联系管理员提示', async () => {
    const { module, error } = await loadComponent('ReservationCard')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const activeCancelableStatuses = [
      'PENDING_DEVICE_APPROVAL',
      'PENDING_SYSTEM_APPROVAL',
      'PENDING_MANUAL',
    ]

    vi.setSystemTime(new Date('2026-03-16T08:00:00'))

    const wrapper = mount(module.default, {
      props: {
        reservation: createReservationRecord({
          status: activeCancelableStatuses[0],
          startTime: '2026-03-18T09:00:00',
        }),
        allowUserActions: true,
      },
      global: {
        stubs: {
          CheckInStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          ReservationStatusTag: { props: ['status'], template: '<span>{{ status }}</span>' },
          ElIcon: { template: '<i class="el-icon"><slot /></i>' },
          ElButton: {
            emits: ['click'],
            template:
              '<button v-bind="$attrs" :data-button-type="$attrs.type" @click="$emit(\'click\')"><slot /></button>',
          },
          ElTag: { template: '<span><slot /></span>' },
        },
      },
    })
    const setReservationCardProps = async (props: Record<string, unknown>) =>
      await (
        wrapper as InstanceType<typeof Object> & {
          setProps: (nextProps: Record<string, unknown>) => Promise<void>
        }
      ).setProps(props)

    for (const status of activeCancelableStatuses) {
      await setReservationCardProps({
        reservation: createReservationRecord({
          status,
          startTime: '2026-03-18T09:00:00',
        }),
      })

      expect(wrapper.find('.reservation-card__cancel').exists()).toBe(true)
      expect(wrapper.text()).not.toContain('24 小时内请联系管理员处理')

      vi.setSystemTime(new Date('2026-03-17T12:00:00'))
      await setReservationCardProps({
        reservation: createReservationRecord({
          status,
          startTime: '2026-03-18T09:00:00',
        }),
      })

      expect(wrapper.find('.reservation-card__cancel').exists()).toBe(false)
      expect(wrapper.text()).toContain('24 小时内请联系管理员处理')

      vi.setSystemTime(new Date('2026-03-16T08:00:00'))
    }
  })

  it('预约卡片对超长设备号和设备名开启收缩与断行，避免把父级三列网格整体撑宽', () => {
    const source = readComponentSource('ReservationCard')

    expect(source).toMatch(/\.reservation-card\s*\{[\s\S]*?min-width:\s*0;/)
    expect(source).toMatch(/\.reservation-card__top\s*>\s*div\s*\{[\s\S]*?min-width:\s*0;/)
    expect(source).toMatch(
      /\.reservation-card__eyebrow,[\s\S]*?\.reservation-card__title,[\s\S]*?overflow-wrap:\s*anywhere;/,
    )
  })
})
