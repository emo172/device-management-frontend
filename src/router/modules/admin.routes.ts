import type { RouteRecordRaw } from 'vue-router'

import { UserRole } from '@/enums/UserRole'

const systemAdminRoles = [UserRole.SYSTEM_ADMIN]

/**
 * 系统管理路由。
 * 用户管理、角色权限与 Prompt 模板都属于系统管理员专属能力，因此统一收口到该模块。
 */
const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/users',
    name: 'UserManagement',
    component: () => import('@/views/user/List.vue'),
    meta: { title: '用户管理', roles: systemAdminRoles, layout: 'default' },
  },
  {
    path: '/users/:id',
    name: 'UserManagementDetail',
    component: () => import('@/views/user/Detail.vue'),
    // 用户详情会展示冻结风险与账号状态，因此必须继续保持系统管理员独占访问。
    meta: { title: '用户详情', roles: systemAdminRoles, layout: 'default' },
  },
  {
    path: '/admin/roles',
    name: 'RoleManagement',
    component: () => import('@/views/admin/RolePermission.vue'),
    meta: { title: '角色权限', roles: systemAdminRoles, layout: 'default' },
  },
  {
    path: '/admin/prompt-templates',
    name: 'PromptTemplateManagement',
    component: () => import('@/views/admin/PromptTemplate.vue'),
    meta: { title: 'Prompt 模板', roles: systemAdminRoles, layout: 'default' },
  },
]

export default adminRoutes
