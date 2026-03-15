import { describe, expect, it } from 'vitest'

import router from '../index'
import { routes } from '../routes'
import { UserRole } from '@/enums/UserRole'

describe('router', () => {
  it('提供登录路由承接会话失效跳转', () => {
    expect(router.resolve('/login').matched.length).toBeGreaterThan(0)
  })

  it('将根路径重定向到仪表盘入口', () => {
    const rootRoute = routes.find((route) => route.path === '/')

    expect(rootRoute?.redirect).toBe('/dashboard')
  })

  it('限制 AI 与统计分析路由的角色访问范围', () => {
    const aiRoute = routes.find((route) => route.path === '/ai')
    const statisticsRoute = routes.find((route) => route.path === '/statistics')

    expect(aiRoute?.meta?.roles).toEqual([UserRole.USER])
    expect(statisticsRoute?.meta?.roles).toEqual([UserRole.SYSTEM_ADMIN])
  })
})
