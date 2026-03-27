import { describe, expect, it } from 'vitest'

import { UserRole } from '@/enums/UserRole'
import borrowRoutes from '@/router/modules/borrow.routes'
import deviceRoutes from '@/router/modules/device.routes'
import notificationRoutes from '@/router/modules/notification.routes'
import overdueRoutes from '@/router/modules/overdue.routes'
import reservationRoutes from '@/router/modules/reservation.routes'
import { routes } from '@/router/routes'

import {
  getVisibleNavigationGroups,
  navigationGroups,
  resolveNavigationContext,
  type NavigationBreadcrumbItem,
  type NavigationContext,
  type NavigationGroup,
  type NavigationItem,
} from '../navigation'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <Value>() => Value extends Left ? 1 : 2
      ? true
      : false
    : false

type Expect<T extends true> = T

type _NavigationGroupsReadonlyArray = Expect<
  Equal<typeof navigationGroups, readonly NavigationGroup[]>
>
type _NavigationGroupReadonlyKeys = Expect<
  Equal<
    Pick<NavigationGroup, 'title' | 'items'>,
    {
      readonly title: string
      readonly items: readonly NavigationItem[]
    }
  >
>
type _NavigationItemMatchRouteNamesReadonly = Expect<
  Equal<
    Pick<NavigationItem, 'matchRouteNames'>,
    {
      readonly matchRouteNames?: readonly string[]
    }
  >
>
type _NavigationItemMatchPathPatternsReadonly = Expect<
  Equal<
    Pick<NavigationItem, 'matchPathPatterns'>,
    {
      readonly matchPathPatterns?: readonly string[]
    }
  >
>
type _NavigationItemReadonlyContract = Expect<
  Equal<
    Pick<NavigationItem, 'title' | 'path' | 'roles'>,
    {
      readonly title: string
      readonly path: string
      readonly roles: readonly UserRole[]
    }
  >
>
type _NavigationContextBreadcrumbItemsReadonly = Expect<
  Equal<
    Pick<NavigationContext, 'breadcrumbItems'>,
    {
      readonly breadcrumbItems: readonly NavigationBreadcrumbItem[]
    }
  >
>
type _NavigationBreadcrumbItemReadonly = Expect<
  Equal<
    Pick<NavigationBreadcrumbItem, 'title' | 'path'>,
    {
      readonly title: string
      readonly path?: string
    }
  >
>
type _NestedNavigationGroupsItemsReadonly = Expect<
  Equal<(typeof navigationGroups)[number]['items'], readonly NavigationItem[]>
>
type _NestedNavigationItemRolesReadonly = Expect<
  Equal<(typeof navigationGroups)[number]['items'][number]['roles'], readonly UserRole[]>
>
type _NestedNavigationItemTitleReadonly = Expect<
  Equal<
    Pick<(typeof navigationGroups)[number]['items'][number], 'title'>,
    {
      readonly title: string
    }
  >
>

function createRouteLike(path: string, title?: string, name?: string) {
  return {
    path,
    name,
    meta: {
      title,
    },
  }
}

function getBreadcrumbTitles(titles: ReadonlyArray<{ title: string }>) {
  return titles.map((item) => item.title)
}

function findNavigationItem(title: string) {
  const item = navigationGroups
    .flatMap((group) => group.items)
    .find((groupItem) => groupItem.title === title)

  if (!item) {
    throw new Error(`未找到导航项：${title}`)
  }

  return item
}

function findRouteByName<RouteName extends string>(
  routes: ReadonlyArray<{ name?: string | symbol; path: string; meta?: { roles?: unknown } }>,
  routeName: RouteName,
) {
  const route = routes.find((routeRecord) => routeRecord.name === routeName)

  if (!route) {
    throw new Error(`未找到路由：${routeName}`)
  }

  return route
}

function getRouteRoles(route: { meta?: { roles?: unknown } }) {
  return (Array.isArray(route.meta?.roles) ? route.meta.roles : []) as UserRole[]
}

