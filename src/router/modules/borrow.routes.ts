import type { RouteRecordRaw } from 'vue-router'

import { UserRole } from '@/enums/UserRole'

const allBorrowRoles = [UserRole.USER, UserRole.DEVICE_ADMIN]
const deviceAdminRoles = [UserRole.DEVICE_ADMIN]

/**
 * 借还路由。
 * 普通用户可以查看本人借还记录，设备管理员负责确认借用与归还；系统管理员不展示该模块入口。
 */
const borrowRoutes: RouteRecordRaw[] = [
  {
    path: '/borrows',
    name: 'BorrowList',
    component: () => import('@/views/borrow/List.vue'),
    meta: { title: '借还管理', roles: allBorrowRoles, layout: 'default' },
  },
  {
    path: '/borrows/confirm',
    name: 'BorrowConfirm',
    component: () => import('@/views/borrow/Confirm.vue'),
    meta: { title: '借用确认', roles: deviceAdminRoles, layout: 'default' },
  },
  {
    path: '/borrows/return',
    name: 'BorrowReturn',
    component: () => import('@/views/borrow/Return.vue'),
    meta: { title: '归还确认', roles: deviceAdminRoles, layout: 'default' },
  },
  {
    path: '/borrows/:id',
    name: 'BorrowDetail',
    component: () => import('@/views/borrow/Detail.vue'),
    meta: { title: '借还详情', roles: allBorrowRoles, layout: 'default' },
  },
]

export default borrowRoutes
