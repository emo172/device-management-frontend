import { createRouter, createWebHistory } from 'vue-router'

// Chunk 1 先保留最小路由骨架，但必须提供 /login 承接 401 失效跳转，
// 避免请求层把用户推到无匹配路由的空白状态。
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/Login.vue'),
      meta: {
        public: true,
        title: '登录',
      },
    },
  ],
})

export default router
