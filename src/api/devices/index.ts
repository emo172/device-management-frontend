import request from '@/api/request'
import { normalizeReservationTimeRangePayload } from '@/utils'

import type {
  CreateDeviceRequest,
  DeviceDetailResponse,
  DevicePageResponse,
  DeviceResponse,
  GetDeviceListParams,
  SearchReservableDevicesParams,
  UpdateDeviceRequest,
  UpdateDeviceStatusRequest,
} from './types'

export type {
  CreateDeviceRequest,
  DeviceDetailResponse,
  DevicePageResponse,
  DeviceResponse,
  GetDeviceListParams,
  SearchReservableDevicesParams,
  UpdateDeviceRequest,
  UpdateDeviceStatusRequest,
} from './types'

/**
 * 查询设备分页列表。
 * 对应 `GET /api/devices`，分页参数通过 query 发送，避免把筛选条件误放进请求体。
 */
export function getDeviceList(params: GetDeviceListParams) {
  return request.get<DevicePageResponse>('/devices', { params })
}

/**
 * 查询指定时间窗内可预约的设备。
 * 对应 `GET /api/devices/reservable`，创建页必须先拿到合法时间范围，
 * 才允许把关键字、分类树和分页条件一起发给后端真相源。
 */
export function searchReservableDevices(params: SearchReservableDevicesParams) {
  return request.get<DevicePageResponse>('/devices/reservable', {
    params: normalizeReservationTimeRangePayload(params),
  })
}

/**
 * 查询设备详情。
 * 对应 `GET /api/devices/{id}`，详情接口会返回图片与状态日志，供详情页完整展示。
 */
export function getDeviceDetail(deviceId: string) {
  return request.get<DeviceDetailResponse>(`/devices/${deviceId}`)
}

/**
 * 创建设备。
 * 对应 `POST /api/devices`，该入口按后端约束仅供设备管理员使用。
 */
export function createDevice(data: CreateDeviceRequest) {
  return request.post<DeviceResponse, CreateDeviceRequest>('/devices', data)
}

/**
 * 更新设备基础信息。
 * 对应 `PUT /api/devices/{id}`，这里只处理主数据修改，不负责真实状态流转。
 */
export function updateDevice(deviceId: string, data: UpdateDeviceRequest) {
  return request.put<DeviceResponse, UpdateDeviceRequest>(`/devices/${deviceId}`, data)
}

/**
 * 删除设备。
 * 对应 `DELETE /api/devices/{id}`，后端执行软删除，因此仍返回设备业务对象。
 */
export function deleteDevice(deviceId: string) {
  return request.delete<DeviceResponse>(`/devices/${deviceId}`)
}

/**
 * 更新设备状态。
 * 对应 `PUT /api/devices/{id}/status`，必须走独立接口才能保留状态日志与业务校验链路。
 */
export function updateDeviceStatus(deviceId: string, data: UpdateDeviceStatusRequest) {
  return request.put<DeviceResponse, UpdateDeviceStatusRequest>(`/devices/${deviceId}/status`, data)
}

/**
 * 上传设备图片。
 * 对应 `POST /api/devices/{id}/image`，后端固定读取 `file` 字段，因此这里统一组装 `FormData`。
 */
export function uploadDeviceImage(deviceId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  return request.post<DeviceDetailResponse, FormData>(`/devices/${deviceId}/image`, formData)
}
