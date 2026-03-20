<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import OverdueHandleTypeTag from '@/components/business/OverdueHandleTypeTag.vue'
import OverdueProcessingStatusTag from '@/components/business/OverdueProcessingStatusTag.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleDetailLayout from '@/components/layout/ConsoleDetailLayout.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import { OverdueProcessingStatus } from '@/enums'
import { UserRole } from '@/enums/UserRole'
import { useAuthStore } from '@/stores/modules/auth'
import { useOverdueStore } from '@/stores/modules/overdue'
import { formatDateTime } from '@/utils/date'

/**
 * 逾期详情页。
 * 详情页统一回显逾期时长、处理结果与通知状态，帮助普通用户理解当前风险，也帮助设备管理员复核已处理结果。
 */
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const overdueStore = useOverdueStore()

const overdueRecordId = computed(() => String(route.params.id ?? ''))
const isDeviceAdmin = computed(() => authStore.userRole === UserRole.DEVICE_ADMIN)
const currentRecord = computed(() => overdueStore.currentRecord)

/**
 * 详情页同样遵循“优先展示真实名称、缺失时回退 ID”的联调原则，
 * 保证后端字段尚未补全的环境里页面仍可稳定工作。
 */
function displayIdentityName(name: string | null | undefined, fallbackId: string) {
  return name?.trim() || fallbackId
}

function handleBack() {
  void router.push('/overdue')
}

function handleGoHandle() {
  if (!currentRecord.value) {
    return
  }

  void router.push(`/overdue/${currentRecord.value.id}/handle`)
}

onMounted(() => {
  if (overdueRecordId.value) {
    void overdueStore.fetchOverdueDetail(overdueRecordId.value)
  }
})

onBeforeUnmount(() => {
  overdueStore.resetCurrentRecord()
})
</script>

<template>
  <section class="overdue-detail-view">
    <ConsolePageHero
      eyebrow="Overdue Detail"
      title="逾期记录详情"
      description="查看单条逾期记录的正式处理状态、处理方式与处理时间，确保设备管理员与普通用户看到的是同一份后端回执。"
      class="overdue-detail-view__hero"
    >
      <template #actions>
        <div class="overdue-detail-view__actions">
          <el-button @click="handleBack">返回列表</el-button>

          <!-- 仅设备管理员可从详情继续进入处理页，且仅对待处理记录开放。 -->
          <el-button
            v-if="
              isDeviceAdmin && currentRecord?.processingStatus === OverdueProcessingStatus.PENDING
            "
            type="danger"
            @click="handleGoHandle"
          >
            去处理
          </el-button>
        </div>
      </template>
    </ConsolePageHero>

    <EmptyState
      v-if="!currentRecord && !overdueStore.loading"
      title="未找到逾期记录"
      description="可能是逾期记录不存在，或当前会话还未从后端拉到该条详情。"
      action-text="返回逾期列表"
      @action="handleBack"
    />

    <template v-else-if="currentRecord">
      <ConsoleDetailLayout class="overdue-detail-view__grid">
        <template #main>
          <article class="overdue-detail-view__panel">
            <h3>基础信息</h3>
            <dl>
              <div>
                <dt>逾期记录 ID</dt>
                <dd>{{ currentRecord.id }}</dd>
              </div>
              <div>
                <dt>借还记录 ID</dt>
                <dd>{{ currentRecord.borrowRecordId }}</dd>
              </div>
              <div>
                <dt>设备</dt>
                <dd>{{ displayIdentityName(currentRecord.deviceName, currentRecord.deviceId) }}</dd>
              </div>
              <div>
                <dt>用户</dt>
                <dd>{{ displayIdentityName(currentRecord.userName, currentRecord.userId) }}</dd>
              </div>
            </dl>
          </article>

          <article class="overdue-detail-view__panel">
            <h3>逾期与处理</h3>
            <dl>
              <div>
                <dt>逾期时长</dt>
                <dd>{{ currentRecord.overdueHours }} 小时 / {{ currentRecord.overdueDays }} 天</dd>
              </div>
              <div>
                <dt>处理时间</dt>
                <dd>{{ formatDateTime(currentRecord.processingTime) }}</dd>
              </div>
              <div>
                <dt>处理人</dt>
                <dd>{{ currentRecord.processorId || '-' }}</dd>
              </div>
              <div>
                <dt>赔偿金额</dt>
                <dd>{{ currentRecord.compensationAmount ?? 0 }}</dd>
              </div>
            </dl>
          </article>

          <article class="overdue-detail-view__panel overdue-detail-view__panel--full">
            <h3>处理备注</h3>
            <p>{{ currentRecord.processingRemark || '当前尚无处理备注。' }}</p>
            <small>通知发送标记：{{ currentRecord.notificationSent ? '已发送' : '未发送' }}</small>
          </article>
        </template>

        <template #aside>
          <ConsoleAsidePanel
            title="处理快照"
            description="处理状态与处理方式必须并排贴着详情展示，帮助设备管理员确认是否还需要继续处理。"
          >
            <div class="overdue-detail-view__status-grid">
              <article class="overdue-detail-view__status-card">
                <p class="overdue-detail-view__eyebrow">Processing</p>
                <h2>处理状态</h2>
                <OverdueProcessingStatusTag :status="currentRecord.processingStatus" />
              </article>

              <article class="overdue-detail-view__status-card">
                <p class="overdue-detail-view__eyebrow">Method</p>
                <h2>处理方式</h2>
                <OverdueHandleTypeTag :type="currentRecord.processingMethod" />
              </article>
            </div>
          </ConsoleAsidePanel>
        </template>
      </ConsoleDetailLayout>
    </template>
  </section>
</template>

<style scoped lang="scss">
.overdue-detail-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: #1e293b;
}

.overdue-detail-view__hero,
.overdue-detail-view__status-card,
.overdue-detail-view__panel {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
  padding: 24px 28px;
}

.overdue-detail-view__hero,
.overdue-detail-view__status-grid,
.overdue-detail-view__actions {
  display: flex;
  justify-content: space-between;
  gap: 18px;
}

.overdue-detail-view__status-card {
  flex: 1;
}

.overdue-detail-view__eyebrow {
  margin: 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #e11d48;
}

.overdue-detail-view__hero h1,
.overdue-detail-view__status-card h2,
.overdue-detail-view__panel h3 {
  margin: 10px 0 0;
  font-family: 'Fira Code', monospace;
}

.overdue-detail-view__hero p:not(.overdue-detail-view__eyebrow) {
  max-width: 760px;
  margin: 14px 0 0;
  line-height: 1.8;
  color: #475569;
}

.overdue-detail-view__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.overdue-detail-view__panel--full {
  grid-column: 1 / -1;
}

.overdue-detail-view__panel dl {
  display: grid;
  gap: 14px;
  margin: 18px 0 0;
}

.overdue-detail-view__panel dt,
.overdue-detail-view__panel small {
  color: #64748b;
}

.overdue-detail-view__panel dd,
.overdue-detail-view__panel p {
  margin: 6px 0 0;
  line-height: 1.7;
}
</style>
