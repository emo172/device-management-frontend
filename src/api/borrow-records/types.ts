/**
 * 借还记录查询参数。
 * 对应后端 `BorrowController#list`，普通用户与管理员共用同一分页口径，状态筛选只能透传后端允许的字符串值。
 */
export interface BorrowRecordListQuery {
  page?: number
  size?: number
  status?: string
}

/**
 * 借用确认请求 DTO。
 * 对应后端 `ConfirmBorrowRequest`，请求体允许为空，便于设备管理员现场直接确认借出。
 */
export interface ConfirmBorrowRequest {
  borrowTime?: string
  borrowCheckStatus?: string
  remark?: string
}

/**
 * 归还确认请求 DTO。
 * 对应后端 `ConfirmReturnRequest`，请求体允许为空，避免把“快速归还确认”错误限制成必填表单。
 */
export interface ConfirmReturnRequest {
  returnTime?: string
  returnCheckStatus?: string
  remark?: string
}

/**
 * 借还记录响应 DTO。
 * 对应后端 `BorrowRecordResponse`，时间字段由后端按 ISO 字符串返回，前端列表与详情共用该模型。
 */
export interface BorrowRecordResponse {
  id: string
  reservationId: string
  deviceId: string
  userId: string
  borrowTime: string | null
  returnTime: string | null
  expectedReturnTime: string | null
  status: string
  borrowCheckStatus: string | null
  returnCheckStatus: string | null
  remark: string | null
  operatorId: string | null
  returnOperatorId: string | null
}

/**
 * 借还记录分页响应 DTO。
 * 对应后端 `BorrowRecordPageResponse`，请求层已经解包业务 `data`，这里直接描述分页体。
 */
export interface BorrowRecordPageResponse {
  total: number
  records: BorrowRecordResponse[]
}