describe('navigation', () => {
  it('导航契约在类型层锁定只读数组、匹配规则与面包屑结构', () => {
    expect(true).toBe(true)
  })

  it('分类管理仅对设备管理员可见，系统管理员不可见', () => {
    const deviceAdminItems = getVisibleNavigationGroups(UserRole.DEVICE_ADMIN).flatMap((group) =>
      group.items.map((item) => item.title),
    )
    const systemAdminItems = getVisibleNavigationGroups(UserRole.SYSTEM_ADMIN).flatMap((group) =>
      group.items.map((item) => item.title),
    )

    expect(deviceAdminItems).toContain('分类管理')
    expect(systemAdminItems).not.toContain('分类管理')
  })

  it('关键导航项与真实路由模块保持 path、回溯路由名和角色口径一致', () => {
    const reservationPendingAuditRoute = findRouteByName(
      reservationRoutes,
      'ReservationPendingAudit',
    )
    const borrowConfirmRoute = findRouteByName(borrowRoutes, 'BorrowConfirm')
    const overdueHandleRoute = findRouteByName(overdueRoutes, 'OverdueHandle')
    const deviceCategoryListRoute = findRouteByName(deviceRoutes, 'DeviceCategoryList')

    const reservationPendingAuditItem = findNavigationItem('预约审核')
    const borrowManagementItem = findNavigationItem('借还管理')
    const overdueManagementItem = findNavigationItem('逾期管理')
    const deviceCategoryItem = findNavigationItem('分类管理')

    expect(reservationPendingAuditItem.path).toBe(reservationPendingAuditRoute.path)
    expect(reservationPendingAuditItem.roles).toEqual(getRouteRoles(reservationPendingAuditRoute))

    expect(borrowManagementItem.matchRouteNames).toContain('BorrowConfirm')
    expect(borrowManagementItem.matchPathPatterns).toContain(borrowConfirmRoute.path)
    expect(borrowManagementItem.roles).toEqual(getRouteRoles(borrowConfirmRoute))

    expect(overdueManagementItem.matchRouteNames).toContain('OverdueHandle')
    expect(overdueManagementItem.matchPathPatterns).toContain(overdueHandleRoute.path)
    expect(overdueManagementItem.roles).toEqual(getRouteRoles(overdueHandleRoute))

    expect(deviceCategoryItem.path).toBe(deviceCategoryListRoute.path)
    expect(deviceCategoryItem.roles).toEqual(getRouteRoles(deviceCategoryListRoute))
  })

  it('普通用户看到的一级分组遵循业务优先、中心化命名的排序', () => {
    const groups = getVisibleNavigationGroups(UserRole.USER)
    const groupTitles = groups.map((group) => group.title)
    const itemTitles = groups.flatMap((group) => group.items.map((item) => item.title))

    expect(groupTitles).toEqual([
      '工作台',
      '预约业务',
      '设备与资产',
      '智能助手',
      '消息中心',
      '账号中心',
    ])
    expect(itemTitles).toContain('通知中心')
    expect(itemTitles).toContain('个人中心')
    expect(itemTitles).toContain('我的预约')
    expect(itemTitles).not.toContain('用户管理')
  })

  it('通知中心与个人中心使用独立一级分组，避免继续挂在工作台下', () => {
    const notificationRoute = findRouteByName(notificationRoutes, 'NotificationList')
    const profileRoute = findRouteByName(routes, 'Profile')

    const notificationContext = resolveNavigationContext(
      createRouteLike(notificationRoute.path, '通知中心', 'NotificationList'),
      UserRole.USER,
    )
    const profileContext = resolveNavigationContext(
      createRouteLike(profileRoute.path, '个人中心', 'Profile'),
      UserRole.USER,
    )

    expect(getBreadcrumbTitles(notificationContext.breadcrumbItems)).toEqual([
      '消息中心',
      '通知中心',
    ])
    expect(getBreadcrumbTitles(profileContext.breadcrumbItems)).toEqual(['账号中心', '个人中心'])
  })

  it('设备管理员进入借用确认页时返回所属导航分组、激活项与完整面包屑', () => {
    const context = resolveNavigationContext(
      createRouteLike('/borrows/confirm', '借用确认', 'BorrowConfirm'),
      UserRole.DEVICE_ADMIN,
    )

    expect(context.activeItemPath).toBe('/borrows')
    expect(context.openGroupTitle).toBe('设备与资产')
    expect(context.pageTitle).toBe('借用确认')
    expect(getBreadcrumbTitles(context.breadcrumbItems)).toEqual([
      '设备与资产',
      '借还管理',
      '借用确认',
    ])
  })

  it('系统管理员访问 reservations 时标题使用预约管理口径', () => {
    const context = resolveNavigationContext(
      createRouteLike('/reservations', '预约管理', 'ReservationList'),
      UserRole.SYSTEM_ADMIN,
    )

    expect(context.pageTitle).toBe('预约管理')
    expect(getBreadcrumbTitles(context.breadcrumbItems)).toEqual(['预约业务', '预约管理'])
  })

  it('普通用户访问 reservations 时标题使用我的预约口径', () => {
    const context = resolveNavigationContext(
      createRouteLike('/reservations', '预约管理', 'ReservationList'),
      UserRole.USER,
    )

    expect(context.pageTitle).toBe('我的预约')
    expect(getBreadcrumbTitles(context.breadcrumbItems)).toEqual(['预约业务', '我的预约'])
  })

  it('普通用户访问 borrows 与 overdue 时分别显示借还记录和逾期记录', () => {
    const borrowContext = resolveNavigationContext(
      createRouteLike('/borrows', '借还管理', 'BorrowList'),
      UserRole.USER,
    )
    const overdueContext = resolveNavigationContext(
      createRouteLike('/overdue', '逾期管理', 'OverdueList'),
      UserRole.USER,
    )

    expect(borrowContext.pageTitle).toBe('借还记录')
    expect(getBreadcrumbTitles(borrowContext.breadcrumbItems)).toEqual(['设备与资产', '借还记录'])
    expect(overdueContext.pageTitle).toBe('逾期记录')
    expect(getBreadcrumbTitles(overdueContext.breadcrumbItems)).toEqual(['设备与资产', '逾期记录'])
  })

  it('设备管理员访问 borrows 与 overdue 时分别显示借还管理和逾期管理', () => {
    const borrowContext = resolveNavigationContext(
      createRouteLike('/borrows', '借还管理', 'BorrowList'),
      UserRole.DEVICE_ADMIN,
    )
    const overdueContext = resolveNavigationContext(
      createRouteLike('/overdue', '逾期管理', 'OverdueList'),
      UserRole.DEVICE_ADMIN,
    )

    expect(borrowContext.pageTitle).toBe('借还管理')
    expect(getBreadcrumbTitles(borrowContext.breadcrumbItems)).toEqual(['设备与资产', '借还管理'])
    expect(overdueContext.pageTitle).toBe('逾期管理')
    expect(getBreadcrumbTitles(overdueContext.breadcrumbItems)).toEqual(['设备与资产', '逾期管理'])
  })

  it('仅面包屑页使用当前路由标题，但第二级保留所属导航项标题', () => {
    const context = resolveNavigationContext(
      createRouteLike('/reservations/123/check-in', '预约签到', 'ReservationCheckIn'),
      UserRole.USER,
    )

    expect(context.activeItemPath).toBe('/reservations')
    expect(context.pageTitle).toBe('预约签到')
    expect(getBreadcrumbTitles(context.breadcrumbItems)).toEqual([
      '预约业务',
      '我的预约',
      '预约签到',
    ])
  })

  it('动态路径页可以通过路径模式回溯到所属导航项', () => {
    const context = resolveNavigationContext(
      createRouteLike('/devices/device-001/edit', '编辑设备'),
      UserRole.DEVICE_ADMIN,
    )

    expect(context.activeItemPath).toBe('/devices')
    expect(context.openGroupTitle).toBe('设备与资产')
    expect(context.pageTitle).toBe('编辑设备')
    expect(getBreadcrumbTitles(context.breadcrumbItems)).toEqual([
      '设备与资产',
      '设备中心',
      '编辑设备',
    ])
  })

  it('无匹配导航项且没有 meta.title 时回退到路径本身', () => {
    const context = resolveNavigationContext(createRouteLike('/unknown/context'), UserRole.USER)

    expect(context.pageTitle).toBe('/unknown/context')
    expect(context.activeItemPath).toBe('/unknown/context')
    expect(context.openGroupTitle).toBe('')
    expect(context.breadcrumbItems).toEqual([])
  })

  it('直达导航页时即使 meta.title 不同也优先使用菜单标题', () => {
    const context = resolveNavigationContext(
      createRouteLike('/borrows', '借还列表', 'BorrowList'),
      UserRole.DEVICE_ADMIN,
    )

    expect(context.pageTitle).toBe('借还管理')
    expect(getBreadcrumbTitles(context.breadcrumbItems)).toEqual(['设备与资产', '借还管理'])
  })
})
