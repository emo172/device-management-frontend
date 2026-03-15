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
