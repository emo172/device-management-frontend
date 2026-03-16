import { mount } from '@vue/test-utils'
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
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElTag: { template: '<span><slot /></span>' },
        },
      },
    })

    expect(wrapper.text()).toContain('签到')
    expect(wrapper.text()).not.toContain('取消预约')

    await wrapper.get('.reservation-card__check-in').trigger('click')
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
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElTag: { template: '<span><slot /></span>' },
        },
      },
    })

    expect(wrapper.text()).toContain('取消预约')
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
})
