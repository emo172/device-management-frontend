import { mount } from '@vue/test-utils'
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

const device = {
  id: 'device-1',
  name: '高精度示波器',
  deviceNumber: 'DEV-001',
  categoryId: 'cat-1',
  categoryName: '测试设备',
  status: 'AVAILABLE',
  description: '实验室公共设备',
  location: 'A-201',
}

describe('DeviceCard', () => {
  it('展示设备摘要信息，并在管理员模式下暴露管理动作', async () => {
    const { module, error } = await loadComponent('DeviceCard')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        device,
        showAdminActions: true,
      },
      global: {
        stubs: {
          DeviceStatusTag: {
            props: ['status'],
            template: '<span class="device-status">{{ status }}</span>',
          },
          ElIcon: { template: '<i><slot /></i>' },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElTag: {
            template: '<span><slot /></span>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('高精度示波器')
    expect(wrapper.text()).toContain('DEV-001')
    expect(wrapper.text()).toContain('测试设备')
    expect(wrapper.text()).toContain('A-201')

    await wrapper.get('.device-card__detail').trigger('click')
    await wrapper.get('.device-card__edit').trigger('click')
    await wrapper.get('.device-card__status').trigger('click')
    await wrapper.get('.device-card__delete').trigger('click')

    expect(wrapper.emitted('detail')).toEqual([['device-1']])
    expect(wrapper.emitted('edit')).toEqual([['device-1']])
    expect(wrapper.emitted('status')).toEqual([['device-1']])
    expect(wrapper.emitted('delete')).toEqual([['device-1']])
  })

  it('普通只读模式仅保留详情动作', async () => {
    const { module, error } = await loadComponent('DeviceCard')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        device,
        showAdminActions: false,
      },
      global: {
        stubs: {
          DeviceStatusTag: {
            props: ['status'],
            template: '<span>{{ status }}</span>',
          },
          ElIcon: { template: '<i><slot /></i>' },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElTag: {
            template: '<span><slot /></span>',
          },
        },
      },
    })

    expect(wrapper.find('.device-card__edit').exists()).toBe(false)
    expect(wrapper.find('.device-card__status').exists()).toBe(false)
    expect(wrapper.find('.device-card__delete').exists()).toBe(false)
    expect(wrapper.find('.device-card__detail').exists()).toBe(true)
  })
})
