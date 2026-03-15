/**
 * 逾期记录查询参数。
 * 对应后端 `OverdueController#list`，处理状态筛选字段名必须是 `processingStatus`，避免沿用旧口径 `status`。
 */
export interface OverdueRecordListQuery {
  page?: number
  size?: number
  processingStatus?: string
}

/**
 * 逾期处理请求 DTO。
 * 对应后端 `ProcessOverdueRequest`，字段名必须与后端保持一致，否则服务层无法识别处理方式与赔偿金额。
 */
export interface ProcessOverdueRequest {
  processingMethod: string
  remark?: string
  compensationAmount?: number | string | null
}

/**
 * 逾期记录响应 DTO。
 * 对应后端 `OverdueRecordResponse`，列表与详情共用该结构，避免维护重复模型。
 */
export interface OverdueRecordResponse {
  id: string
  borrowRecordId: string
  userId: string
  deviceId: string
  overdueHours: number
  overdueDays: number
  processingStatus: string
  processingMethod: string | null
  processingRemark: string | null
  processorId: string | null
  processingTime: string | null
  compensationAmount: number | string | null
  notificationSent: number
  createdAt: string
}

/**
 * 逾期记录分页响应 DTO。
 * 对应后端 `OverdueRecordPageResponse`，请求层已剥离统一响应壳。
 */
export interface OverdueRecordPageResponse {
  total: number
  records: OverdueRecordResponse[]
}
