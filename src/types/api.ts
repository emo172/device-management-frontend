/**
 * 后端统一响应包装。
 * 除了保留全局声明外，这里额外导出模块化类型，方便测试与 API 模块按需显式导入。
 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

/**
 * 通用分页载荷。
 */
export interface PageData<T = unknown> {
  total: number
  records: T[]
}

/**
 * 通用分页查询参数。
 */
export interface PageParams {
  page: number
  size: number
}
