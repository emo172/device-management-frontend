import type { RouteRecordRaw } from 'vue-router'

import { UserRole } from '@/enums/UserRole'

const allRoles = [UserRole.USER, UserRole.DEVICE_ADMIN, UserRole.SYSTEM_ADMIN]
const deviceAdminRoles = [UserRole.DEVICE_ADMIN]

/**
 * 设备与分类路由。
 * 设备列表与详情对全部登录角色开放，但设备写操作与分类管理必须按后端 Controller 口径收敛到设备管理员。
 */
const deviceRoutes: RouteRecordRaw[] = [
  {
    path: '/devices',
    name: 'DeviceList',
    component: () => import('@/views/device/List.vue'),
    meta: { title: '设备中心', roles: allRoles, layout: 'default' },
  },
  {
    path: '/devices/create',
    name: 'DeviceCreate',
    component: () => import('@/views/device/Create.vue'),
    meta: { title: '新建设备', roles: deviceAdminRoles, layout: 'default' },
  },
  {
    path: '/devices/categories',
    name: 'DeviceCategoryList',
    component: () => import('@/views/device/category/List.vue'),
    meta: { title: '分类管理', roles: deviceAdminRoles, layout: 'default' },
  },
  {
    path: '/devices/:id/edit',
    name: 'DeviceEdit',
    component: () => import('@/views/device/Edit.vue'),
    meta: { title: '编辑设备', roles: deviceAdminRoles, layout: 'default' },
  },
  {
    path: '/devices/:id',
    name: 'DeviceDetail',
    component: () => import('@/views/device/Detail.vue'),
    meta: { title: '设备详情', roles: allRoles, layout: 'default' },
  },
]

export default deviceRoutes
