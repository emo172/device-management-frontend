import type { RouteRecordRaw } from 'vue-router'

import { UserRole } from '@/enums/UserRole'

const allRoles = [UserRole.USER, UserRole.DEVICE_ADMIN, UserRole.SYSTEM_ADMIN]
const adminRoles = [UserRole.DEVICE_ADMIN, UserRole.SYSTEM_ADMIN]

/**
 * 预约路由。
 * 所有登录用户都能进入预约主入口，但审核入口仅面向管理员角色，避免普通用户看到审批流页面。
 */
const reservationRoutes: RouteRecordRaw[] = [
  {
    path: '/reservations',
    name: 'ReservationList',
    component: () => import('@/views/common/ViewPlaceholder.vue'),
    props: {
      eyebrow: 'Chunk 6 / Reservation',
      title: '预约页面待接入业务实现',
      description:
        '当前先提供统一预约路由，后续 Chunk 会分别补齐我的预约、创建预约、详情与审核页面。',
    },
    meta: { title: '预约管理', roles: allRoles, layout: 'default' },
  },
  {
    path: '/reservations/manage/pending',
    name: 'ReservationPendingAudit',
    component: () => import('@/views/common/ViewPlaceholder.vue'),
    props: {
      eyebrow: 'Chunk 6 / Reservation Audit',
      title: '预约审核页面待接入',
      description:
        '当前先保留管理员审核入口，后续 Chunk 会按一审、二审和人工处理状态分流展示待处理预约。',
    },
    meta: { title: '预约审核', roles: adminRoles, layout: 'default' },
  },
]

export default reservationRoutes
