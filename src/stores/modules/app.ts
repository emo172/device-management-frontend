import { defineStore } from 'pinia'

interface AppState {
  sidebarCollapsed: boolean
  loading: boolean
}

function createDefaultState(): AppState {
  return {
    sidebarCollapsed: false,
    loading: false,
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
