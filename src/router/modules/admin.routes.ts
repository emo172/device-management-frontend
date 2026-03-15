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
    component: () => import('@/views/common/ViewPlaceholder.vue'),
    props: {
      eyebrow: 'Chunk 9 / User Admin',
      title: '用户管理待接入',
      description:
        '当前先打通系统管理员菜单与路由权限，后续 Chunk 会补齐用户列表、冻结、角色分配等页面。',
    },
    meta: { title: '用户管理', roles: systemAdminRoles, layout: 'default' },
  },
  {
    path: '/admin/roles',
    name: 'RoleManagement',
    component: () => import('@/views/common/ViewPlaceholder.vue'),
    props: {
      eyebrow: 'Chunk 9 / Role',
      title: '角色权限页面待接入',
      description:
        '当前先保留系统管理员访问入口，后续 Chunk 会补齐角色列表、权限配置与差异化控制。',
    },
    meta: { title: '角色权限', roles: systemAdminRoles, layout: 'default' },
  },
  {
    path: '/admin/prompt-templates',
    name: 'PromptTemplateManagement',
    component: () => import('@/views/common/ViewPlaceholder.vue'),
    props: {
      eyebrow: 'Chunk 8 / Prompt Template',
      title: 'Prompt 模板管理待接入',
      description: '当前先保留 Prompt 模板管理入口，后续 Chunk 会补齐模板列表、编辑与启停控制。',
    },
    meta: { title: 'Prompt 模板', roles: systemAdminRoles, layout: 'default' },
  },
]

export default adminRoutes
