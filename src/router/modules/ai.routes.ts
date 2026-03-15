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
    component: () => import('@/views/common/ViewPlaceholder.vue'),
    props: {
      eyebrow: 'Chunk 8 / AI',
      title: 'AI 对话模块待接入',
      description:
        '当前先保留 AI 文本对话入口与权限控制，后续 Chunk 会接入会话列表、消息流与意图反馈。',
    },
    meta: { title: 'AI 对话', roles: [UserRole.USER], layout: 'default' },
  },
]

export default aiRoutes
