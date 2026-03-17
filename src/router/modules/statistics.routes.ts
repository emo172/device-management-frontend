import type { RouteRecordRaw } from 'vue-router'

import { UserRole } from '@/enums/UserRole'

/**
 * 统计分析路由。
 * 统计能力只服务系统管理员，因此在路由层直接阻断其他角色访问。
 */
const statisticsRoutes: RouteRecordRaw[] = [
  {
    path: '/statistics',
    name: 'StatisticsDashboard',
    component: () => import('@/views/statistics/Overview.vue'),
    meta: { title: '统计分析', roles: [UserRole.SYSTEM_ADMIN], layout: 'default' },
  },
  {
    path: '/statistics/device-usage',
    name: 'StatisticsDeviceUsage',
    component: () => import('@/views/statistics/DeviceUsage.vue'),
    meta: { title: '设备利用率分析', roles: [UserRole.SYSTEM_ADMIN], layout: 'default' },
  },
  {
    path: '/statistics/borrow',
    name: 'StatisticsBorrow',
    component: () => import('@/views/statistics/BorrowStats.vue'),
    meta: { title: '借用统计分析', roles: [UserRole.SYSTEM_ADMIN], layout: 'default' },
  },
  {
    path: '/statistics/overdue',
    name: 'StatisticsOverdue',
    component: () => import('@/views/statistics/OverdueStats.vue'),
    meta: { title: '逾期统计分析', roles: [UserRole.SYSTEM_ADMIN], layout: 'default' },
  },
  {
    path: '/statistics/hot-time-slots',
    name: 'StatisticsHotTimeSlots',
    component: () => import('@/views/statistics/HotTimeSlots.vue'),
    meta: { title: '热门时段分析', roles: [UserRole.SYSTEM_ADMIN], layout: 'default' },
  },
]

export default statisticsRoutes
