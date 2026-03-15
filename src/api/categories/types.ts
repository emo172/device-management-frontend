/**
 * 审批模式。
 * 当前任务按联调口径使用 `DEVICE_THEN_SYSTEM`，前端类型先收敛到本轮任务明确要求的枚举值。
 */
export type ApprovalMode = 'DEVICE_ONLY' | 'DEVICE_THEN_SYSTEM'

/**
 * 创建设备分类请求。
 * 对应后端 `CreateCategoryRequest`，父级分类通过名称关联，避免提交计划旧口径字段。
 */
export interface CreateCategoryRequest {
  name: string
  parentName: string | null
  sortOrder: number
  description: string
  defaultApprovalMode: ApprovalMode
}

/**
 * 分类树节点。
 * 对应后端 `CategoryTreeResponse`，树结构由后端递归返回，前端不再二次拼树。
 */
export interface CategoryTreeResponse {
  id: string
  name: string
  parentId: string | null
  sortOrder: number
  description: string
  defaultApprovalMode: ApprovalMode
  children: CategoryTreeResponse[]
}
