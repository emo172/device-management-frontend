import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { getDeviceDetailMock, getDeviceListMock, updateDeviceStatusMock } = vi.hoisted(() => ({
  getDeviceDetailMock: vi.fn(),
  getDeviceListMock: vi.fn(),
  updateDeviceStatusMock: vi.fn(),
}))

vi.mock('@/api/devices', () => ({
  getDeviceDetail: getDeviceDetailMock,
  getDeviceList: getDeviceListMock,
  updateDeviceStatus: updateDeviceStatusMock,
}))

import { useDeviceStore } from '../modules/device'

describe('device store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getDeviceDetailMock.mockReset()
    getDeviceListMock.mockReset()
    updateDeviceStatusMock.mockReset()
  })

  it('loads device list with paging query', async () => {
    getDeviceListMock.mockResolvedValue({
      total: 1,
      records: [
        {
          id: 'device-1',
          name: '示波器',
          deviceNumber: 'DEV-001',
          categoryId: 'cat-1',
          categoryName: '测试设备',
          status: 'AVAILABLE',
          description: '详情',
          location: 'A-101',
        },
      ],
    })

    const store = useDeviceStore()
    await store.fetchDeviceList({ page: 2, size: 20, categoryName: '测试设备' })

    expect(getDeviceListMock).toHaveBeenCalledWith({ page: 2, size: 20, categoryName: '测试设备' })
    expect(store.total).toBe(1)
    expect(store.list[0]?.id).toBe('device-1')
    expect(store.query.page).toBe(2)
  })

  it('loads current device detail and applies status updates back to state', async () => {
    getDeviceDetailMock.mockResolvedValue({
      id: 'device-1',
      name: '示波器',
      deviceNumber: 'DEV-001',
      categoryId: 'cat-1',
      categoryName: '测试设备',
      status: 'AVAILABLE',
      description: '详情',
      location: 'A-101',
      imageUrl: null,
      statusLogs: [],
    })
    updateDeviceStatusMock.mockResolvedValue({
      id: 'device-1',
      name: '示波器',
      deviceNumber: 'DEV-001',
      categoryId: 'cat-1',
      categoryName: '测试设备',
      status: 'MAINTENANCE',
      description: '详情',
      location: 'A-101',
    })

    const store = useDeviceStore()
    store.list = [
      {
        id: 'device-1',
        name: '示波器',
        deviceNumber: 'DEV-001',
        categoryId: 'cat-1',
        categoryName: '测试设备',
        status: 'AVAILABLE',
        description: '详情',
        location: 'A-101',
      },
    ]

    await store.fetchDeviceDetail('device-1')
    await store.updateStatus('device-1', { status: 'MAINTENANCE', reason: '维护中' })

    expect(store.currentDevice?.status).toBe('MAINTENANCE')
    expect(store.list[0]?.status).toBe('MAINTENANCE')

    store.resetCurrentDevice()
    expect(store.currentDevice).toBeNull()
  })
})
