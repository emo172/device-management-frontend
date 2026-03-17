import type { RouteRecordRaw } from 'vue-router'

import { UserRole } from '@/enums/UserRole'

/**
 * 通知中心路由。
 * 站内信对所有登录角色开放，头部铃铛与通知中心页面都依赖该统一入口。
 */
const notificationRoutes: RouteRecordRaw[] = [
  {
    path: '/notifications',
    name: 'NotificationList',
    component: () => import('@/views/notification/List.vue'),
    meta: {
      title: '通知中心',
      roles: [UserRole.USER, UserRole.DEVICE_ADMIN, UserRole.SYSTEM_ADMIN],
      layout: 'default',
    },
  },
]

export default notificationRoutes
