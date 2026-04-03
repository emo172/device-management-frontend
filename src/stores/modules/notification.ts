import { defineStore } from 'pinia'

import * as notificationApi from '@/api/notifications'

const POLLING_INTERVAL = 30000

interface NotificationState {
  list: notificationApi.NotificationResponse[]
  notifications: notificationApi.NotificationResponse[]
  total: number
  query: notificationApi.NotificationListQuery
  unreadCount: number
  pollingTimer: ReturnType<typeof setInterval> | null
  loading: boolean
}

function createDefaultQuery(): notificationApi.NotificationListQuery {
  return {
    page: 1,
    size: 10,
  }
}

function createDefaultState(): NotificationState {
  return {
    list: [],
    notifications: [],
    total: 0,
    query: createDefaultQuery(),
    unreadCount: 0,
    pollingTimer: null,
    loading: false,
  }
}

/**
 * 通知域状态。
 * 负责站内信列表、未读数和 30 秒轮询；轮询必须可显式启停，避免页面来回切换时堆积重复定时器。
 */
export const useNotificationStore = defineStore('notification', {
  state: (): NotificationState => createDefaultState(),

  actions: {
    /**
     * 通知列表统一复用分页查询状态。
     * 这样通知中心做“全部已读”回刷当前页时，能继续沿用用户正在看的页码和筛选条件，而不是退回第一页。
     */
    async fetchNotificationList(query: notificationApi.NotificationListQuery = createDefaultQuery()) {
      this.loading = true
      this.query = { ...query }

      try {
        const result = await notificationApi.getNotificationList(query)
        this.list = result.records
        this.notifications = result.records
        this.total = result.total
        return result.records
      } finally {
        this.loading = false
      }
    },

    /**
     * 未读数由头部铃铛、通知中心和轮询共用，必须统一从一个动作刷新，避免多个组件各自请求。
     */
    async fetchUnreadCount() {
      const result = await notificationApi.getUnreadNotificationCount()
      this.unreadCount = result.unreadCount
      return result.unreadCount
    },

    /**
     * 单条已读成功后同步更新本地列表和角标，保证通知中心与头部角标即时一致。
     */
    async markAsRead(notificationId: string) {
      const result = await notificationApi.markNotificationRead(notificationId)

      const nextList = this.list.map((item) =>
        item.id === result.notificationId
          ? { ...item, readFlag: result.readFlag, readAt: result.readAt }
          : item,
      )
      this.list = nextList
      this.notifications = nextList

      this.unreadCount = result.unreadCount

      return result
    },

    /**
     * 全部已读只对站内信生效。
     * 成功后必须按当前分页条件重新拉取列表，避免前端只改本地数组后把后端真实排序、筛选和分页结果改乱。
     */
    async markAllAsRead() {
      const currentQuery = { ...this.query }
      const result = await notificationApi.markAllNotificationsRead()
      this.unreadCount = result.unreadCount
      await this.fetchNotificationList(currentQuery)
      return result
    },

    /**
     * 轮询只负责未读数刷新。
     * 为避免重复定时器，启动前会检查现有句柄；页面重新进入通知模块时可以安全重复调用。
     */
    startPolling() {
      if (this.pollingTimer) {
        return
      }

      this.pollingTimer = setInterval(() => {
        void this.fetchUnreadCount().catch(() => {
          /**
           * 轮询属于后台刷新能力。
           * 单次请求失败不应抛出未处理异常污染控制台，也不应中断下一轮轮询，由后续轮询继续尝试恢复即可。
           */
        })
      }, POLLING_INTERVAL)
    },

    /**
     * 离开页面或登出时必须主动停止轮询，避免后台页面仍持续发起未读数请求。
     */
    stopPolling() {
      if (!this.pollingTimer) {
        return
      }

      clearInterval(this.pollingTimer)
      this.pollingTimer = null
    },

    /**
     * 通知模块整体重置时先清理定时器，防止旧定时器在新会话里继续回写过期结果。
     */
    resetState() {
      this.stopPolling()
      this.list = []
      this.notifications = []
      this.total = 0
      this.query = createDefaultQuery()
      this.unreadCount = 0
      this.loading = false
    },
  },
})
