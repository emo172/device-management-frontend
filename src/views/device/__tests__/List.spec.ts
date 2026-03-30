import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserRole } from '@/enums'
import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'
import { useDeviceStore } from '@/stores/modules/device'

const pushMock = vi.fn()
const deviceViewModules = import.meta.glob('../*.vue')

function readDeviceViewSource(fileName: string) {
  return readFileSync(resolve(process.cwd(), `src/views/device/${fileName}`), 'utf-8')
}

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    useRouter: () => ({ push: pushMock }),
    useRoute: () => ({ path: '/devices' }),
  }
})

async function loadListView() {
  const loader = deviceViewModules['../List.vue']

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

const deviceRecord = {
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

describe('device list view', () => {
  beforeEach(() => {
    pushMock.mockReset()
    setActivePinia(createAppPinia())
  })

  it('进入页面会按默认分页拉取列表，并为设备管理员展示新增入口', async () => {
    const { module, error } = await loadListView()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'device-admin@example.com',
      phone: '13800138000',
      realName: '设备管理员',
      role: UserRole.DEVICE_ADMIN,
      userId: 'device-admin-1',
      username: 'device-admin',
    })

    const deviceStore = useDeviceStore()
    deviceStore.list = [deviceRecord]
    deviceStore.total = 1

    const fetchDeviceListSpy = vi
      .spyOn(deviceStore, 'fetchDeviceList')
      .mockResolvedValue({ total: 1, records: [deviceRecord] })

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          ConfirmDialog: { template: '<div></div>' },
          DeviceCard: {
            props: ['device', 'showAdminActions'],
            template:
              '<article class="device-card-stub">{{ device.name }}-{{ showAdminActions ? \"admin\" : \"readonly\" }}-{{ device.imageUrl }}</article>',
          },
          DeviceStatusTag: {
            props: ['status'],
            template: '<span>{{ status }}</span>',
          },
          EmptyState: { template: '<div><slot /></div>' },
          Pagination: { template: '<div class="pagination-stub"></div>' },
          SearchBar: {
            props: ['title', 'description', 'eyebrow', 'label'],
            template:
              '<div class="console-filter-panel search-bar-stub">{{ eyebrow }}|{{ title }}|{{ description }}|{{ label }}</div>',
          },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElIcon: { template: '<i><slot /></i>' },
          ElTable: { template: '<div><slot /></div>' },
          ElTableColumn: { template: '<div><slot :row="{}" /></div>' },
        },
        directives: {
          loading: {
            mounted() {},
            updated() {},
          },
        },
      },
    })

    expect(fetchDeviceListSpy).toHaveBeenCalledWith({ page: 1, size: 10 })
    expect(wrapper.find('.console-page-hero').exists()).toBe(true)
    expect(wrapper.find('.console-filter-panel').exists()).toBe(true)
    expect(wrapper.find('.console-toolbar-shell').exists()).toBe(false)
    expect(wrapper.find('.console-table-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('新增设备')
    expect(wrapper.text()).toContain('设备筛选')
    expect(wrapper.text()).toContain('按分类名称快速缩小当前设备列表范围。')
    expect(wrapper.text()).toContain('设备分类')
    expect(wrapper.text()).toContain('高精度示波器-admin')
    expect(wrapper.text()).toContain('/files/devices/device-1.png')
  })

  it('列表页源码改为消费主题 token，避免 hero 与表格链接在深色下残留浅色渐变和硬编码蓝色', () => {
    const source = readDeviceViewSource('List.vue')

    // 设备列表首屏和表格链接都长期暴露在高频浏览场景，必须直接锁定页面级 token，避免深色下继续透出浅底和固定蓝色。
    expect(source).toContain('var(--app-tone-warning-surface)')
    expect(source).toContain('var(--app-surface-card-strong)')
    expect(source).toContain('var(--app-tone-brand-text)')
    expect(source).toContain('var(--app-shadow-card)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(source).not.toMatch(hardcodedColorPattern)
  })

  it('普通用户访问时不显示新增入口，并以只读模式渲染设备卡片', async () => {
    const { module, error } = await loadListView()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'user@example.com',
      phone: '13800138000',
      realName: '普通用户',
      role: UserRole.USER,
      userId: 'user-1',
      username: 'user',
    })

    const deviceStore = useDeviceStore()
    vi.spyOn(deviceStore, 'fetchDeviceList').mockResolvedValue({
      total: 1,
      records: [deviceRecord],
    })
    deviceStore.list = [deviceRecord]
    deviceStore.total = 1

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          ConfirmDialog: { template: '<div></div>' },
          DeviceCard: {
            props: ['device', 'showAdminActions'],
            template:
              '<article class="device-card-stub">{{ device.name }}-{{ showAdminActions ? \"admin\" : \"readonly\" }}-{{ device.imageUrl }}</article>',
          },
          DeviceStatusTag: {
            props: ['status'],
            template: '<span>{{ status }}</span>',
          },
          EmptyState: { template: '<div><slot /></div>' },
          Pagination: { template: '<div class="pagination-stub"></div>' },
          SearchBar: {
            props: ['title', 'description', 'eyebrow', 'label'],
            template:
              '<div class="console-filter-panel search-bar-stub">{{ eyebrow }}|{{ title }}|{{ description }}|{{ label }}</div>',
          },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElIcon: { template: '<i><slot /></i>' },
          ElTable: { template: '<div><slot /></div>' },
          ElTableColumn: { template: '<div><slot :row="{}" /></div>' },
        },
        directives: {
          loading: {
            mounted() {},
            updated() {},
          },
        },
      },
    })

    expect(wrapper.find('.console-page-hero').exists()).toBe(true)
    expect(wrapper.find('.console-filter-panel').exists()).toBe(true)
    expect(wrapper.find('.console-toolbar-shell').exists()).toBe(false)
    expect(wrapper.find('.console-table-section').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('新增设备')
    expect(wrapper.text()).toContain('设备筛选')
    expect(wrapper.text()).toContain('设备分类')
    expect(wrapper.text()).toContain('高精度示波器-readonly')
    expect(wrapper.text()).toContain('/files/devices/device-1.png')
  })
})
