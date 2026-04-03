<script setup lang="ts">
import { RefreshRight } from '@element-plus/icons-vue'
import { computed, onMounted, ref } from 'vue'

import type { NotificationListQuery, NotificationResponse } from '@/api/notifications'
import AppSelect from '@/components/common/dropdown/AppSelect.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import ConsoleFilterPanel from '@/components/layout/ConsoleFilterPanel.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import ConsoleTableSection from '@/components/layout/ConsoleTableSection.vue'
import {
  NotificationChannel,
  NotificationChannelLabel,
  NotificationChannelTagType,
  NotificationType,
  NotificationTypeLabel,
  NotificationTypeTagType,
} from '@/enums'
import { useNotificationStore } from '@/stores/modules/notification'
import { formatDateTime } from '@/utils/date'

/**
 * 通知中心列表页。
 * 当前页只负责承接通知 store 的分页真相源：`list / total / query / unreadCount`，
 * 避免继续保留历史卡片列表里的本地 filter / sort / slice，导致视图和后端真分页脱节。
 */
const notificationStore = useNotificationStore()

const markingNotificationId = ref<string | null>(null)

const notificationTypeOptions = Object.values(NotificationType).map((value) => ({
  value,
  label: NotificationTypeLabel[value],
}))

const unreadCountText = computed(() => `当前共有 ${notificationStore.unreadCount} 条未读`)
const selectedType = computed(() => notificationStore.query.notificationType ?? '')
const tableData = computed(() => notificationStore.list)

function resolveNotificationTypeLabel(notificationType: string) {
  return NotificationTypeLabel[notificationType as NotificationType] ?? notificationType
}

function resolveNotificationTypeTag(notificationType: string) {
  return NotificationTypeTagType[notificationType as NotificationType] ?? 'info'
}

function resolveChannelLabel(channel: string) {
  return NotificationChannelLabel[channel as NotificationChannel] ?? channel
}

function resolveChannelTag(channel: string) {
  return NotificationChannelTagType[channel as NotificationChannel] ?? 'info'
}

function isInAppNotification(notification: NotificationResponse) {
  return notification.channel === NotificationChannel.IN_APP
}

function canMarkAsRead(notification: NotificationResponse) {
  return isInAppNotification(notification) && notification.readFlag === 0
}

/**
 * 只有站内信存在正式已读回执。
 * 邮件和短信在通知中心只回放投递结果，因此要用稳定的静态语义提示“无已读回执”，避免误导用户把它们当成未读站内信。
 */
function resolveReadStatus(notification: NotificationResponse) {
  if (!isInAppNotification(notification)) {
    return {
      type: 'info',
      label: '无已读回执',
    }
  }

  return {
    type: notification.readFlag === 1 ? 'info' : 'warning',
    label: notification.readFlag === 1 ? '已读' : '未读',
  }
}

function resolveReadAtText(notification: NotificationResponse) {
  if (!isInAppNotification(notification) || notification.readFlag !== 1 || !notification.readAt) {
    return '-'
  }

  return formatDateTime(notification.readAt)
}

function resolveActionCopy(notification: NotificationResponse) {
  if (!isInAppNotification(notification)) {
    return '无已读回执'
  }

  if (notification.readFlag === 1) {
    return '已读'
  }

  return ''
}

function buildQuery(overrides: Partial<NotificationListQuery> = {}): NotificationListQuery {
  const nextQuery: NotificationListQuery = {
    page: overrides.page ?? notificationStore.query.page ?? 1,
    size: overrides.size ?? notificationStore.query.size ?? 10,
  }
  const notificationType =
    overrides.notificationType !== undefined
      ? overrides.notificationType
      : notificationStore.query.notificationType

  if (notificationType) {
    nextQuery.notificationType = notificationType
  }

  return nextQuery
}

/**
 * 通知列表与未读角标需要同步刷新：
 * 列表负责展示当前页数据，未读数负责同步 Hero/头部铃铛，拆开更新会造成短暂不一致。
 */
