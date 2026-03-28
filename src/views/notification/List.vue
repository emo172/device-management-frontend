<script setup lang="ts">
import { RefreshRight } from '@element-plus/icons-vue'
import { computed, onMounted, ref } from 'vue'

import NotificationItem from '@/components/business/NotificationItem.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import ConversationShell from '@/components/layout/ConversationShell.vue'
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
    <ConsolePageHero
      eyebrow="Notification Center"
      title="通知中心"
      description="统一查看站内信、邮件与短信通知。已读回执仅对站内信生效，因此页面会保留渠道信息，帮助用户判断哪些记录只支持查看投递结果。"
      class="notification-list-view__hero"
    >
      <template #actions>
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
      </template>
    </ConsolePageHero>

    <ConversationShell class="notification-list-view__workspace">
      <template #sidebar>
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
      </template>

      <template #main>
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
      </template>
    </ConversationShell>
  </section>
</template>

<style scoped lang="scss">
.notification-list-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.notification-list-view__hero {
  border: 1px solid var(--app-border-soft);
  box-shadow: var(--app-shadow-card);
  background: linear-gradient(135deg, var(--app-surface-card-strong), var(--app-tone-info-surface));
}

.notification-list-view__hero :deep(.console-page-hero__eyebrow) {
  color: var(--app-tone-info-text);
}

.notification-list-view__hero :deep(.console-page-hero__title),
.notification-list-view__list-header h2 {
  margin: 0;
  color: var(--app-text-primary);
}

.notification-list-view__hero :deep(.console-page-hero__description) {
  color: var(--app-tone-info-text);
}

.notification-list-view__hero-actions,
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

.notification-list-view__workspace {
  align-items: stretch;
}

// 通知页左侧筛选与右侧列表会长期并排出现，页面层继续锁定不同表面 token，避免暗色下玻璃壳层重新透出浅色底。
.notification-list-view__workspace :deep(.conversation-shell__sidebar) {
  border-color: var(--app-border-soft);
  background: var(--app-surface-card-strong);
  box-shadow: var(--app-shadow-card);
}

.notification-list-view__workspace :deep(.conversation-shell__main) {
  border-color: var(--app-border-soft);
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-card);
}

.notification-list-view__list-header {
  justify-content: space-between;
}

.notification-list-view__filters {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  background: var(--app-surface-card);
}

.notification-list-view__list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
