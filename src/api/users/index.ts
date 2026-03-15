import request from '@/api/request'

import type {
  FreezeUserRequest,
  UpdateUserRoleRequest,
  UpdateUserStatusRequest,
  UserAdminResponse,
} from './types'

export type {
  FreezeUserRequest,
  UpdateUserRoleRequest,
  UpdateUserStatusRequest,
  UserAdminResponse,
} from './types'

/**
 * 更新用户状态。
 * 对应 `PUT /api/admin/users/{id}/status`，仅系统管理员可操作，`status` 使用后端真实数字口径。
 */
export function updateUserStatus(userId: string, data: UpdateUserStatusRequest) {
  return request.put<UserAdminResponse, UpdateUserStatusRequest>(
    `/admin/users/${userId}/status`,
    data,
  )
}

/**
 * 更新用户角色。
 * 对应 `PUT /api/admin/users/{id}/role`，前端必须提交 `roleId`，不能误发角色名称。
 */
export function updateUserRole(userId: string, data: UpdateUserRoleRequest) {
  return request.put<UserAdminResponse, UpdateUserRoleRequest>(`/admin/users/${userId}/role`, data)
}

/**
 * 更新用户冻结状态。
 * 对应 `POST /api/admin/users/{id}/freeze`，冻结属于管理动作而不是简单字段编辑，因此单独走 POST。
 */
export function freezeUser(userId: string, data: FreezeUserRequest) {
  return request.post<UserAdminResponse, FreezeUserRequest>(`/admin/users/${userId}/freeze`, data)
}
