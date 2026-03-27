import {
  Bell,
  ChatDotRound,
  DataAnalysis,
  DocumentCopy,
  FolderOpened,
  House,
  List,
  Monitor,
  Notebook,
  Operation,
  Reading,
  Setting,
  User,
} from '@element-plus/icons-vue'
import type { Component } from 'vue'

import { UserRole } from '@/enums/UserRole'

const allRoles: readonly UserRole[] = [UserRole.USER, UserRole.DEVICE_ADMIN, UserRole.SYSTEM_ADMIN]
const reservationAdminRoles: readonly UserRole[] = [UserRole.DEVICE_ADMIN, UserRole.SYSTEM_ADMIN]

/**
 * 共享导航项。
 * 同一路径在不同角色下允许复用 path 但拥有不同标题，顶部标题与侧栏高亮都必须基于角色过滤后的结果解析。
 */
export interface NavigationItem {
  readonly title: string
  readonly path: string
  readonly icon: Component
  readonly roles: readonly UserRole[]
  readonly matchRouteNames?: readonly string[]
  readonly matchPathPatterns?: readonly string[]
}

/**
 * 一级业务分组。
 * 左侧侧栏与顶部面包屑共享该分组标题，避免出现“左侧一个叫法、顶部另一个叫法”的口径漂移。
 */
export interface NavigationGroup {
  readonly title: string
  readonly items: readonly NavigationItem[]
}

/**
 * 面包屑项。
 * 当前展示只使用标题，保留 path 以支持可点击面包屑，避免再改数据契约。
 */
export interface NavigationBreadcrumbItem {
  readonly title: string
  readonly path?: string
}

/**
 * 布局层页面上下文。
 * 头部标题、侧栏高亮、默认展开分组与面包屑都从这里统一取值。
 */
export interface NavigationContext {
  readonly pageTitle: string
  readonly activeItemPath: string
  readonly openGroupTitle: string
  readonly breadcrumbItems: readonly NavigationBreadcrumbItem[]
}

/**
 * 供纯函数消费的最小路由结构。
 * 这里只依赖 path、name 与 meta.title，保证单元测试和布局组件都能用同一套解析逻辑。
 */
export interface RouteLike {
  readonly path: string
  readonly name?: string | symbol | null
  readonly meta?: {
    readonly title?: string | null
  }
}

/**
 * 共享导航配置。
 * 配置只承接“分组、菜单标题、图标、角色口径与隐藏页回溯规则”，不替代路由本身的访问控制。
 * 页面标题采用“直达导航页优先取角色过滤后的菜单标题，仅面包屑页回退到 route.meta.title”的统一规则。
 * 该配置已经是侧栏、头部和面包屑组件共享的导航真相源，避免布局组件继续各自维护一套口径。
 */
