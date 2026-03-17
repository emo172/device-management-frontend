/**
 * 角色响应 DTO。
 * 对应后端 `RoleResponse`，当前列表仅返回角色基本信息，不含权限详情。
 */
export interface RoleResponse {
  id: string
  name: string
  description: string | null
}

/**
 * 更新角色权限请求 DTO。
 * 对应后端 `UpdateRolePermissionsRequest`，权限更新按 ID 列表整体覆盖。
 */
export interface UpdateRolePermissionsRequest {
  permissionIds: string[]
}

/**
 * 角色权限树节点 DTO。
 * 对应后端 `RolePermissionTreeNodeResponse`，前端保存权限时必须回传 `permissionId` 而不是权限编码。
 */
export interface RolePermissionTreeNodeResponse {
  permissionId: string
  code: string
  name: string
  description: string
  selected: boolean
}

/**
 * 角色权限树模块 DTO。
 * 对应后端 `RolePermissionTreeResponse`，服务端已经按模块分组，前端不应再次自行推断分组规则。
 */
export interface RolePermissionTreeModuleResponse {
  module: string
  permissions: RolePermissionTreeNodeResponse[]
}