async function loadNotifications(overrides: Partial<NotificationListQuery> = {}) {
  const nextQuery = buildQuery(overrides)

  await Promise.all([
    notificationStore.fetchNotificationList(nextQuery),
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

/**
 * 筛选变化必须重置到第 1 页。
 * 否则用户停留在旧页码时，很容易把“这一页没数据”误解成“当前类型没有任何记录”。
 */
async function handleFilterChange(value: unknown) {
  const notificationType = typeof value === 'string' ? value : ''

  await loadNotifications({ page: 1, notificationType: notificationType || undefined })
}

async function handleResetFilter() {
  await handleFilterChange('')
}

/**
 * Pagination 组件在 page size 变化时会保留当前页码并原样回传。
 * 通知页必须遵守这个合同，不能额外擅自退回第一页。
 */
async function handlePaginationChange(payload: { currentPage: number; pageSize: number }) {
  await loadNotifications({ page: payload.currentPage, size: payload.pageSize })
}

async function handleRefresh() {
  await loadNotifications()
}

/**
 * “全部标记已读”后的当前页回刷属于通知 store 已冻结的分页契约。
 * 视图层这里必须只委托 store 执行，避免页面再额外重置 query 或重复发起第二次列表请求。
 */
async function handleMarkAllRead() {
  await notificationStore.markAllAsRead()
}

onMounted(() => {
  void loadNotifications()
})
</script>

<template>
  <section class="notification-list-view">
    <ConsolePageHero
      title="通知中心"
      description="统一查看站内信、邮件与短信通知。已读回执仅对站内信生效，因此页面会保留渠道信息，帮助用户判断哪些记录只支持查看投递结果。"
      class="notification-list-view__hero"
    >
      <template #actions>
        <div class="notification-list-view__hero-actions">
          <el-tag type="warning" effect="light">{{ unreadCountText }}</el-tag>
        </div>
      </template>
    </ConsolePageHero>

    <!-- 通知页继续复用统一顶部筛选卡片，只替换列表承载形态，不额外发散出新的控制区结构。 -->
    <ConsoleFilterPanel
      class="notification-list-view__filter-panel"
      title="通知筛选与操作"
      description="统一在顶部筛选卡片承接通知类型过滤、刷新与批量已读动作。"
    >
      <div class="notification-list-view__filter-form">
        <span class="notification-list-view__field-label">通知类型</span>
        <AppSelect
          :model-value="selectedType"
          clearable
          placeholder="筛选通知类型"
          class="notification-list-view__select"
          @update:modelValue="handleFilterChange"
        >
          <el-option
            v-for="option in notificationTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </AppSelect>
      </div>

      <template #actions>
        <div class="notification-list-view__filter-actions">
          <el-button @click="handleResetFilter">重置筛选</el-button>
          <el-button @click="handleRefresh">
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
    </ConsoleFilterPanel>

    <ConsoleTableSection
      title="通知列表"
      :count="notificationStore.total"
      class="notification-list-view__table-shell"
    >
      <EmptyState
        v-if="!tableData.length && !notificationStore.loading"
        title="暂无符合条件的通知"
        description="可以尝试切换通知类型筛选，或点击刷新重新同步最新通知记录。"
        action-text="重新加载"
        @action="loadNotifications()"
      />

      <template v-else>
        <div v-loading="notificationStore.loading" class="notification-list-view__table-wrapper">
          <table class="notification-list-view__table">
            <thead>
              <tr>
                <th>通知时间</th>
                <th>通知类型</th>
                <th>渠道</th>
                <th>标题与摘要</th>
                <th>已读状态</th>
                <th>已读时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="notification in tableData" :key="notification.id">
                <td>{{ formatDateTime(notification.createdAt) }}</td>
                <td>
                  <el-tag :type="resolveNotificationTypeTag(notification.notificationType)" effect="light">
                    {{ resolveNotificationTypeLabel(notification.notificationType) }}
                  </el-tag>
                </td>
                <td>
                  <el-tag :type="resolveChannelTag(notification.channel)" effect="plain">
                    {{ resolveChannelLabel(notification.channel) }}
                  </el-tag>
                </td>
                <td>
                  <div class="notification-list-view__headline">
                    <strong>{{ notification.title }}</strong>
                    <p>{{ notification.content }}</p>
                  </div>
                </td>
                <td>
                  <el-tag :type="resolveReadStatus(notification).type" effect="plain">
                    {{ resolveReadStatus(notification).label }}
                  </el-tag>
                </td>
                <td>{{ resolveReadAtText(notification) }}</td>
                <td>
                  <div class="notification-list-view__table-actions">
                    <!-- 仅站内信且仍未读时才开放“标记已读”；其它渠道只展示静态语义，不伪造交互。 -->
                    <el-button
                      v-if="canMarkAsRead(notification)"
                      text
                      type="primary"
                      :loading="markingNotificationId === notification.id"
                      @click="handleMarkRead(notification.id)"
                    >
                      标记已读
                    </el-button>
                    <span v-else class="notification-list-view__action-copy">
                      {{ resolveActionCopy(notification) }}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template #footer>
        <Pagination
          :current-page="notificationStore.query.page ?? 1"
          :page-size="notificationStore.query.size ?? 10"
          :total="notificationStore.total"
          :disabled="notificationStore.loading"
          @change="handlePaginationChange"
        />
      </template>
    </ConsoleTableSection>
  </section>
</template>

<style scoped lang="scss">
.notification-list-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.notification-list-view__hero,
.notification-list-view__table-shell {
  border: 1px solid var(--app-border-soft);
  box-shadow: var(--app-shadow-card);
}

.notification-list-view__hero {
  background: linear-gradient(
    135deg,
    var(--app-surface-card-strong),
    var(--app-tone-info-surface)
  );
}

.notification-list-view__table-shell {
  background: var(--app-surface-card-strong);
}

.notification-list-view__hero :deep(.console-page-hero__eyebrow) {
  color: var(--app-tone-info-text);
}

.notification-list-view__hero :deep(.console-page-hero__title),
.notification-list-view__table-header h2 {
  margin: 0;
  color: var(--app-text-primary);
}

.notification-list-view__hero :deep(.console-page-hero__description) {
  max-width: 860px;
  margin-top: 14px;
  line-height: 1.8;
  color: var(--app-tone-info-text);
}

.notification-list-view__hero-actions,
.notification-list-view__filter-actions,
.notification-list-view__table-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.notification-list-view__hero-actions {
  align-self: flex-start;
}

.notification-list-view__filter-form {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notification-list-view__field-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-secondary);
}

.notification-list-view__select {
  width: 240px;
}

.notification-list-view__table-wrapper {
  width: 100%;
  max-width: 100%;
  overflow: auto;
}

// 通知表格同一块壳层里同时承接空态、原生 table 和分页，页面层继续锁定主题 token，避免局部区域退回浏览器默认白底。
.notification-list-view__table-shell :deep(.console-table-section__body),
.notification-list-view__table-shell :deep(.console-table-section__footer) {
  background: var(--app-surface-card-strong);
}

.notification-list-view__table {
  width: 100%;
  border-collapse: collapse;
  color: var(--app-text-primary);
}

.notification-list-view__table th,
.notification-list-view__table td {
  padding: 16px 12px;
  border-bottom: 1px solid var(--app-border-soft);
  text-align: left;
  vertical-align: middle;
}

.notification-list-view__table th {
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--app-text-secondary);
}

.notification-list-view__headline {
  min-width: 260px;
  max-width: 420px;
}

.notification-list-view__headline strong,
.notification-list-view__headline p {
  margin: 0;
}

.notification-list-view__headline strong {
  color: var(--app-text-primary);
}

.notification-list-view__headline p {
  margin-top: 8px;
  line-height: 1.7;
  color: var(--app-text-secondary);
}

.notification-list-view__action-copy {
  font-size: 13px;
  color: var(--app-text-secondary);
}
</style>
