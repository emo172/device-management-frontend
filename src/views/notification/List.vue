<script setup lang="ts">
import { RefreshRight } from '@element-plus/icons-vue'
import { computed, onMounted, ref } from 'vue'

import NotificationItem from '@/components/business/NotificationItem.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { NotificationType, NotificationTypeLabel } from '@/enums'
import { useNotificationStore } from '@/stores/modules/notification'

/**
 * 通知中心列表页。
 * 页面与头部铃铛复用同一个通知 Store，确保用户在列表里标记已读后，Header 角标无需额外事件总线也能立即同步。
 */
const notificationStore = useNotificationStore()

const selectedType = ref('')
const markingNotificationId = ref<string | null>(null)

const notificationTypeOptions = Object.values(NotificationType).map((value) => ({
  value,
  label: NotificationTypeLabel[value],
}))

const filteredNotifications = computed(() => {
  const nextList = notificationStore.notifications
    .slice()
    .sort((left, right) => (right.createdAt ?? '').localeCompare(left.createdAt ?? ''))

  if (!selectedType.value) {
    return nextList
  }

  return nextList.filter((item) => item.notificationType === selectedType.value)
})

const unreadCountText = computed(() => `当前共有 ${notificationStore.unreadCount} 条未读`)

/**
 * 通知列表与未读角标需要一起刷新：列表用于展示详情，未读数用于同步头部铃铛，拆开调用会导致首屏短时间出现数据不一致。
 */
async function loadNotifications() {
  await Promise.all([
    notificationStore.fetchNotificationList(),
    notificationStore.fetchUnreadCount(),
  ])
}

async function handleMarkRead(notificationId: string) {
  markingNotificationId.value = notificationId

  try {
    await notificationStore.markAsRead(notificationId)
  } finally {
    markingNotificationId.value = null
  }
}

async function handleMarkAllRead() {
  await notificationStore.markAllAsRead()
}

function handleResetFilter() {
  selectedType.value = ''
}

onMounted(() => {
  void loadNotifications()
})
</script>

<template>
  <section class="notification-list-view">
    <header class="notification-list-view__hero">
      <div>
        <p class="notification-list-view__eyebrow">Notification Center</p>
        <h1 class="notification-list-view__title">通知中心</h1>
        <p class="notification-list-view__description">
          统一查看站内信、邮件与短信通知。已读回执仅对站内信生效，因此页面会保留渠道信息，帮助用户判断哪些记录只支持查看投递结果。
        </p>
      </div>

      <div class="notification-list-view__hero-actions">
        <el-tag type="warning" effect="light">{{ unreadCountText }}</el-tag>
        <el-button @click="loadNotifications">
          <el-icon><RefreshRight /></el-icon>
          刷新列表
        </el-button>
        <el-button
          type="primary"
          :disabled="notificationStore.unreadCount === 0"
          @click="handleMarkAllRead"
        >
          全部标记已读
        </el-button>
      </div>
    </header>

    <section class="notification-list-view__filters">
      <div class="notification-list-view__filters-main">
        <span class="notification-list-view__filters-label">通知类型</span>
        <el-select
          v-model="selectedType"
          clearable
          placeholder="筛选通知类型"
          class="notification-list-view__select"
        >
          <el-option
            v-for="option in notificationTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </div>

      <el-button @click="handleResetFilter">重置筛选</el-button>
    </section>

    <section v-loading="notificationStore.loading" class="notification-list-view__list-shell">
      <div class="notification-list-view__list-header">
        <div>
          <h2>通知列表</h2>
          <p>共 {{ filteredNotifications.length }} 条记录</p>
        </div>
      </div>

      <EmptyState
        v-if="!filteredNotifications.length && !notificationStore.loading"
        title="暂无匹配的通知"
        description="可以调整通知类型筛选条件，或点击刷新重新同步最新通知记录。"
        action-text="重新加载"
        @action="loadNotifications"
      />

      <div v-else class="notification-list-view__list">
        <NotificationItem
          v-for="notification in filteredNotifications"
          :key="notification.id"
          :notification="notification"
          :loading="markingNotificationId === notification.id"
          @mark-read="handleMarkRead"
        />
      </div>
    </section>
  </section>
</template>

<style scoped lang="scss">
.notification-list-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.notification-list-view__hero,
.notification-list-view__filters,
.notification-list-view__list-shell {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
}

.notification-list-view__hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
  background:
    radial-gradient(circle at top right, rgba(13, 148, 136, 0.18), transparent 34%),
    radial-gradient(circle at bottom left, rgba(245, 158, 11, 0.12), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.94));
}

.notification-list-view__eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #0f766e;
}

.notification-list-view__title,
.notification-list-view__list-header h2 {
  margin: 0;
  color: var(--app-text-primary);
}

.notification-list-view__title {
  font-size: clamp(30px, 4vw, 40px);
}

.notification-list-view__description {
  max-width: 760px;
  margin: 14px 0 0;
  font-size: 15px;
  line-height: 1.8;
  color: var(--app-text-secondary);
}

.notification-list-view__hero-actions,
.notification-list-view__filters,
.notification-list-view__filters-main,
.notification-list-view__list-header {
  display: flex;
  align-items: center;
}

.notification-list-view__hero-actions,
.notification-list-view__filters-main {
  gap: 12px;
}

.notification-list-view__hero-actions {
  align-self: flex-start;
}

.notification-list-view__filters,
.notification-list-view__list-header {
  justify-content: space-between;
}

.notification-list-view__filters {
  padding: 18px 20px;
}

.notification-list-view__filters-label,
.notification-list-view__list-header p {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-secondary);
}

.notification-list-view__list-header p {
  margin: 8px 0 0;
  font-weight: 400;
}

.notification-list-view__select {
  width: 240px;
}

.notification-list-view__list-shell {
  padding: 24px;
}

.notification-list-view__list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
