import request from '@/api/request'

import type { RoleResponse, UpdateRolePermissionsRequest } from './types'

export type { RoleResponse, UpdateRolePermissionsRequest } from './types'

/**
 * 查询角色列表。
 * 对应 `GET /api/admin/roles`，供系统管理员加载角色与权限配置入口。
 */
export function getRoleList() {
  return request.get<RoleResponse[]>('/admin/roles')
}

/**
 * 更新角色权限。
 * 对应 `PUT /api/admin/roles/{id}/permissions`，成功时后端返回空业务体。
 */
export function updateRolePermissions(roleId: string, data: UpdateRolePermissionsRequest) {
  return request.put<void, UpdateRolePermissionsRequest>(`/admin/roles/${roleId}/permissions`, data)
}
