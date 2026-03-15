import { defineStore } from 'pinia'

import * as notificationApi from '@/api/notifications'

const POLLING_INTERVAL = 30000

interface NotificationState {
  notifications: notificationApi.NotificationResponse[]
  unreadCount: number
  pollingTimer: ReturnType<typeof setInterval> | null
  loading: boolean
}

function createDefaultState(): NotificationState {
  return {
    notifications: [],
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
     * 通知列表当前没有额外筛选能力，Store 只缓存后端返回的当前用户通知集合。
     */
    async fetchNotificationList() {
      this.loading = true

      try {
        const notifications = await notificationApi.getNotificationList()
        this.notifications = notifications
        return notifications
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

      this.notifications = this.notifications.map((item) =>
        item.id === result.notificationId ? { ...item, readFlag: result.readFlag } : item,
      )

      if (result.readFlag === 1) {
        this.unreadCount = Math.max(
          0,
          this.notifications.filter((item) => item.readFlag === 0).length,
        )
      }

      return result
    },

    /**
     * 全部已读后直接把当前列表中的未读标记全部置为已读，避免必须等下一次手动刷新才能看到最新状态。
     */
    async markAllAsRead() {
      const result = await notificationApi.markAllNotificationsRead()
      this.notifications = this.notifications.map((item) => ({ ...item, readFlag: 1 }))
      this.unreadCount = 0
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
        void this.fetchUnreadCount()
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
      this.notifications = []
      this.unreadCount = 0
      this.loading = false
    },
  },
})
