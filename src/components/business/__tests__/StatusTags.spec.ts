import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { DeviceStatus, FreezeStatus } from '@/enums'

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
})
