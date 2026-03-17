import type { RouteRecordRaw } from 'vue-router'

/**
 * 错误路由。
 * 403、404 与 500 统一使用 blank 布局，避免错误页还带着业务壳层造成信息干扰。
 */
const errorRoutes: RouteRecordRaw[] = [
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/403.vue'),
    meta: { title: '无权限访问', requiresAuth: false, layout: 'blank', hidden: true },
  },
  {
    path: '/500',
    name: 'InternalServerError',
    component: () => import('@/views/error/500.vue'),
    meta: { title: '服务异常', requiresAuth: false, layout: 'blank', hidden: true },
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '页面不存在', requiresAuth: false, layout: 'blank', hidden: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
  },
]

export default errorRoutes
