import { createRouter, createWebHistory } from 'vue-router'

// Chunk 1 先保留最小路由骨架，后续 Chunk 3 会在此基础上接入权限路由与布局切换。
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [],
})

export default router
