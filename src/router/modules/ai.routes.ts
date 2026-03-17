import type { RouteRecordRaw } from 'vue-router'

import { UserRole } from '@/enums/UserRole'

/**
 * AI 对话路由。
 * 根据项目边界，AI 入口仅对普通用户开放，管理员角色不得看到或访问该模块。
 */
const aiRoutes: RouteRecordRaw[] = [
  {
    path: '/ai',
    name: 'AiAssistant',
    component: () => import('@/views/ai/Chat.vue'),
    meta: { title: 'AI 对话', roles: [UserRole.USER], layout: 'default' },
  },
  {
    path: '/ai/history',
    name: 'AiHistory',
    component: () => import('@/views/ai/History.vue'),
    meta: { title: 'AI 历史会话', roles: [UserRole.USER], layout: 'default' },
  },
]

export default aiRoutes
