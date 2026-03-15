import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getMock, postMock, putMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
  deleteMock: vi.fn(),
}))

vi.mock('@/api/request', () => ({
  default: {
    get: getMock,
    post: postMock,
    put: putMock,
    delete: deleteMock,
  },
}))

import {
  createDevice,
  deleteDevice,
  getDeviceDetail,
  getDeviceList,
  updateDevice,
  updateDeviceStatus,
  uploadDeviceImage,
} from '../devices'

describe('devices api', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
    putMock.mockReset()
    deleteMock.mockReset()
  })

  it('requests device list with pagination and category filter', async () => {
    const response = { total: 1, records: [{ id: 'device-1' }] }
    getMock.mockResolvedValue(response)

    const params = { page: 2, size: 20, categoryName: '传感器' }
    const result = await getDeviceList(params)

    expect(getMock).toHaveBeenCalledWith('/devices', { params })
    expect(result).toBe(response)
  })

  it('reads device detail by id', async () => {
    const response = { id: 'device-1', imageUrl: '/files/device.png' }
    getMock.mockResolvedValue(response)

    await expect(getDeviceDetail('device-1')).resolves.toBe(response)
    expect(getMock).toHaveBeenCalledWith('/devices/device-1')
  })

  it('uses create update delete and status endpoints from backend contract', async () => {
    postMock.mockResolvedValueOnce({ id: 'device-1' })
    putMock.mockResolvedValueOnce({ id: 'device-1', name: '更新后设备' })
    putMock.mockResolvedValueOnce({ id: 'device-1', status: 'MAINTENANCE' })
    deleteMock.mockResolvedValue({ id: 'device-1', status: 'DELETED' })

    const createPayload = {
      name: '示波器',
      deviceNumber: 'DEV-001',
      categoryName: '仪器',
      status: 'AVAILABLE',
      description: '实验室设备',
      location: 'A-101',
    }
    const updatePayload = {
      name: '更新后设备',
      categoryName: '仪器',
      status: 'AVAILABLE',
      description: '更新描述',
      location: 'A-102',
    }
    const statusPayload = { status: 'MAINTENANCE', reason: '定期保养' }

    await createDevice(createPayload)
    await updateDevice('device-1', updatePayload)
    await updateDeviceStatus('device-1', statusPayload)
    await deleteDevice('device-1')

    expect(postMock).toHaveBeenCalledWith('/devices', createPayload)
    expect(putMock).toHaveBeenNthCalledWith(1, '/devices/device-1', updatePayload)
    expect(putMock).toHaveBeenNthCalledWith(2, '/devices/device-1/status', statusPayload)
    expect(deleteMock).toHaveBeenCalledWith('/devices/device-1')
  })

  it('uploads device image with file field via form data', async () => {
    const response = { id: 'device-1', imageUrl: '/files/device-1.png' }
    postMock.mockResolvedValue(response)

    const file = new File(['binary'], 'device.png', { type: 'image/png' })
    const result = await uploadDeviceImage('device-1', file)

    expect(postMock).toHaveBeenCalledTimes(1)
    const [url, formData] = postMock.mock.calls[0] as [string, FormData]

    expect(url).toBe('/devices/device-1/image')
    expect(formData).toBeInstanceOf(FormData)
    expect((formData as FormData).get('file')).toBe(file)
    expect(result).toBe(response)
  })
})