export const navigationGroups: readonly NavigationGroup[] = [
  {
    title: '工作台',
    items: [{ title: '仪表盘', path: '/dashboard', icon: House, roles: allRoles }],
  },
  {
    title: '预约业务',
    items: [
      {
        title: '我的预约',
        path: '/reservations',
        icon: Notebook,
        roles: [UserRole.USER],
        matchRouteNames: ['ReservationCreate', 'ReservationDetail', 'ReservationCheckIn'],
        matchPathPatterns: [
          '/reservations/create',
          '/reservations/:id',
          '/reservations/:id/check-in',
        ],
      },
      {
        title: '预约管理',
        path: '/reservations',
        icon: Notebook,
        roles: reservationAdminRoles,
        matchRouteNames: ['ReservationCreate', 'ReservationDetail', 'ReservationCheckIn'],
        matchPathPatterns: [
          '/reservations/create',
          '/reservations/:id',
          '/reservations/:id/check-in',
        ],
      },
      {
        title: '预约审核',
        path: '/reservations/manage/pending',
        icon: List,
        roles: reservationAdminRoles,
      },
      {
        title: '审批历史',
        path: '/reservations/manage/history',
        icon: List,
        roles: reservationAdminRoles,
      },
    ],
  },
  {
    title: '设备与资产',
    items: [
      {
        title: '设备中心',
        path: '/devices',
        icon: Monitor,
        roles: allRoles,
        matchRouteNames: ['DeviceCreate', 'DeviceDetail'],
        matchPathPatterns: ['/devices/create', '/devices/:id', '/devices/:id/edit'],
      },
      {
        title: '分类管理',
        path: '/devices/categories',
        icon: FolderOpened,
        // 分类管理当前遵循现有路由权限口径，仅对设备管理员开放；这里不能擅自改成系统管理员。
        roles: [UserRole.DEVICE_ADMIN],
      },
      {
        title: '借还记录',
        path: '/borrows',
        icon: Reading,
        roles: [UserRole.USER],
        matchRouteNames: ['BorrowDetail'],
        matchPathPatterns: ['/borrows/:id'],
      },
      {
        title: '借还管理',
        path: '/borrows',
        icon: Reading,
        roles: [UserRole.DEVICE_ADMIN],
        matchRouteNames: ['BorrowConfirm', 'BorrowReturn', 'BorrowDetail'],
        matchPathPatterns: ['/borrows/confirm', '/borrows/return', '/borrows/:id'],
      },
      {
        title: '逾期记录',
        path: '/overdue',
        icon: Operation,
        roles: [UserRole.USER],
        matchRouteNames: ['OverdueDetail'],
        matchPathPatterns: ['/overdue/:id'],
      },
      {
        title: '逾期管理',
        path: '/overdue',
        icon: Operation,
        roles: [UserRole.DEVICE_ADMIN],
        matchRouteNames: ['OverdueHandle', 'OverdueDetail'],
        matchPathPatterns: ['/overdue/:id', '/overdue/:id/handle'],
      },
    ],
  },
  {
    title: '智能助手',
    items: [
      { title: 'AI 对话', path: '/ai', icon: ChatDotRound, roles: [UserRole.USER] },
      { title: 'AI 历史会话', path: '/ai/history', icon: ChatDotRound, roles: [UserRole.USER] },
    ],
  },
  {
    // 消息能力放在业务分组之后，避免把“通知中心”误读成首页概览的一部分。
    title: '消息中心',
    items: [{ title: '通知中心', path: '/notifications', icon: Bell, roles: allRoles }],
  },
  {
    // 账号设置紧跟消息中心，后续个人偏好、账号安全等入口都可以继续沉淀在这一组。
    title: '账号中心',
    items: [{ title: '个人中心', path: '/profile', icon: User, roles: allRoles }],
  },
  {
    title: '统计分析',
    items: [
      {
        title: '统计分析',
        path: '/statistics',
        icon: DataAnalysis,
        roles: [UserRole.SYSTEM_ADMIN],
      },
      {
        title: '设备利用率分析',
        path: '/statistics/device-usage',
        icon: DataAnalysis,
        roles: [UserRole.SYSTEM_ADMIN],
      },
      {
        title: '借用统计分析',
        path: '/statistics/borrow',
        icon: DataAnalysis,
        roles: [UserRole.SYSTEM_ADMIN],
      },
      {
        title: '逾期统计分析',
        path: '/statistics/overdue',
        icon: DataAnalysis,
        roles: [UserRole.SYSTEM_ADMIN],
      },
      {
        title: '热门时段分析',
        path: '/statistics/hot-time-slots',
        icon: DataAnalysis,
        roles: [UserRole.SYSTEM_ADMIN],
      },
    ],
  },
  {
    title: '系统管理',
    items: [
      {
        title: '用户管理',
        path: '/users',
        icon: User,
        roles: [UserRole.SYSTEM_ADMIN],
        matchRouteNames: ['UserManagementDetail'],
        matchPathPatterns: ['/users/:id'],
      },
      {
        title: '角色权限',
        path: '/admin/roles',
        icon: Setting,
        roles: [UserRole.SYSTEM_ADMIN],
      },
      {
        title: 'Prompt 模板',
        path: '/admin/prompt-templates',
        icon: DocumentCopy,
        roles: [UserRole.SYSTEM_ADMIN],
      },
    ],
  },
]

type MatchedNavigationItem = {
  readonly groupTitle: string
  readonly item: NavigationItem
}

