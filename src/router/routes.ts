import type { RouteRecordRaw } from 'vue-router'

import { UserRole } from '@/enums/UserRole'

import adminRoutes from './modules/admin.routes'
import aiRoutes from './modules/ai.routes'
import authRoutes from './modules/auth.routes'
import borrowRoutes from './modules/borrow.routes'
import deviceRoutes from './modules/device.routes'
import errorRoutes from './modules/error.routes'
import notificationRoutes from './modules/notification.routes'
import overdueRoutes from './modules/overdue.routes'
import reservationRoutes from './modules/reservation.routes'
import statisticsRoutes from './modules/statistics.routes'

const allRoles = [UserRole.USER, UserRole.DEVICE_ADMIN, UserRole.SYSTEM_ADMIN]

/**
 * 全量路由表。
 * 顶层先声明根路径、仪表盘与个人中心，再拼装业务域模块，保证登录后的默认落点、头部菜单与错误兜底都能立即可用。
 */
export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/dashboard/index.vue'),
    meta: { title: '仪表盘', roles: allRoles, layout: 'default' },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/user/Profile.vue'),
    meta: { title: '个人中心', roles: allRoles, layout: 'default' },
  },
  ...authRoutes,
  ...deviceRoutes,
  ...reservationRoutes,
  ...borrowRoutes,
  ...overdueRoutes,
  ...aiRoutes,
  ...adminRoutes,
  ...notificationRoutes,
  ...statisticsRoutes,
  ...errorRoutes,
]
