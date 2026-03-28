import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAppPinia } from '@/stores'
import { useCategoryStore } from '@/stores/modules/category'
import { useDeviceStore } from '@/stores/modules/device'

const pushMock = vi.fn()
const routeState = {
  params: { id: 'device-1' },
}
const deviceViewModules = import.meta.glob('../*.vue')

function readDeviceViewSource(fileName: 'Create.vue' | 'Edit.vue') {
  return readFileSync(resolve(process.cwd(), `src/views/device/${fileName}`), 'utf-8')
}

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    useRouter: () => ({ push: pushMock }),
    useRoute: () => routeState,
  }
})

async function loadView(viewName: 'Create' | 'Edit') {
  const loader = deviceViewModules[`../${viewName}.vue`]

  if (!loader) {
    return {
      module: null,
      error: new Error(`${viewName}.vue is missing`),
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

const detailResponse = {
  id: 'device-1',
  name: '示波器',
  deviceNumber: 'DEV-001',
  categoryId: 'cat-1',
  categoryName: '测试设备',
  status: 'AVAILABLE',
  description: '实验室公共设备',
  location: 'A-201',
  imageUrl: null,
  statusLogs: [],
}

describe('device create/edit pages', () => {
  beforeEach(() => {
    pushMock.mockReset()
    routeState.params.id = 'device-1'
    setActivePinia(createAppPinia())
  })

  it('Create 页面加载分类树，并在表单提交后创建设备并跳转详情', async () => {
    const { module, error } = await loadView('Create')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const categoryStore = useCategoryStore()
    const deviceStore = useDeviceStore()

    vi.spyOn(categoryStore, 'fetchCategoryTree').mockResolvedValue([])
    vi.spyOn(deviceStore, 'createDevice').mockResolvedValue({
      id: 'device-1',
      name: '新设备',
      deviceNumber: 'DEV-002',
      categoryId: 'cat-1',
      categoryName: '测试设备',
      status: 'AVAILABLE',
      description: '新设备',
      location: 'A-202',
    })

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          DeviceForm: {
            emits: ['submit'],
            methods: {
              emitPayload() {
                this.$emit('submit', {
                  name: '新设备',
                  deviceNumber: 'DEV-002',
                  categoryName: '测试设备',
                  location: 'A-202',
                  description: '新设备',
                })
              },
            },
            template: '<button class="submit-create" @click="emitPayload"></button>',
          },
        },
      },
    })

    expect(categoryStore.fetchCategoryTree).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)

    await wrapper.get('.submit-create').trigger('click')

    expect(deviceStore.createDevice).toHaveBeenCalledWith({
      name: '新设备',
      deviceNumber: 'DEV-002',
      categoryName: '测试设备',
      status: 'AVAILABLE',
      location: 'A-202',
      description: '新设备',
    })
    expect(pushMock).toHaveBeenCalledWith('/devices/device-1')
  })

  it('Create 与 Edit 页源码改为消费主题 token，避免表单主区和侧栏在深色下退回默认白底', () => {
    const createSource = readDeviceViewSource('Create.vue')
    const editSource = readDeviceViewSource('Edit.vue')

    // 设备创建与编辑共用同一套表单壳层，必须同时锁定主区和侧栏 token，避免只修一页后另一页在深色下继续发白。
    expect(createSource).toContain('var(--app-tone-brand-surface)')
    expect(createSource).toContain('var(--app-border-soft)')
    expect(createSource).toContain('var(--app-shadow-card)')

    expect(editSource).toContain('var(--app-tone-info-surface)')
    expect(editSource).toContain('var(--app-border-soft)')
    expect(editSource).toContain('var(--app-shadow-card)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(createSource).not.toMatch(hardcodedColorPattern)
    expect(editSource).not.toMatch(hardcodedColorPattern)
  })

  it('Edit 页面回填设备详情，并在提交后更新设备基础信息', async () => {
    const { module, error } = await loadView('Edit')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const categoryStore = useCategoryStore()
    const deviceStore = useDeviceStore()

    vi.spyOn(categoryStore, 'fetchCategoryTree').mockResolvedValue([])
    vi.spyOn(deviceStore, 'fetchDeviceDetail').mockResolvedValue(detailResponse)
    vi.spyOn(deviceStore, 'updateDevice').mockResolvedValue({
      ...detailResponse,
      name: '更新后示波器',
    })

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          DeviceForm: {
            emits: ['submit'],
            methods: {
              emitPayload() {
                this.$emit('submit', {
                  name: '更新后示波器',
                  deviceNumber: 'DEV-001',
                  categoryName: '测试设备',
                  location: 'A-202',
                  description: '更新描述',
                })
              },
            },
            template: '<button class="submit-edit" @click="emitPayload"></button>',
          },
        },
      },
    })

    expect(deviceStore.fetchDeviceDetail).toHaveBeenCalledWith('device-1')
    expect(categoryStore.fetchCategoryTree).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)

    await wrapper.get('.submit-edit').trigger('click')

    expect(deviceStore.updateDevice).toHaveBeenCalledWith('device-1', {
      name: '更新后示波器',
      categoryName: '测试设备',
      location: 'A-202',
      description: '更新描述',
    })
    expect(pushMock).toHaveBeenCalledWith('/devices/device-1')
  })

  it('Edit 页面卸载时会清理当前设备缓存', async () => {
    const { module, error } = await loadView('Edit')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const categoryStore = useCategoryStore()
    const deviceStore = useDeviceStore()

    vi.spyOn(categoryStore, 'fetchCategoryTree').mockResolvedValue([])
    vi.spyOn(deviceStore, 'fetchDeviceDetail').mockResolvedValue(detailResponse)
    const resetCurrentDeviceSpy = vi.spyOn(deviceStore, 'resetCurrentDevice')

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          DeviceForm: {
            template: '<div></div>',
          },
        },
      },
    })

    wrapper.unmount()

    expect(resetCurrentDeviceSpy).toHaveBeenCalledTimes(1)
  })
})
