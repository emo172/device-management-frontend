import type { RouteRecordRaw } from 'vue-router'

import { UserRole } from '@/enums/UserRole'

const allOverdueRoles = [UserRole.USER, UserRole.DEVICE_ADMIN]
const deviceAdminRoles = [UserRole.DEVICE_ADMIN]

/**
 * 逾期路由。
 * 普通用户只查看本人逾期记录，设备管理员承担处理职责，因此系统管理员不进入该模块。
 */
const overdueRoutes: RouteRecordRaw[] = [
  {
    path: '/overdue',
    name: 'OverdueList',
    component: () => import('@/views/overdue/List.vue'),
    meta: { title: '逾期管理', roles: allOverdueRoles, layout: 'default' },
  },
  {
    path: '/overdue/:id/handle',
    name: 'OverdueHandle',
    component: () => import('@/views/overdue/Handle.vue'),
    meta: { title: '逾期处理', roles: deviceAdminRoles, layout: 'default' },
  },
  {
    path: '/overdue/:id',
    name: 'OverdueDetail',
    component: () => import('@/views/overdue/Detail.vue'),
    meta: { title: '逾期详情', roles: allOverdueRoles, layout: 'default' },
  },
]

export default overdueRoutes