export function getVisibleNavigationGroups(role: UserRole): readonly NavigationGroup[] {
  return navigationGroups
    .map((group) => ({
      title: group.title,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0)
}

/**
 * 解析布局层导航上下文。
 * 先用角色过滤掉不属于当前会话的同路径菜单，再依次尝试“直接命中 → 路由名回溯 → 路径模式回溯”，确保标题和高亮都落在当前角色真正可见的菜单项上。
 */
export function resolveNavigationContext(routeLike: RouteLike, role: UserRole): NavigationContext {
  const visibleGroups = getVisibleNavigationGroups(role)
  const visibleItems = visibleGroups.flatMap((group) =>
    group.items.map((item) => ({
      groupTitle: group.title,
      item,
    })),
  )
  const matchedItem =
    matchByExactPath(visibleItems, routeLike.path) ??
    matchByRouteName(visibleItems, routeLike.name) ??
    matchByPathPattern(visibleItems, routeLike.path)
  const routeTitle = routeLike.meta?.title?.trim() ?? ''
  const isDirectNavigationPage = matchedItem?.item.path === routeLike.path
  const breadcrumbItems = buildBreadcrumbItems(
    matchedItem,
    routeLike.path,
    routeTitle,
    isDirectNavigationPage,
  )
  /**
   * 同一路径在不同角色下可能对应不同菜单标题，例如 `/reservations` 会在普通用户侧显示“我的预约”。
   * 因此直达左侧导航页时必须优先使用角色过滤后的导航标题；仅面包屑页再回退到当前路由标题。
   */
  const pageTitle = isDirectNavigationPage
    ? (matchedItem?.item.title ?? routeTitle)
    : routeTitle || matchedItem?.item.title || routeLike.path

  return {
    pageTitle,
    activeItemPath: matchedItem?.item.path ?? routeLike.path,
    openGroupTitle: matchedItem?.groupTitle ?? '',
    breadcrumbItems,
  }
}

function matchByExactPath(items: MatchedNavigationItem[], routePath: string) {
  return items.find(({ item }) => item.path === routePath)
}

function matchByRouteName(items: MatchedNavigationItem[], routeName?: string | symbol | null) {
  if (typeof routeName !== 'string') {
    return undefined
  }

  return items.find(({ item }) => item.matchRouteNames?.includes(routeName))
}

function matchByPathPattern(items: MatchedNavigationItem[], routePath: string) {
  return items.find(({ item }) =>
    item.matchPathPatterns?.some((pattern) => createPathPatternRegExp(pattern).test(routePath)),
  )
}

/**
 * 动态段只需要覆盖 `/path/:id/detail` 这类常见场景即可。
 * 这里用轻量正则把 `:param` 转成单段匹配，避免为纯导航解析引入新的路由依赖。
 */
function createPathPatternRegExp(pattern: string) {
  const escapedPattern = pattern.replace(/[.+*?^${}()|[\]\\]/g, '\\$&')
  const regexSource = escapedPattern.replace(/\/:([^/]+)/g, '/[^/]+')

  return new RegExp(`^${regexSource}$`)
}

function buildBreadcrumbItems(
  matchedItem: MatchedNavigationItem | undefined,
  routePath: string,
  routeTitle: string,
  isDirectNavigationPage: boolean,
): readonly NavigationBreadcrumbItem[] {
  if (!matchedItem) {
    return routeTitle ? [{ title: routeTitle, path: routePath }] : []
  }

  const breadcrumbItems = [
    { title: matchedItem.groupTitle },
    { title: matchedItem.item.title, path: matchedItem.item.path },
  ] as const satisfies readonly NavigationBreadcrumbItem[]

  // 详情页、确认页、处理页等仅出现在面包屑里时，最后一级必须继续保留当前路由标题。
  if (!isDirectNavigationPage && routeTitle && routeTitle !== matchedItem.item.title) {
    return [
      ...breadcrumbItems,
      { title: routeTitle, path: routePath },
    ] satisfies readonly NavigationBreadcrumbItem[]
  }

  return breadcrumbItems
}
