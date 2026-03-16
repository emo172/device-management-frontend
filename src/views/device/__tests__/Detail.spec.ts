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
  imageUrl: null,
  statusLogs: [{ oldStatus: 'AVAILABLE', newStatus: 'MAINTENANCE', reason: '定期保养' }],
}

describe('device detail view', () => {
  beforeEach(() => {
    setActivePinia(createAppPinia())
    routeState.params.id = 'device-1'
  })

  it('进入详情页会加载设备详情，并为设备管理员展示图片上传入口', async () => {
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
          EmptyState: { template: '<div><slot /></div>' },
          ElButton: { template: '<button><slot /></button>' },
          ElCard: { template: '<section><slot name="header" /><slot /></section>' },
          ElDescriptions: { template: '<div><slot /></div>' },
          ElDescriptionsItem: { template: '<div><slot /></div>' },
          ElIcon: { template: '<i><slot /></i>' },
          ElImage: { template: '<img />' },
          ElTag: { template: '<span><slot /></span>' },
          ElTimeline: { template: '<div><slot /></div>' },
          ElTimelineItem: { template: '<div><slot /></div>' },
          ElUpload: { template: '<div class="detail-upload"><slot /></div>' },
        },
      },
    })

    expect(deviceStore.fetchDeviceDetail).toHaveBeenCalledWith('device-1')
    expect(wrapper.text()).toContain('示波器')
    expect(wrapper.text()).toContain('定期保养')
    expect(wrapper.find('.detail-upload').exists()).toBe(true)
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
          EmptyState: { template: '<div><slot /></div>' },
          ElButton: { template: '<button><slot /></button>' },
          ElCard: { template: '<section><slot name="header" /><slot /></section>' },
          ElDescriptions: { template: '<div><slot /></div>' },
          ElDescriptionsItem: { template: '<div><slot /></div>' },
          ElIcon: { template: '<i><slot /></i>' },
          ElImage: { template: '<img />' },
          ElTag: { template: '<span><slot /></span>' },
          ElTimeline: { template: '<div><slot /></div>' },
          ElTimelineItem: { template: '<div><slot /></div>' },
          ElUpload: { template: '<div class="detail-upload"><slot /></div>' },
        },
      },
    })

    expect(wrapper.find('.detail-upload').exists()).toBe(false)
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
          EmptyState: { template: '<div><slot /></div>' },
          ElButton: { template: '<button><slot /></button>' },
          ElCard: { template: '<section><slot name="header" /><slot /></section>' },
          ElDescriptions: { template: '<div><slot /></div>' },
          ElDescriptionsItem: { template: '<div><slot /></div>' },
          ElIcon: { template: '<i><slot /></i>' },
          ElImage: { template: '<img />' },
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
