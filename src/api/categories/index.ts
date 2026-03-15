import request from '@/api/request'

import type { CategoryTreeResponse, CreateCategoryRequest } from './types'

export type { ApprovalMode, CategoryTreeResponse, CreateCategoryRequest } from './types'

/**
 * 创建设备分类。
 * 对应 `POST /api/device-categories`，分类默认审批模式在创建阶段确定，避免后续设备审批链混乱。
 */
export function createCategory(data: CreateCategoryRequest) {
  return request.post<CategoryTreeResponse, CreateCategoryRequest>('/device-categories', data)
}

/**
 * 查询分类树。
 * 对应 `GET /api/device-categories/tree`，页面构建树选择器时直接消费后端递归结果。
 */
export function getCategoryTree() {
  return request.get<CategoryTreeResponse[]>('/device-categories/tree')
}
