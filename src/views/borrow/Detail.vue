<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import BorrowStatusTag from '@/components/business/BorrowStatusTag.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleDetailLayout from '@/components/layout/ConsoleDetailLayout.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import { BorrowStatus } from '@/enums'
import { UserRole } from '@/enums/UserRole'
import { useAuthStore } from '@/stores/modules/auth'
import { useBorrowStore } from '@/stores/modules/borrow'
import { formatDateTime } from '@/utils/date'

/**
 * 借还详情页。
 * 详情页承接正式借还记录的主键、操作人和借还时间回显，避免确认页完成后只能回到列表盲查结果。
 */
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const borrowStore = useBorrowStore()

const recordId = computed(() => String(route.params.id ?? ''))
const isDeviceAdmin = computed(() => authStore.userRole === UserRole.DEVICE_ADMIN)
const currentRecord = computed(() => borrowStore.currentRecord)

/**
 * 借还详情页优先展示后端真实名称；
 * 若当前环境仍缺失名称字段，则继续回退到 ID，避免详情页出现空白主信息。
 */
function displayIdentityName(name: string | null | undefined, fallbackId: string) {
  return name?.trim() || fallbackId
}

/**
 * 借还详情页与列表页需要使用同一套可归还状态口径。
 * 后端允许逾期记录继续走正式归还确认，因此详情页不能把 `OVERDUE` 错误拦在操作入口之外。
 */
function isReturnEligibleStatus(status: string | undefined) {
  return status === BorrowStatus.BORROWED || status === BorrowStatus.OVERDUE
}

function handleBack() {
  void router.push('/borrows')
}

function handleGoReturn() {
  if (!currentRecord.value) {
    return
  }

  void router.push(`/borrows/return?recordId=${currentRecord.value.id}`)
}

onMounted(() => {
  if (recordId.value) {
    void borrowStore.fetchBorrowDetail(recordId.value)
  }
})

onBeforeUnmount(() => {
  borrowStore.resetCurrentRecord()
})
</script>

<template>
  <section class="borrow-detail-view">
    <ConsolePageHero
      title="借还记录详情"
      description="查看单条借还记录的正式主键、借出归还时间与处理人，方便借还确认完成后追溯现场操作记录。"
      class="borrow-detail-view__hero"
    >
      <template #actions>
        <div class="borrow-detail-view__actions">
          <el-button @click="handleBack">返回列表</el-button>

          <!-- 仅设备管理员可从详情继续发起归还确认，且仅对借用中的正式记录开放。 -->
          <el-button
            v-if="isDeviceAdmin && isReturnEligibleStatus(currentRecord?.status)"
            type="primary"
            @click="handleGoReturn"
          >
            去归还确认
          </el-button>
        </div>
      </template>
    </ConsolePageHero>

    <EmptyState
      v-if="!currentRecord && !borrowStore.loading"
      title="未找到借还记录"
      description="可能是记录不存在，或当前会话还未从后端拉取到该条借还详情。"
      action-text="返回借还列表"
      @action="handleBack"
    />

    <template v-else-if="currentRecord">
      <ConsoleDetailLayout class="borrow-detail-view__grid">
        <template #main>
          <article class="borrow-detail-view__panel">
            <h3>业务主键</h3>
            <dl>
              <div>
                <dt>借还记录 ID</dt>
                <dd>{{ currentRecord.id }}</dd>
              </div>
              <div>
                <dt>预约 ID</dt>
                <dd>{{ currentRecord.reservationId }}</dd>
              </div>
              <div>
                <dt>设备</dt>
                <dd>{{ displayIdentityName(currentRecord.deviceName, currentRecord.deviceId) }}</dd>
              </div>
              <div>
                <dt>设备编号</dt>
                <dd>{{ currentRecord.deviceNumber || currentRecord.deviceId }}</dd>
              </div>
              <div>
                <dt>用户</dt>
                <dd>{{ displayIdentityName(currentRecord.userName, currentRecord.userId) }}</dd>
              </div>
            </dl>
          </article>

          <article class="borrow-detail-view__panel">
            <h3>时间与操作</h3>
            <dl>
              <div>
                <dt>借用时间</dt>
                <dd>{{ formatDateTime(currentRecord.borrowTime) }}</dd>
              </div>
              <div>
                <dt>预计归还时间</dt>
                <dd>{{ formatDateTime(currentRecord.expectedReturnTime) }}</dd>
              </div>
              <div>
                <dt>实际归还时间</dt>
                <dd>{{ formatDateTime(currentRecord.returnTime) }}</dd>
              </div>
              <div>
                <dt>借用操作人</dt>
                <dd>{{ currentRecord.operatorId || '-' }}</dd>
              </div>
              <div>
                <dt>归还操作人</dt>
                <dd>{{ currentRecord.returnOperatorId || '-' }}</dd>
              </div>
            </dl>
          </article>

          <article class="borrow-detail-view__panel borrow-detail-view__panel--full">
            <h3>现场备注</h3>
            <p>{{ currentRecord.remark || '当前无现场补充备注。' }}</p>
          </article>
        </template>

        <template #aside>
          <ConsoleAsidePanel
            title="当前流转状态"
            description="详情页要把正式状态与后续动作放在侧栏里，方便设备管理员做归还确认前快速核对。"
          >
            <BorrowStatusTag :status="currentRecord.status" />
          </ConsoleAsidePanel>
        </template>
      </ConsoleDetailLayout>
    </template>
  </section>
</template>

<style scoped lang="scss">
.borrow-detail-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.borrow-detail-view__hero,
.borrow-detail-view__status-card,
.borrow-detail-view__panel {
  border: 1px solid var(--app-border-soft);
  border-radius: 28px;
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-card);
}

.borrow-detail-view__hero {
  background: linear-gradient(135deg, var(--app-surface-card-strong), var(--app-tone-info-surface));
}

.borrow-detail-view__hero,
.borrow-detail-view__status-card,
.borrow-detail-view__panel {
  padding: 24px 28px;
}

.borrow-detail-view__hero,
.borrow-detail-view__status-card,
.borrow-detail-view__actions {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
}

.borrow-detail-view__eyebrow {
  margin: 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--app-tone-brand-text);
}

.borrow-detail-view__hero h1,
.borrow-detail-view__status-card h2,
.borrow-detail-view__panel h3 {
  margin: 10px 0 0;
  font-family: 'Fira Code', monospace;
}

.borrow-detail-view__hero p:not(.borrow-detail-view__eyebrow) {
  max-width: 780px;
  margin: 14px 0 0;
  line-height: 1.8;
  color: var(--app-text-secondary);
}

.borrow-detail-view__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.borrow-detail-view__panel--full {
  grid-column: 1 / -1;
}

.borrow-detail-view__panel dl {
  display: grid;
  gap: 14px;
  margin: 18px 0 0;
}

.borrow-detail-view__panel dt {
  font-size: 13px;
  color: var(--app-text-secondary);
}

.borrow-detail-view__panel dd,
.borrow-detail-view__panel p {
  margin: 6px 0 0;
  line-height: 1.7;
  color: var(--app-text-primary);
}

// 借还详情侧栏既承载状态标签又承载操作说明，页面层显式收口 token，避免深色下说明面板与主卡片产生亮度断层。
.borrow-detail-view__grid :deep(.console-aside-panel) {
  border: 1px solid var(--app-border-soft);
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-card);
}
</style>
