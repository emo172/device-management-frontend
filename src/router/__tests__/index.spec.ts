import { describe, expect, it } from 'vitest'

import router from '../index'
import { routes } from '../routes'
import { UserRole } from '@/enums/UserRole'

describe('router', () => {
  it('提供登录路由承接会话失效跳转', () => {
    expect(router.resolve('/login').matched.length).toBeGreaterThan(0)
  })

  it('提供独立的 500 错误页并强制使用 blank 布局', () => {
    const errorRoute = routes.find((route) => route.path === '/500')
    const resolved = router.resolve('/500')
    const matchedRoute = resolved.matched[resolved.matched.length - 1]

    expect(errorRoute?.name).toBe('InternalServerError')
    expect(errorRoute?.meta?.layout).toBe('blank')
    expect(errorRoute?.meta?.hidden).toBe(true)
    expect(resolved.name).toBe('InternalServerError')
    expect(matchedRoute?.meta.layout).toBe('blank')
  })

  it('将根路径重定向到仪表盘入口', () => {
    const rootRoute = routes.find((route) => route.path === '/')

    expect(rootRoute?.redirect).toBe('/dashboard')
  })

  it('限制 AI 与统计分析路由的角色访问范围', () => {
    const aiRoute = routes.find((route) => route.path === '/ai')
    const aiHistoryRoute = routes.find((route) => route.path === '/ai/history')
    const statisticsRoute = routes.find((route) => route.path === '/statistics')
    const statisticsDeviceUsageRoute = routes.find(
      (route) => route.path === '/statistics/device-usage',
    )
    const statisticsBorrowRoute = routes.find((route) => route.path === '/statistics/borrow')
    const statisticsOverdueRoute = routes.find((route) => route.path === '/statistics/overdue')
    const statisticsHotTimeSlotsRoute = routes.find(
      (route) => route.path === '/statistics/hot-time-slots',
    )
    const deviceCreateRoute = routes.find((route) => route.path === '/devices/create')
    const deviceCategoryRoute = routes.find((route) => route.path === '/devices/categories')
    const reservationCreateRoute = routes.find((route) => route.path === '/reservations/create')
    const reservationPendingRoute = routes.find(
      (route) => route.path === '/reservations/manage/pending',
    )
    const reservationHistoryRoute = routes.find(
      (route) => route.path === '/reservations/manage/history',
    )
    const userManagementRoute = routes.find((route) => route.path === '/users')
    const userDetailRoute = routes.find((route) => route.path === '/users/:id')

    expect(aiRoute?.meta?.roles).toEqual([UserRole.USER])
    expect(aiHistoryRoute?.meta?.roles).toEqual([UserRole.USER])
    expect(statisticsRoute?.meta?.roles).toEqual([UserRole.SYSTEM_ADMIN])
    expect(userManagementRoute?.meta?.roles).toEqual([UserRole.SYSTEM_ADMIN])
    expect(userDetailRoute?.meta?.roles).toEqual([UserRole.SYSTEM_ADMIN])
    expect(statisticsDeviceUsageRoute?.meta?.roles).toEqual([UserRole.SYSTEM_ADMIN])
    expect(statisticsBorrowRoute?.meta?.roles).toEqual([UserRole.SYSTEM_ADMIN])
    expect(statisticsOverdueRoute?.meta?.roles).toEqual([UserRole.SYSTEM_ADMIN])
    expect(statisticsHotTimeSlotsRoute?.meta?.roles).toEqual([UserRole.SYSTEM_ADMIN])
    expect(deviceCreateRoute?.meta?.roles).toEqual([UserRole.DEVICE_ADMIN])
    expect(deviceCategoryRoute?.meta?.roles).toEqual([UserRole.DEVICE_ADMIN])
    expect(reservationCreateRoute?.meta?.roles).toEqual([UserRole.USER, UserRole.SYSTEM_ADMIN])
    expect(reservationPendingRoute?.meta?.roles).toEqual([
      UserRole.DEVICE_ADMIN,
      UserRole.SYSTEM_ADMIN,
    ])
    expect(reservationHistoryRoute?.meta?.roles).toEqual([
      UserRole.DEVICE_ADMIN,
      UserRole.SYSTEM_ADMIN,
    ])
  })

  it('挂载真实用户管理详情路由，供系统管理员查看风险与账号信息', () => {
    const detailRoute = router.resolve('/users/user-1')
    const matchedRoute = detailRoute.matched[detailRoute.matched.length - 1]

    expect(detailRoute.name).toBe('UserManagementDetail')
    expect(matchedRoute?.meta.roles).toEqual([UserRole.SYSTEM_ADMIN])
  })

  it('将角色权限路由解析到真实页面且继续限制为系统管理员', async () => {
    const roleRoute = routes.find((route) => route.path === '/admin/roles')
    const resolved = router.resolve('/admin/roles')
    const matchedRoute = resolved.matched[resolved.matched.length - 1]

    expect(roleRoute?.meta?.roles).toEqual([UserRole.SYSTEM_ADMIN])
    expect(resolved.name).toBe('RoleManagement')
    expect(matchedRoute?.meta.roles).toEqual([UserRole.SYSTEM_ADMIN])

    const lazyComponent = roleRoute?.component as (() => Promise<{ default: object }>) | undefined

    if (typeof lazyComponent === 'function') {
      const module = await lazyComponent()
      expect(module.default).toBeTruthy()
    }
  }, 30000)

  it('将 Prompt 模板路由解析到真实页面且继续限制为系统管理员', async () => {
    const promptRoute = routes.find((route) => route.path === '/admin/prompt-templates')
    const resolved = router.resolve('/admin/prompt-templates')
    const matchedRoute = resolved.matched[resolved.matched.length - 1]

    expect(promptRoute?.meta?.roles).toEqual([UserRole.SYSTEM_ADMIN])
    expect(resolved.name).toBe('PromptTemplateManagement')
    expect(matchedRoute?.meta.roles).toEqual([UserRole.SYSTEM_ADMIN])

    const lazyComponent = promptRoute?.component as (() => Promise<{ default: object }>) | undefined

    if (typeof lazyComponent === 'function') {
      const module = await lazyComponent()
      expect(module.default).toBeTruthy()
    }
  }, 30000)
})
