/**
 * 更新用户状态请求 DTO。
 * 对应后端 `UpdateUserStatusRequest`，`status` 真实契约是数字而不是枚举字符串。
 */
export interface UpdateUserStatusRequest {
  status: number
  reason?: string | null
}

/**
 * 更新用户角色请求 DTO。
 * 对应后端 `UpdateUserRoleRequest`，后端按 `roleId` 接收目标角色。
 */
export interface UpdateUserRoleRequest {
  roleId: string
}

/**
 * 冻结用户请求 DTO。
 * 对应后端 `FreezeUserRequest`，冻结状态只能透传后端约定值。
 */
export interface FreezeUserRequest {
  freezeStatus: string
  reason?: string | null
}

/**
 * 用户管理响应 DTO。
 * 对应后端 `UserAdminResponse`，用于系统管理员操作后的最小回显。
 */
export interface UserAdminResponse {
  userId: string
  username: string
  status: number
  freezeStatus: string
  roleId: string
}
