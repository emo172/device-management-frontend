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

    expect(aiRoute?.meta?.roles).toEqual([UserRole.USER])
    expect(aiHistoryRoute?.meta?.roles).toEqual([UserRole.USER])
    expect(statisticsRoute?.meta?.roles).toEqual([UserRole.SYSTEM_ADMIN])
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
})
