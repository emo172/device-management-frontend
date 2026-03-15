import { createRouter, createWebHistory } from 'vue-router'
import { setupRouterGuards } from './guards'
import { routes } from './routes'

/**
 * 应用主路由实例。
 * Chunk 3 起统一切换到模块化路由表，并在创建后立即装配守卫，保证权限控制与标题更新从入口层收口。
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

setupRouterGuards(router)

export default router
