import type { RouteRecordRaw } from 'vue-router'

import { UserRole } from '@/enums/UserRole'

/**
 * 借还路由。
 * 普通用户可以查看本人借还记录，设备管理员负责确认借用与归还；系统管理员不展示该模块入口。
 */
const borrowRoutes: RouteRecordRaw[] = [
  {
    path: '/borrows',
    name: 'BorrowList',
    component: () => import('@/views/common/ViewPlaceholder.vue'),
    props: {
      eyebrow: 'Chunk 7 / Borrow',
      title: '借还管理待接入',
      description:
        '当前先打通借还模块路由和权限边界，后续 Chunk 会补齐列表、借用确认、归还确认与详情页。',
    },
    meta: { title: '借还管理', roles: [UserRole.USER, UserRole.DEVICE_ADMIN], layout: 'default' },
  },
]

export default borrowRoutes
