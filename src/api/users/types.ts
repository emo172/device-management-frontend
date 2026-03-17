import type { FreezeStatus, UserRole } from '@/enums'
import type { PageParams } from '@/types/api'

/**
 * 用户列表查询参数。
 * 用户管理页与代预约选择器都复用该查询对象；当前真实后端契约只支持 `page` 与 `size` 两个分页参数。
 */
export interface UserListQuery extends PageParams {}

/**
 * 用户列表单项响应 DTO。
 * 对应后端 `UserListItemResponse`，创建预约页只会把 `USER` 角色记录作为代预约目标用户。
 */
export interface UserListItemResponse {
  id: string
  username: string
  email: string
  realName: string
  phone: string
  status: number
  freezeStatus: FreezeStatus
  roleId: string
  roleName: UserRole
}

/**
 * 用户分页响应 DTO。
 * 对应后端 `UserPageResponse`，请求层已经解包统一响应壳，这里只保留分页体。
 */
export interface UserPageResponse {
  total: number
  records: UserListItemResponse[]
}

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
  freezeStatus: FreezeStatus
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
  freezeStatus: FreezeStatus
  roleId: string
}

/**
 * 用户详情响应 DTO。
 * 对应后端 `UserDetailResponse`，系统管理员详情页需要完整展示冻结原因、到期时间和账号风险信息。
 */
export interface UserDetailResponse {
  id: string
  username: string
  email: string
  realName: string
  phone: string
  status: number
  freezeStatus: FreezeStatus
  freezeReason: string | null
  freezeExpireTime: string | null
  roleId: string
  roleName: UserRole
  lastLoginTime: string | null
  createdAt: string
  updatedAt: string
}
