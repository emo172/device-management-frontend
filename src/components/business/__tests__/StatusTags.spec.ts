import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import {
  BorrowStatus,
  DeviceStatus,
  FreezeStatus,
  OverdueHandleType,
  OverdueProcessingStatus,
} from '@/enums'

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

describe('status tags', () => {
  it('DeviceStatusTag 渲染设备状态中文与标签类型', async () => {
    const { module, error } = await loadComponent('DeviceStatusTag')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        status: DeviceStatus.MAINTENANCE,
      },
      global: {
        stubs: {
          ElTag: {
            props: ['type'],
            template: '<span class="device-status" :data-type="type"><slot /></span>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('维修中')
    expect(wrapper.get('.device-status').attributes('data-type')).toBe('info')
  })

  it('FreezeStatusTag 渲染账户冻结状态中文与标签类型', async () => {
    const { module, error } = await loadComponent('FreezeStatusTag')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        status: FreezeStatus.FROZEN,
      },
      global: {
        stubs: {
          ElTag: {
            props: ['type'],
            template: '<span class="freeze-status" :data-type="type"><slot /></span>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('冻结')
    expect(wrapper.get('.freeze-status').attributes('data-type')).toBe('danger')
  })

  it('BorrowStatusTag 渲染借还状态中文与标签类型', async () => {
    const { module, error } = await loadComponent('BorrowStatusTag')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        status: BorrowStatus.BORROWED,
      },
      global: {
        stubs: {
          ElTag: {
            props: ['type'],
            template: '<span class="borrow-status" :data-type="type"><slot /></span>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('借用中')
    expect(wrapper.get('.borrow-status').attributes('data-type')).toBe('warning')
  })

  it('OverdueProcessingStatusTag 渲染逾期处理状态中文与标签类型', async () => {
    const { module, error } = await loadComponent('OverdueProcessingStatusTag')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        status: OverdueProcessingStatus.PENDING,
      },
      global: {
        stubs: {
          ElTag: {
            props: ['type'],
            template: '<span class="overdue-status" :data-type="type"><slot /></span>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('待处理')
    expect(wrapper.get('.overdue-status').attributes('data-type')).toBe('warning')
  })

  it('OverdueHandleTypeTag 渲染逾期处理方式中文与标签类型', async () => {
    const { module, error } = await loadComponent('OverdueHandleTypeTag')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        type: OverdueHandleType.COMPENSATION,
      },
      global: {
        stubs: {
          ElTag: {
            props: ['type'],
            template: '<span class="handle-type" :data-type="type"><slot /></span>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('赔偿')
    expect(wrapper.get('.handle-type').attributes('data-type')).toBe('danger')
  })
})
