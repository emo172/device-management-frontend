import type { RouteRecordRaw } from 'vue-router'

import { UserRole } from '@/enums/UserRole'

const allRoles = [UserRole.USER, UserRole.DEVICE_ADMIN, UserRole.SYSTEM_ADMIN]
const adminRoles = [UserRole.DEVICE_ADMIN, UserRole.SYSTEM_ADMIN]
const creatorRoles = [UserRole.USER, UserRole.SYSTEM_ADMIN]

/**
 * 预约路由。
 * 所有登录用户都能进入预约主入口，但审核入口仅面向管理员角色，避免普通用户看到审批流页面。
 */
const reservationRoutes: RouteRecordRaw[] = [
  {
    path: '/reservations',
    name: 'ReservationList',
    component: () => import('@/views/reservation/List.vue'),
    meta: { title: '预约管理', roles: allRoles, layout: 'default' },
  },
  {
    path: '/reservations/create',
    name: 'ReservationCreate',
    component: () => import('@/views/reservation/Create.vue'),
    meta: { title: '创建预约', roles: creatorRoles, layout: 'default' },
  },
  {
    path: '/reservations/:id',
    name: 'ReservationDetail',
    component: () => import('@/views/reservation/Detail.vue'),
    meta: { title: '预约详情', roles: allRoles, layout: 'default' },
  },
  {
    path: '/reservations/:id/check-in',
    name: 'ReservationCheckIn',
    component: () => import('@/views/reservation/CheckIn.vue'),
    meta: { title: '预约签到', roles: allRoles, layout: 'default' },
  },
  {
    path: '/reservations/manage/pending',
    name: 'ReservationPendingAudit',
    component: () => import('@/views/reservation/manage/Pending.vue'),
    meta: { title: '预约审核', roles: adminRoles, layout: 'default' },
  },
  {
    path: '/reservations/manage/history',
    name: 'ReservationAuditHistory',
    component: () => import('@/views/reservation/manage/History.vue'),
    meta: { title: '审批历史', roles: adminRoles, layout: 'default' },
  },
]

export default reservationRoutes
