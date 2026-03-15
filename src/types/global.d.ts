import type {
  ApiResponse as ApiResponseType,
  PageData as PageDataType,
  PageParams as PageParamsType,
} from './api'

declare global {
  /**
   * 后端统一响应包装。
   * 全局类型直接复用模块化定义，避免测试与业务模块出现两套口径漂移。
   */
  type ApiResponse<T = unknown> = ApiResponseType<T>

  /**
   * 列表分页载荷。
   * 后端把 total 与 records 放在 data 内部，因此这里保持同样结构便于复用。
   */
  type PageData<T = unknown> = PageDataType<T>

  /**
   * 分页查询参数。
   * 根据项目约定，page 从 1 开始，size 表示每页条数。
   */
  type PageParams = PageParamsType

  /**
   * Element Plus 标签类型在多个枚举文件中都会复用，统一抽成全局别名避免散落魔法字符串。
   */
  type StatusTagType = '' | 'success' | 'info' | 'warning' | 'danger' | 'primary'
}

export {}
