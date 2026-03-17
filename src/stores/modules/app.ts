import { defineStore } from 'pinia'

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
}

function createDefaultState(): AppState {
  return {
    sidebarCollapsed: false,
    loading: false,
    fatalError: null,
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
     * 登录态切换或路由重建时恢复默认 UI，避免旧页面残留折叠态和加载态污染新会话。
     */
    resetState() {
      Object.assign(this, createDefaultState())
    },
  },

  persist: {
    pick: ['sidebarCollapsed'],
  },
})
