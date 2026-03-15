import request from '@/api/request'

import type {
  OverdueRecordListQuery,
  OverdueRecordPageResponse,
  OverdueRecordResponse,
  ProcessOverdueRequest,
} from './types'

export type {
  OverdueRecordListQuery,
  OverdueRecordPageResponse,
  OverdueRecordResponse,
  ProcessOverdueRequest,
} from './types'

/**
 * 查询逾期记录列表。
 * 对应 `GET /api/overdue-records`，普通用户与设备管理员共用列表接口，由后端按登录身份决定可见范围。
 */
export function getOverdueRecordList(params?: OverdueRecordListQuery) {
  return request.get<OverdueRecordPageResponse>('/overdue-records', { params })
}

/**
 * 查询逾期记录详情。
 * 对应 `GET /api/overdue-records/{id}`，用于逾期处理前回显正式处理上下文。
 */
export function getOverdueRecordDetail(overdueRecordId: string) {
  return request.get<OverdueRecordResponse>(`/overdue-records/${overdueRecordId}`)
}

/**
 * 处理逾期记录。
 * 对应 `POST /api/overdue-records/{id}/process`，请求体使用后端真实字段 `processingMethod`、`remark`、`compensationAmount`。
 */
export function processOverdueRecord(overdueRecordId: string, data: ProcessOverdueRequest) {
  return request.post<OverdueRecordResponse, ProcessOverdueRequest>(
    `/overdue-records/${overdueRecordId}/process`,
    data,
  )
}
