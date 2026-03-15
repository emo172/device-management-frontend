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
    component: () => import('@/views/common/ViewPlaceholder.vue'),
    props: {
      eyebrow: 'Chunk 8 / Statistics',
      title: '统计分析待接入',
      description: '当前先保留统计模块入口与权限边界，后续 Chunk 会补齐概览卡片、图表与排行分析。',
    },
    meta: { title: '统计分析', roles: [UserRole.SYSTEM_ADMIN], layout: 'default' },
  },
]

export default statisticsRoutes
