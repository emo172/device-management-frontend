import type { RouteRecordRaw } from 'vue-router'

import { UserRole } from '@/enums/UserRole'

const allRoles = [UserRole.USER, UserRole.DEVICE_ADMIN, UserRole.SYSTEM_ADMIN]
const adminRoles = [UserRole.DEVICE_ADMIN, UserRole.SYSTEM_ADMIN]

/**
 * 设备与分类路由。
 * 设备查询对全部登录角色开放，但分类管理只允许设备管理员与系统管理员进入。
 */
const deviceRoutes: RouteRecordRaw[] = [
  {
    path: '/devices',
    name: 'DeviceList',
    component: () => import('@/views/common/ViewPlaceholder.vue'),
    props: {
      eyebrow: 'Chunk 5 / Device',
      title: '设备中心待接入业务页',
      description:
        '当前路由先用于打通菜单、守卫与默认布局，后续 Chunk 会补齐设备列表、详情、创建与编辑能力。',
    },
    meta: { title: '设备中心', roles: allRoles, layout: 'default' },
  },
  {
    path: '/devices/categories',
    name: 'DeviceCategoryList',
    component: () => import('@/views/common/ViewPlaceholder.vue'),
    props: {
      eyebrow: 'Chunk 5 / Category',
      title: '分类管理待接入树形视图',
      description: '当前先预留分类管理入口，后续 Chunk 会补齐分类树、默认审批模式和管理表单。',
    },
    meta: { title: '分类管理', roles: adminRoles, layout: 'default' },
  },
]

export default deviceRoutes
