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

const device = {
  id: 'device-1',
  name: '高精度示波器',
  deviceNumber: 'DEV-001',
  categoryId: 'cat-1',
  categoryName: '测试设备',
  imageUrl: '/files/devices/device-1.png',
  status: 'AVAILABLE',
  description: '实验室公共设备',
  location: 'A-201',
}

describe('DeviceCard', () => {
  it('设备卡片只消费 warning tone 语义，不保留浅色面板硬编码', () => {
    const source = readComponentSource('DeviceCard')

    expect(source).toContain('var(--app-tone-warning-surface)')
    expect(source).toContain('var(--app-tone-warning-text)')
    expect(source).toContain('var(--app-surface-card)')
    expect(source).not.toContain('rgba(255, 255, 255, 0.96)')
    expect(source).not.toContain('rgba(248, 250, 252, 0.92)')
    expect(source).not.toContain('#b45309')
  })

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
          ElImage: {
            props: ['src'],
            template: '<img class="device-card__image" :src="src" />',
          },
          ElIcon: { template: '<i class="el-icon"><slot /></i>' },
          ElButton: {
            emits: ['click'],
            template:
              '<button v-bind="$attrs" :data-button-type="$attrs.type" @click="$emit(\'click\')"><slot /></button>',
          },
          ElTag: {
            template: '<span><slot /></span>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('高精度示波器')
    expect(wrapper.find('.device-card__surface').exists()).toBe(true)
    expect(wrapper.text()).toContain('DEV-001')
    expect(wrapper.text()).toContain('测试设备')
    expect(wrapper.text()).toContain('A-201')
    expect(wrapper.get('.device-card__image').attributes('src')).toBe('/files/devices/device-1.png')

    const detailButton = wrapper.get('.device-card__detail')
    expect(detailButton.classes()).toContain('app-detail-action')
    expect(detailButton.attributes('data-button-type')).toBe('primary')
    expect(detailButton.find('.el-icon').exists()).toBe(true)
    expect(detailButton.find('svg').exists()).toBe(true)
    expect(wrapper.get('.device-card__edit').classes()).not.toContain('app-detail-action')
    expect(wrapper.get('.device-card__status').classes()).not.toContain('app-detail-action')
    expect(wrapper.get('.device-card__delete').classes()).not.toContain('app-detail-action')

    await detailButton.trigger('click')
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
          ElImage: {
            props: ['src'],
            template: '<img class="device-card__image" :src="src" />',
          },
          ElIcon: { template: '<i class="el-icon"><slot /></i>' },
          ElButton: {
            emits: ['click'],
            template:
              '<button v-bind="$attrs" :data-button-type="$attrs.type" @click="$emit(\'click\')"><slot /></button>',
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
    expect(wrapper.get('.device-card__image').attributes('src')).toBe('/files/devices/device-1.png')
  })
})
