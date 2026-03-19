<script setup lang="ts">
import { Location, Postcard } from '@element-plus/icons-vue'

import type { DeviceResponse } from '@/api/devices'

/**
 * 设备摘要卡片。
 * 设备列表页用它承接“重点设备速览”，把状态、编号、分类与位置聚合在一张卡内，便于列表页在表格之外保留更强的业务识别度。
 */
defineProps<{
  device: DeviceResponse
  showAdminActions?: boolean
}>()

const emit = defineEmits<{
  detail: [deviceId: string]
  edit: [deviceId: string]
  status: [deviceId: string]
  delete: [deviceId: string]
}>()
</script>

<template>
  <article class="device-card device-card__surface">
    <div class="device-card__top">
      <div>
        <p class="device-card__eyebrow">{{ device.categoryName }}</p>
        <h3 class="device-card__title">{{ device.name }}</h3>
      </div>
      <DeviceStatusTag :status="device.status" />
    </div>

    <div class="device-card__meta">
      <span class="device-card__meta-item">
        <el-icon><Postcard /></el-icon>
        {{ device.deviceNumber }}
      </span>
      <span class="device-card__meta-item">
        <el-icon><Location /></el-icon>
        {{ device.location }}
      </span>
    </div>

    <p class="device-card__description">{{ device.description || '当前未填写设备描述' }}</p>

    <div class="device-card__actions">
      <el-button class="device-card__detail" text @click="emit('detail', device.id)"
        >详情</el-button
      >

      <!-- 只有设备管理员可直接执行设备维护动作，系统管理员与普通用户仅保留只读入口。 -->
      <template v-if="showAdminActions">
        <el-button class="device-card__edit" text type="primary" @click="emit('edit', device.id)">
          编辑
        </el-button>
        <el-button
          class="device-card__status"
          text
          type="warning"
          @click="emit('status', device.id)"
        >
          状态变更
        </el-button>
        <el-button
          class="device-card__delete"
          text
          type="danger"
          @click="emit('delete', device.id)"
        >
          删除
        </el-button>
      </template>
    </div>
  </article>
</template>

<style scoped lang="scss">
@use '@/assets/styles/console-shell' as shell;

.device-card {
  @include shell.console-surface(12px);

  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92)),
    linear-gradient(135deg, rgba(217, 119, 6, 0.08), transparent 45%);
}

.device-card__top,
.device-card__meta,
.device-card__actions {
  display: flex;
  align-items: center;
}

.device-card__top,
.device-card__actions {
  justify-content: space-between;
}

.device-card__meta {
  flex-wrap: wrap;
  gap: 12px 16px;
}

.device-card__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--app-text-secondary);
}

.device-card__eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #b45309;
}

.device-card__title {
  margin: 0;
  font-size: 20px;
  color: var(--app-text-primary);
}

.device-card__description {
  margin: 0;
  min-height: 48px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--app-text-secondary);
}

.device-card__actions {
  flex-wrap: wrap;
  gap: 4px 8px;
}
</style>
