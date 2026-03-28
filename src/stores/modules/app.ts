import { defineStore } from 'pinia'

import {
  getStoredThemePreference,
  getSystemPrefersDark,
  persistThemePreference,
  resolveThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from '@/utils/themeMode'

/**
 * 致命错误重试目标。
 * 第一阶段只承载错误页本身需要的最小信息：是否允许重试，以及重试时应回到哪个路由路径。
 */
type FatalErrorRetryTarget =
  | {
      retryable: true
      path: string
    }
  | {
      retryable: false
    }

/**
 * 致命错误来源。
 * 第一阶段仅覆盖当前规划内会写入 500 页的基础设施入口，避免任意字符串把来源语义写散。
 */
export type FatalErrorSource = 'request' | 'router' | 'main' | 'auth' | 'unknown'

/**
 * 全局致命错误快照。
 * 后续 request / router / main 等基础设施在捕获不可恢复错误时，统一写入这里供 500 页面展示。
 */
export interface FatalErrorState {
  source: FatalErrorSource
  title: string
  description: string
  retryTarget: FatalErrorRetryTarget
}

interface AppState {
  sidebarCollapsed: boolean
  loading: boolean
  fatalError: FatalErrorState | null
  themePreference: ThemePreference
  resolvedTheme: ResolvedTheme
}

function createDefaultState(): AppState {
  return {
    sidebarCollapsed: false,
    loading: false,
    fatalError: null,
    themePreference: 'system',
    resolvedTheme: 'light',
  }
}

/**
 * 应用层 UI 状态。
 * 这里只维护跨页面共享的最小展示状态，避免在基础设施阶段提前把页面局部状态塞进全局 Store。
 */
export const useAppStore = defineStore('app', {
  state: (): AppState => createDefaultState(),

  actions: {
    /**
     * 侧边栏折叠态需要跨布局页保持一致，单独抽成全局状态便于菜单与内容区同步过渡。
     */
    setSidebarCollapsed(collapsed: boolean) {
      this.sidebarCollapsed = collapsed
    },

    /**
     * 统一提供切换动作，避免布局组件自己重复处理布尔翻转逻辑。
     */
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },

    /**
     * 页面级加载状态给后续骨架屏、全局遮罩和按钮禁用复用。
     */
    setLoading(loading: boolean) {
      this.loading = loading
    },

    /**
     * 记录全局致命错误，给 500 页面提供来源、文案和重试入口。
     * 该状态只服务当前会话，不能进入 persist，否则刷新后会把历史错误误当成当前故障继续展示。
     */
    setFatalError(error: FatalErrorState) {
      this.fatalError = error
    },

    /**
     * 错误页完成跳转或用户主动离开故障场景后，应立即清空快照，避免下一次进入错误页还显示旧问题。
     */
    clearFatalError() {
      this.fatalError = null
    },

    /**
     * 应用启动时需要先从持久化偏好恢复主题，再交给入口层把最终主题写回 DOM。
     * 这里只负责解析状态，不直接触碰文档，避免 Store 在测试或非浏览器环境承担副作用。
     */
    initializeThemeState() {
      this.themePreference = getStoredThemePreference()
      this.refreshResolvedTheme()
    },

    /**
     * 用户显式切换主题时必须同步更新本地持久化，保证下次刷新时 `index.html` 预注入能立即命中同一偏好。
     */
    setThemePreference(preference: ThemePreference) {
      this.themePreference = preference
      persistThemePreference(preference)
      this.refreshResolvedTheme()
    },

    /**
     * `resolvedTheme` 是由偏好与系统环境共同推导出的运行时状态，不能单独持久化，只能实时重算。
     */
    refreshResolvedTheme(systemPrefersDark = getSystemPrefersDark()) {
      this.resolvedTheme = resolveThemePreference(this.themePreference, systemPrefersDark)
    },

    /**
     * 登录态切换或路由重建时只恢复临时 UI，主题偏好属于用户长期设置，不能随着会话重置被清空。
     */
    resetState() {
      const preservedThemePreference = this.themePreference
      const preservedResolvedTheme = this.resolvedTheme

      Object.assign(this, createDefaultState())

      this.themePreference = preservedThemePreference
      this.resolvedTheme = preservedResolvedTheme
    },
  },

  persist: {
    pick: ['sidebarCollapsed'],
  },
})
