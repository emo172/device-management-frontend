import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserRole } from '@/enums'
import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'
import { useDeviceStore } from '@/stores/modules/device'

const routeState = {
  params: { id: 'device-1' },
}
const deviceViewModules = import.meta.glob('../*.vue')

function readDeviceViewSource(fileName: 'Detail.vue') {
  return readFileSync(resolve(process.cwd(), `src/views/device/${fileName}`), 'utf-8')
}

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    useRoute: () => routeState,
    useRouter: () => ({ push: vi.fn() }),
  }
})

async function loadDetailView() {
  const loader = deviceViewModules['../Detail.vue']

  if (!loader) {
    return {
      module: null,
      error: new Error('Detail.vue is missing'),
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
  imageUrl: '/files/devices/device-1.png',
  statusLogs: [{ oldStatus: 'AVAILABLE', newStatus: 'MAINTENANCE', reason: '定期保养' }],
}

describe('device detail view', () => {
  beforeEach(() => {
    setActivePinia(createAppPinia())
    routeState.params.id = 'device-1'
  })

  it('进入详情页会加载设备详情，并继续使用 /files 路径展示图片', async () => {
    const { module, error } = await loadDetailView()

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
    deviceStore.currentDevice = detailResponse
    vi.spyOn(deviceStore, 'fetchDeviceDetail').mockResolvedValue(detailResponse)

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          DeviceStatusTag: { template: '<span><slot /></span>' },
          EmptyState: {
            props: ['title', 'description'],
            template: '<div>{{ title }}{{ description }}</div>',
          },
          ElButton: { template: '<button><slot /></button>' },
          ElCard: { template: '<section><slot name="header" /><slot /></section>' },
          ElDescriptions: { template: '<div><slot /></div>' },
          ElDescriptionsItem: { template: '<div><slot /></div>' },
          ElIcon: { template: '<i><slot /></i>' },
          ElImage: {
            props: ['src'],
            template: '<img class="detail-image" :src="src" />',
          },
          ElTag: { template: '<span><slot /></span>' },
          ElTimeline: { template: '<div><slot /></div>' },
          ElTimelineItem: { template: '<div><slot /></div>' },
          ElUpload: { template: '<div class="detail-upload"><slot /></div>' },
        },
      },
    })

    expect(deviceStore.fetchDeviceDetail).toHaveBeenCalledWith('device-1')
    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('示波器')
    expect(wrapper.text()).toContain('可用 -> 维修中')
    expect(wrapper.text()).toContain('定期保养')
    expect(wrapper.find('.detail-upload').exists()).toBe(true)
    expect(wrapper.get('.detail-image').attributes('src')).toBe('/files/devices/device-1.png')
  })

  it('无效设备 id 时不发详情请求，并回退到空态提示', async () => {
    routeState.params.id = ''

    const { module, error } = await loadDetailView()

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
    deviceStore.currentDevice = null
    const fetchDeviceDetailSpy = vi
      .spyOn(deviceStore, 'fetchDeviceDetail')
      .mockResolvedValue(detailResponse)

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          DeviceStatusTag: { template: '<span><slot /></span>' },
          EmptyState: {
            props: ['title', 'description'],
            template: '<div class="detail-empty-state">{{ title }}{{ description }}</div>',
          },
          ElButton: { template: '<button><slot /></button>' },
          ElCard: { template: '<section><slot name="header" /><slot /></section>' },
          ElDescriptions: { template: '<div><slot /></div>' },
          ElDescriptionsItem: { template: '<div><slot /></div>' },
          ElIcon: { template: '<i><slot /></i>' },
          ElImage: {
            props: ['src'],
            template: '<img class="detail-image" :src="src" />',
          },
          ElTag: { template: '<span><slot /></span>' },
          ElTimeline: { template: '<div><slot /></div>' },
          ElTimelineItem: { template: '<div><slot /></div>' },
          ElUpload: { template: '<div class="detail-upload"><slot /></div>' },
        },
      },
    })

    expect(fetchDeviceDetailSpy).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('暂无设备详情')
  })

  it('详情页源码改为消费主题 token，避免描述卡片、时间线和图片侧栏在深色下出现灰白块', () => {
    const source = readDeviceViewSource('Detail.vue')

    // 详情页同时承载描述区、轨迹区和图片侧栏，任一块残留默认白底都会让深色主题出现明显断层。
    expect(source).toContain('var(--app-surface-card)')
    expect(source).toContain('var(--app-surface-card-strong)')
    expect(source).toContain('var(--app-border-soft)')
    expect(source).toContain('var(--app-shadow-card)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(source).not.toMatch(hardcodedColorPattern)
  })

  it('普通用户查看详情时不显示图片上传入口', async () => {
    const { module, error } = await loadDetailView()

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
    deviceStore.currentDevice = detailResponse
    vi.spyOn(deviceStore, 'fetchDeviceDetail').mockResolvedValue(detailResponse)

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          DeviceStatusTag: { template: '<span><slot /></span>' },
          EmptyState: {
            props: ['title', 'description'],
            template: '<div>{{ title }}{{ description }}</div>',
          },
          ElButton: { template: '<button><slot /></button>' },
          ElCard: { template: '<section><slot name="header" /><slot /></section>' },
          ElDescriptions: { template: '<div><slot /></div>' },
          ElDescriptionsItem: { template: '<div><slot /></div>' },
          ElIcon: { template: '<i><slot /></i>' },
          ElImage: {
            props: ['src'],
            template: '<img class="detail-image" :src="src" />',
          },
          ElTag: { template: '<span><slot /></span>' },
          ElTimeline: { template: '<div><slot /></div>' },
          ElTimelineItem: { template: '<div><slot /></div>' },
          ElUpload: { template: '<div class="detail-upload"><slot /></div>' },
        },
      },
    })

    expect(wrapper.find('.detail-upload').exists()).toBe(false)
    expect(wrapper.get('.detail-image').attributes('src')).toBe('/files/devices/device-1.png')
  })

  it('离开详情页时会清理当前设备缓存，避免下一台设备短暂闪现旧数据', async () => {
    const { module, error } = await loadDetailView()

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
    deviceStore.currentDevice = detailResponse
    vi.spyOn(deviceStore, 'fetchDeviceDetail').mockResolvedValue(detailResponse)
    const resetCurrentDeviceSpy = vi.spyOn(deviceStore, 'resetCurrentDevice')

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          DeviceStatusTag: { template: '<span><slot /></span>' },
          EmptyState: {
            props: ['title', 'description'],
            template: '<div>{{ title }}{{ description }}</div>',
          },
          ElButton: { template: '<button><slot /></button>' },
          ElCard: { template: '<section><slot name="header" /><slot /></section>' },
          ElDescriptions: { template: '<div><slot /></div>' },
          ElDescriptionsItem: { template: '<div><slot /></div>' },
          ElIcon: { template: '<i><slot /></i>' },
          ElImage: {
            props: ['src'],
            template: '<img class="detail-image" :src="src" />',
          },
          ElTag: { template: '<span><slot /></span>' },
          ElTimeline: { template: '<div><slot /></div>' },
          ElTimelineItem: { template: '<div><slot /></div>' },
          ElUpload: { template: '<div class="detail-upload"><slot /></div>' },
        },
      },
    })

    wrapper.unmount()

    expect(resetCurrentDeviceSpy).toHaveBeenCalledTimes(1)
  })
})
