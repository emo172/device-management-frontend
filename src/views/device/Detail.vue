<script setup lang="ts">
import { UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { UploadProps } from 'element-plus'

import DeviceStatusTag from '@/components/business/DeviceStatusTag.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleDetailLayout from '@/components/layout/ConsoleDetailLayout.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import { DeviceStatus, DeviceStatusLabel } from '@/enums'
import { UserRole } from '@/enums/UserRole'
import { useAuthStore } from '@/stores/modules/auth'
import { useDeviceStore } from '@/stores/modules/device'

/**
 * 设备详情页。
 * 展示设备完整档案、图片与状态变更轨迹；上传图片仍只向设备管理员开放，保持与后端写权限一致。
 */
const route = useRoute()
const authStore = useAuthStore()
const deviceStore = useDeviceStore()

const deviceId = computed(() => String(route.params.id || ''))
const currentDevice = computed(() => deviceStore.currentDevice)
const isDeviceAdmin = computed(() => authStore.userRole === UserRole.DEVICE_ADMIN)

function getDeviceStatusText(status: string) {
  if (status === 'RETIRED') {
    return '已退役'
  }

  return DeviceStatusLabel[status as DeviceStatus] ?? status
}

const handleUploadChange: UploadProps['onChange'] = async (uploadFile) => {
  if (!uploadFile.raw) {
    return
  }

  await deviceStore.uploadDeviceImage(deviceId.value, uploadFile.raw)
  ElMessage.success('设备图片上传成功')
}

watch(
  deviceId,
  (value) => {
    if (!value) {
      deviceStore.resetCurrentDevice()
      return
    }

    void deviceStore.fetchDeviceDetail(value)
  },
  { immediate: true },
)

onUnmounted(() => {
  deviceStore.resetCurrentDevice()
})
</script>

<template>
  <section class="device-detail-view">
    <ConsolePageHero
      :title="currentDevice?.name || '设备详情'"
      description="集中查看设备基础档案、图片与状态流转，上传能力仍严格限制在设备管理员角色。"
      class="device-detail-view__hero"
    >
      <template #actions>
        <DeviceStatusTag v-if="currentDevice" :status="currentDevice.status as DeviceStatus" />
      </template>
    </ConsolePageHero>

    <div v-if="currentDevice" class="device-detail-view__grid">
      <ConsoleDetailLayout>
        <template #main>
          <el-card class="device-detail-view__card">
            <template #header>
              <div class="device-detail-view__card-header">
                <span>基础信息</span>
              </div>
            </template>

            <el-descriptions :column="2" border>
              <el-descriptions-item label="设备编号">{{
                currentDevice.deviceNumber
              }}</el-descriptions-item>
              <el-descriptions-item label="分类">{{
                currentDevice.categoryName
              }}</el-descriptions-item>
              <el-descriptions-item label="位置">{{ currentDevice.location }}</el-descriptions-item>
              <el-descriptions-item label="状态">
                <DeviceStatusTag :status="currentDevice.status as DeviceStatus" />
              </el-descriptions-item>
              <el-descriptions-item label="设备描述" :span="2">
                {{ currentDevice.description || '暂无设备描述' }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>

          <el-card class="device-detail-view__card device-detail-view__card--full">
            <template #header>
              <div class="device-detail-view__card-header">
                <span>状态变更轨迹</span>
              </div>
            </template>

            <EmptyState
              v-if="!currentDevice.statusLogs.length"
              title="暂无状态流转记录"
              description="设备尚未发生显式状态变更，后续维修、停用或借出都会在这里留痕。"
            />

            <el-timeline v-else>
              <el-timeline-item
                v-for="(log, index) in currentDevice.statusLogs"
                :key="`${log.oldStatus}-${log.newStatus}-${index}`"
                :timestamp="`记录 ${index + 1}`"
              >
                <div class="device-detail-view__timeline-item">
                  <span>
                    {{ getDeviceStatusText(log.oldStatus) }}
                    ->
                    {{ getDeviceStatusText(log.newStatus) }}
                  </span>
                  <p>{{ log.reason }}</p>
                </div>
              </el-timeline-item>
            </el-timeline>
          </el-card>
        </template>

        <template #aside>
          <ConsoleAsidePanel
            class="device-detail-view__aside"
            title="设备图片"
            description="图片与现场外观信息只由设备管理员补充，普通用户和系统管理员保持只读视角。"
          >
            <!-- 图片上传能力只对 DEVICE_ADMIN 开放，普通用户与系统管理员保持只读。 -->
            <el-upload
              v-if="isDeviceAdmin"
              class="device-detail-view__upload"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="handleUploadChange"
            >
              <el-button type="primary">
                <el-icon><UploadFilled /></el-icon>
                上传图片
              </el-button>
            </el-upload>

            <el-image
              v-if="currentDevice.imageUrl"
              class="device-detail-view__image"
              :src="currentDevice.imageUrl"
              fit="cover"
            />
            <EmptyState
              v-else
              title="暂无设备图片"
              description="可由设备管理员补充现场照片，帮助预约人与审核人确认设备外观。"
            />
          </ConsoleAsidePanel>
        </template>
      </ConsoleDetailLayout>
    </div>

    <EmptyState
      v-else
      title="暂无设备详情"
      description="可以返回列表重新进入，或稍后重试详情查询。"
    />
  </section>
</template>

<style scoped lang="scss">
.device-detail-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.device-detail-view__hero {
  border: 1px solid var(--app-border-soft);
  background: linear-gradient(135deg, var(--app-surface-card-strong), var(--app-tone-info-surface));
  box-shadow: var(--app-shadow-card);
}

.device-detail-view__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.device-detail-view__card-header span {
  margin: 0;
  color: var(--app-text-primary);
}

.device-detail-view__grid {
  display: block;
}

.device-detail-view__card {
  border: 1px solid var(--app-border-soft);
  border-radius: 28px;
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-card);
}

.device-detail-view__card--full {
  grid-column: 1 / -1;
}

// 详情页的描述表格和时间线要在页面级再锁一层主题表面，避免 Element Plus 默认浅底在深色模式下重新冒出来。
.device-detail-view__card :deep(.el-card__body),
.device-detail-view__card :deep(.el-descriptions__body),
.device-detail-view__card :deep(.el-descriptions__table),
.device-detail-view__card :deep(.el-timeline-item__content) {
  background: var(--app-surface-card);
}

.device-detail-view__card :deep(.el-descriptions__label),
.device-detail-view__card :deep(.el-descriptions__content),
.device-detail-view__card :deep(.el-timeline-item__node) {
  border-color: var(--app-border-soft);
  background: var(--app-surface-card-strong);
}

.device-detail-view__aside {
  border: 1px solid var(--app-border-soft);
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-card);
}

.device-detail-view__upload :deep(.el-upload) {
  display: inline-flex;
}

.device-detail-view__image {
  width: 100%;
  height: 320px;
  border: 1px solid var(--app-border-soft);
  border-radius: 18px;
  background: var(--app-surface-card-strong);
  overflow: hidden;
}

.device-detail-view__timeline-item span {
  font-weight: 600;
  color: var(--app-text-primary);
}

.device-detail-view__timeline-item p {
  margin: 6px 0 0;
  color: var(--app-text-secondary);
}
</style>
