/**
 * 系统固定三角色。
 * 路由、菜单和按钮权限都会基于该枚举做严格裁剪，不能退回旧口径 ADMIN。
 */
export enum UserRole {
  USER = 'USER',
  DEVICE_ADMIN = 'DEVICE_ADMIN',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
}

export const UserRoleLabel: Record<UserRole, string> = {
  [UserRole.USER]: '普通用户',
  [UserRole.DEVICE_ADMIN]: '设备管理员',
  [UserRole.SYSTEM_ADMIN]: '系统管理员',
}

export const UserRoleTagType: Record<UserRole, StatusTagType> = {
  [UserRole.USER]: 'info',
  [UserRole.DEVICE_ADMIN]: 'warning',
  [UserRole.SYSTEM_ADMIN]: 'danger',
}
