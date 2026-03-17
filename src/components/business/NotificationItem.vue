<script setup lang="ts">
import {
  Bell,
  ChatDotRound,
  Clock,
  InfoFilled,
  Message,
  WarningFilled,
} from '@element-plus/icons-vue'
import { computed } from 'vue'

import type { NotificationResponse } from '@/api/notifications'
import {
  NotificationChannel,
  NotificationChannelLabel,
  NotificationChannelTagType,
  NotificationType,
  NotificationTypeLabel,
  NotificationTypeTagType,
} from '@/enums'
import { formatDateTime } from '@/utils/date'

/**
 * 通知列表项。
 * 该组件只承接单条通知展示与“标记已读”入口，避免页面层同时维护图标、渠道口径和已读规则，导致头部角标同步时出现重复逻辑。
 */
const props = defineProps<{
  notification: NotificationResponse
  loading?: boolean
}>()

const emit = defineEmits<{
  'mark-read': [notificationId: string]
}>()

const ICON_MAP = {
  [NotificationType.VERIFY_CODE]: Message,
  [NotificationType.FIRST_APPROVAL_TODO]: Clock,
  [NotificationType.SECOND_APPROVAL_TODO]: Clock,
  [NotificationType.APPROVAL_PASSED]: Bell,
  [NotificationType.APPROVAL_REJECTED]: WarningFilled,
  [NotificationType.APPROVAL_EXPIRED]: WarningFilled,
  [NotificationType.RESERVATION_REMINDER]: Bell,
  [NotificationType.CHECKIN_TIMEOUT_WARNING]: WarningFilled,
  [NotificationType.BORROW_CONFIRM_WARNING]: WarningFilled,
  [NotificationType.OVERDUE_WARNING]: WarningFilled,
  [NotificationType.REVIEW_TIMEOUT_WARNING]: Clock,
  [NotificationType.RESERVATION_CANCELLED]: InfoFilled,
  [NotificationType.BATCH_RESERVATION_RESULT]: ChatDotRound,
  [NotificationType.ON_BEHALF_CREATED]: Bell,
  [NotificationType.PENDING_MANUAL_NOTICE]: Clock,
  [NotificationType.ACCOUNT_FREEZE_UNFREEZE]: WarningFilled,
  [NotificationType.DEVICE_MAINTENANCE_NOTICE]: InfoFilled,
} as const

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

const iconComponent = computed(
  () => ICON_MAP[props.notification.notificationType as NotificationType] ?? Bell,
)

const isInAppChannel = computed(() => props.notification.channel === NotificationChannel.IN_APP)

const canMarkAsRead = computed(() => isInAppChannel.value && props.notification.readFlag === 0)

/**
 * 只有站内信才有已读/未读概念。
 * 邮件和短信展示在通知中心只是为了统一回放通知链路，因此改用中性标签提示“无已读回执”，避免误导用户把投递记录理解成角标未读。
 */
const readStatusTag = computed(() => {
  if (!isInAppChannel.value) {
    return {
      type: 'info' as const,
      label: '无已读回执',
    }
  }

  return {
    type: props.notification.readFlag === 1 ? ('info' as const) : ('warning' as const),
    label: props.notification.readFlag === 1 ? '已读' : '未读',
  }
})

const summaryText = computed(() => {
  if (props.notification.content.length <= 96) {
    return props.notification.content
  }

  return `${props.notification.content.slice(0, 96)}...`
})

function handleMarkRead() {
  emit('mark-read', props.notification.id)
}
</script>

<template>
  <article
    class="notification-item"
    :class="{ 'notification-item--read': isInAppChannel && notification.readFlag === 1 }"
  >
    <div class="notification-item__icon-shell">
      <el-icon class="notification-item__icon"><component :is="iconComponent" /></el-icon>
    </div>

    <div class="notification-item__main">
      <div class="notification-item__meta">
        <div class="notification-item__tags">
          <el-tag :type="resolveNotificationTypeTag(notification.notificationType)" effect="light">
            {{ resolveNotificationTypeLabel(notification.notificationType) }}
          </el-tag>
          <el-tag :type="resolveChannelTag(notification.channel)" effect="plain">
            {{ resolveChannelLabel(notification.channel) }}
          </el-tag>
          <el-tag :type="readStatusTag.type" effect="plain">
            {{ readStatusTag.label }}
          </el-tag>
        </div>
        <time class="notification-item__time">{{ formatDateTime(notification.createdAt) }}</time>
      </div>

      <div class="notification-item__content">
        <div>
          <h3 class="notification-item__title">{{ notification.title }}</h3>
          <p class="notification-item__summary">{{ summaryText }}</p>
        </div>

        <!-- 仅站内信支持已读回执，邮件和短信在通知中心只能查看投递结果，不能伪造已读状态。 -->
        <el-button
          v-if="canMarkAsRead"
          :loading="loading"
          text
          type="primary"
          @click="handleMarkRead"
        >
          标记已读
        </el-button>
      </div>
    </div>
  </article>
</template>

<style scoped lang="scss">
.notification-item {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 18px;
  padding: 22px 24px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.06);
}

.notification-item--read {
  background: rgba(248, 250, 252, 0.96);
}

.notification-item__icon-shell {
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.notification-item__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.16), rgba(245, 158, 11, 0.14));
  color: #0f766e;
  font-size: 22px;
}

.notification-item__main,
.notification-item__meta,
.notification-item__content,
.notification-item__tags {
  display: flex;
}

.notification-item__main {
  flex-direction: column;
  gap: 14px;
}

.notification-item__meta,
.notification-item__content {
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.notification-item__tags {
  flex-wrap: wrap;
  gap: 8px;
}

.notification-item__time {
  font-size: 13px;
  color: var(--app-text-secondary);
  white-space: nowrap;
}

.notification-item__title {
  margin: 0;
  font-size: 18px;
  color: var(--app-text-primary);
}

.notification-item__summary {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--app-text-secondary);
}
</style>
