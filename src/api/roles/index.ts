import request from '@/api/request'

import type {
  RolePermissionTreeModuleResponse,
  RoleResponse,
  UpdateRolePermissionsRequest,
} from './types'

export type {
  RolePermissionTreeModuleResponse,
  RolePermissionTreeNodeResponse,
  RoleResponse,
  UpdateRolePermissionsRequest,
} from './types'

/**
 * 查询角色列表。
 * 对应 `GET /api/admin/roles`，供系统管理员加载角色与权限配置入口。
 */
export function getRoleList() {
  return request.get<RoleResponse[]>('/admin/roles')
}

/**
 * 查询指定角色的权限树。
 * 对应 `GET /api/admin/roles/{id}/permissions/tree`，系统管理员切换角色后必须重新拉取真实授权树，不能只靠前端缓存猜测勾选结果。
 */
export function getRolePermissionTree(roleId: string) {
  return request.get<RolePermissionTreeModuleResponse[]>(`/admin/roles/${roleId}/permissions/tree`)
}

/**
 * 更新角色权限。
 * 对应 `PUT /api/admin/roles/{id}/permissions`，成功时后端返回空业务体。
 */
export function updateRolePermissions(roleId: string, data: UpdateRolePermissionsRequest) {
  return request.put<void, UpdateRolePermissionsRequest>(`/admin/roles/${roleId}/permissions`, data)
}
