import type { PageParams } from '@/types/api'

/**
 * 设备查询参数。
 * 后端当前仅支持按分类名称筛选，因此前端沿用 `categoryName`，不要误发旧的分类 ID 条件。
 */
export interface GetDeviceListParams extends PageParams {
  categoryName?: string
}

/**
 * 可预约设备搜索参数。
 * 对应后端 `GET /api/devices/reservable`，创建页必须显式带上时间窗，
 * 再按真实契约传递关键字、分类 ID、是否包含后代节点与分页信息。
 */
export interface SearchReservableDevicesParams extends PageParams {
  startTime: string
  endTime: string
  q?: string
  categoryId?: string
  includeDescendants?: boolean
}

/**
 * 创建设备请求。
 * 对应后端 `CreateDeviceRequest`，创建时直接提交分类名称而不是分类 ID。
 */
export interface CreateDeviceRequest {
  name: string
  deviceNumber: string
  categoryName: string
  status: string
  description: string
  location: string
}

/**
 * 更新设备请求。
 * 更新页只提交基础档案字段；真实状态流转仍需走独立状态接口，避免绕过状态日志。
 */
export interface UpdateDeviceRequest {
  name: string
  categoryName: string
  description: string
  location: string
}

/**
 * 更新设备状态请求。
 * 对应后端 `UpdateDeviceStatusRequest`，要求显式提交变更原因，便于状态日志留痕。
 */
export interface UpdateDeviceStatusRequest {
  status: string
  reason: string
}

/**
 * 设备列表项。
 * 对应后端 `DeviceResponse`。
 * 后端现在也会把公开图片地址带回列表结果，因此这里把 `imageUrl` 保持为可选字段，
 * 兼容仍未补齐该字段的旧测试桩，同时允许列表卡片继续直接消费 `/files/**` 路径。
 */
export interface DeviceResponse {
  id: string
  name: string
  deviceNumber: string
  categoryId: string
  categoryName: string
  status: string
  description: string
  location: string
  imageUrl?: string | null
}

/**
 * 设备状态日志。
 * 对应后端 `DeviceStatusLogResponse`，用于详情页展示状态变更轨迹。
 */
export interface DeviceStatusLogResponse {
  oldStatus: string
  newStatus: string
  reason: string
}

/**
 * 设备详情。
 * 对应后端 `DeviceDetailResponse`，额外包含图片地址与状态日志。
 */
export interface DeviceDetailResponse extends DeviceResponse {
  imageUrl: string | null
  statusLogs: DeviceStatusLogResponse[]
}

/**
 * 设备分页结果。
 * 请求层已经解包响应壳，这里直接保留后端分页 `total + records` 结构。
 */
export interface DevicePageResponse {
  total: number
  records: DeviceResponse[]
}
