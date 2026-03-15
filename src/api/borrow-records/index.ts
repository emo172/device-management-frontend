import request from '@/api/request'

import type {
  BorrowRecordListQuery,
  BorrowRecordPageResponse,
  BorrowRecordResponse,
  ConfirmBorrowRequest,
  ConfirmReturnRequest,
} from './types'

export type {
  BorrowRecordListQuery,
  BorrowRecordPageResponse,
  BorrowRecordResponse,
  ConfirmBorrowRequest,
  ConfirmReturnRequest,
} from './types'

/**
 * 查询借还记录列表。
 * 对应 `GET /api/borrow-records`，权限裁决在后端按当前登录角色收敛，前端只透传分页与状态筛选。
 */
export function getBorrowRecordList(params?: BorrowRecordListQuery) {
  return request.get<BorrowRecordPageResponse>('/borrow-records', { params })
}

/**
 * 查询借还记录详情。
 * 对应 `GET /api/borrow-records/{id}`，避免前端错误复用预约详情接口查看正式借还闭环。
 */
export function getBorrowRecordDetail(borrowRecordId: string) {
  return request.get<BorrowRecordResponse>(`/borrow-records/${borrowRecordId}`)
}

/**
 * 确认借出设备。
 * 对应 `POST /api/borrow-records/{reservationId}/confirm-borrow`，请求体可选，适配管理员现场快速借出场景。
 */
export function confirmBorrow(reservationId: string, data?: ConfirmBorrowRequest) {
  return request.post<BorrowRecordResponse, ConfirmBorrowRequest | undefined>(
    `/borrow-records/${reservationId}/confirm-borrow`,
    data,
  )
}

/**
 * 确认设备归还。
 * 对应 `POST /api/borrow-records/{borrowRecordId}/confirm-return`，必须走正式借还记录接口，不能直接改设备状态。
 */
export function confirmReturn(borrowRecordId: string, data?: ConfirmReturnRequest) {
  return request.post<BorrowRecordResponse, ConfirmReturnRequest | undefined>(
    `/borrow-records/${borrowRecordId}/confirm-return`,
    data,
  )
}
