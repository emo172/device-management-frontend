import type { RouteRecordRaw } from 'vue-router'

import { UserRole } from '@/enums/UserRole'

/**
 * 逾期路由。
 * 普通用户只查看本人逾期记录，设备管理员承担处理职责，因此系统管理员不进入该模块。
 */
const overdueRoutes: RouteRecordRaw[] = [
  {
    path: '/overdue',
    name: 'OverdueList',
    component: () => import('@/views/common/ViewPlaceholder.vue'),
    props: {
      eyebrow: 'Chunk 7 / Overdue',
      title: '逾期管理待接入',
      description:
        '当前路由先承接逾期菜单与权限控制，后续 Chunk 会补齐逾期列表、处理页与告警展示。',
    },
    meta: { title: '逾期管理', roles: [UserRole.USER, UserRole.DEVICE_ADMIN], layout: 'default' },
  },
]

export default overdueRoutes
