<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { LocationQueryValue } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'

import OverdueHandleTypeTag from '@/components/business/OverdueHandleTypeTag.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleDetailLayout from '@/components/layout/ConsoleDetailLayout.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import { OverdueHandleType, OverdueProcessingStatus } from '@/enums'
import { UserRole } from '@/enums/UserRole'
import { useAuthStore } from '@/stores/modules/auth'
import { useOverdueStore } from '@/stores/modules/overdue'
import { formatDateTime } from '@/utils/date'

function normalizeQueryValue(value: LocationQueryValue | LocationQueryValue[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? ''
  }

  return value ?? ''
}

function isHandleType(value: string): value is OverdueHandleType {
  return Object.values(OverdueHandleType).includes(value as OverdueHandleType)
}

/**
 * 逾期处理页。
 * 设备管理员在这里明确选择处理方式、处理备注与赔偿金额，所有字段都直接对齐后端 `ProcessOverdueRequest`，不在前端发明额外状态机。
 */
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const overdueStore = useOverdueStore()

const overdueRecordId = computed(() => String(route.params.id ?? ''))
const initialMethod = normalizeQueryValue(route.query.method)

const selectedMethod = ref<OverdueHandleType>(
  isHandleType(initialMethod) ? initialMethod : OverdueHandleType.WARNING,
)
const remark = ref('')
const compensationAmount = ref('')
const submitting = ref(false)

const currentRecord = computed(() => overdueStore.currentRecord)
const matchedCurrentRecord = computed(() => {
  return currentRecord.value?.id === overdueRecordId.value ? currentRecord.value : null
})
const needsCompensation = computed(() => selectedMethod.value === OverdueHandleType.COMPENSATION)
const isDeviceAdmin = computed(() => authStore.userRole === UserRole.DEVICE_ADMIN)

function parseCompensationAmount() {
  const normalizedText = String(compensationAmount.value ?? '').trim()

  if (!needsCompensation.value) {
    return undefined
  }

  if (!normalizedText) {
    ElMessage.warning('赔偿金额不能为空')
    return null
  }

  const amount = Number(normalizedText)

  if (!Number.isFinite(amount) || amount < 0) {
    ElMessage.warning('赔偿金额必须是大于等于 0 的有效数字')
    return null
  }

  return amount
}

/**
 * 处理页优先展示后端已回传的真实名称；若当前环境仍只有 ID，则继续展示 ID，
 * 避免管理员在联调阶段因为字段缺失直接失去定位单据的能力。
 */
function displayIdentityName(name: string | null | undefined, fallbackId: string) {
  return name?.trim() || fallbackId
}

async function loadRecord() {
  if (!overdueRecordId.value) {
    return
  }

  await overdueStore.fetchOverdueDetail(overdueRecordId.value)
}

function handleSelectMethod(type: OverdueHandleType) {
  selectedMethod.value = type

  if (type !== OverdueHandleType.COMPENSATION) {
    compensationAmount.value = ''
  }
}

async function handleSubmit() {
  if (
    !isDeviceAdmin.value ||
    !overdueRecordId.value ||
    !matchedCurrentRecord.value ||
    matchedCurrentRecord.value.processingStatus === OverdueProcessingStatus.PROCESSED
  ) {
    return
  }

  submitting.value = true

  try {
    const normalizedCompensationAmount = parseCompensationAmount()

    if (normalizedCompensationAmount === null) {
      return
    }

    const payload = {
      processingMethod: selectedMethod.value,
      remark: remark.value.trim() || undefined,
      compensationAmount: normalizedCompensationAmount,
    }

    await overdueStore.processRecord(overdueRecordId.value, payload)
    ElMessage.success('逾期处理完成')
    await router.push(`/overdue/${overdueRecordId.value}`)
  } finally {
    submitting.value = false
  }
}

function handleBack() {
  if (!overdueRecordId.value) {
    void router.push('/overdue')
    return
  }

  void router.push(`/overdue/${overdueRecordId.value}`)
}

watch(
  overdueRecordId,
  (value) => {
    if (!value) {
      overdueStore.resetCurrentRecord()
      return
    }

    void loadRecord()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  overdueStore.resetCurrentRecord()
})
</script>

<template>
  <section class="overdue-handle-view">
    <ConsolePageHero
      eyebrow="Process Overdue"
      title="逾期处理"
      description="选择警告、赔偿或继续使用作为最终裁决；赔偿金额只在赔偿模式下生效，其余模式继续按后端真实 DTO 空值处理。"
      class="overdue-handle-view__hero"
    >
      <template #actions>
        <div class="overdue-handle-view__actions">
          <el-button @click="handleBack">返回详情</el-button>
          <el-button
            class="overdue-handle-view__submit"
            type="danger"
            :loading="submitting"
            :disabled="
              !isDeviceAdmin ||
              !matchedCurrentRecord ||
              matchedCurrentRecord.processingStatus === OverdueProcessingStatus.PROCESSED
            "
            @click="handleSubmit"
          >
            提交处理结果
          </el-button>
        </div>
      </template>
    </ConsolePageHero>

    <EmptyState
      v-if="!matchedCurrentRecord && !overdueStore.loading"
      title="未找到待处理逾期记录"
      description="请先从逾期列表或详情页进入处理流程。"
      action-text="返回逾期列表"
      @action="router.push('/overdue')"
    />

    <template v-else-if="matchedCurrentRecord">
      <ConsoleDetailLayout class="overdue-handle-view__layout">
        <template #main>
          <article class="overdue-handle-view__summary-panel">
            <div class="overdue-handle-view__panel-header">
              <p class="overdue-handle-view__eyebrow">Snapshot</p>
              <h2>当前逾期信息</h2>
            </div>

            <dl class="overdue-handle-view__detail-list">
              <div>
                <dt>逾期记录 ID</dt>
                <dd>{{ matchedCurrentRecord.id }}</dd>
              </div>
              <div>
                <dt>借还记录 ID</dt>
                <dd>{{ matchedCurrentRecord.borrowRecordId }}</dd>
              </div>
              <div>
                <dt>设备</dt>
                <dd>
                  {{
                    displayIdentityName(
                      matchedCurrentRecord.deviceName,
                      matchedCurrentRecord.deviceId,
                    )
                  }}
                </dd>
              </div>
              <div>
                <dt>用户</dt>
                <dd>
                  {{
                    displayIdentityName(matchedCurrentRecord.userName, matchedCurrentRecord.userId)
                  }}
                </dd>
              </div>
              <div>
                <dt>逾期时长</dt>
                <dd>
                  {{ matchedCurrentRecord.overdueHours }} 小时 /
                  {{ matchedCurrentRecord.overdueDays }} 天
                </dd>
              </div>
              <div>
                <dt>发现时间</dt>
                <dd>{{ formatDateTime(matchedCurrentRecord.createdAt) }}</dd>
              </div>
            </dl>
          </article>
        </template>

        <template #aside>
          <ConsoleAsidePanel
            title="选择处理方式"
            description="设备管理员在这里明确选择处理方式、处理备注与赔偿金额，直接对齐后端 ProcessOverdueRequest。"
          >
            <div class="overdue-handle-view__panel-header">
              <p class="overdue-handle-view__eyebrow">Decision</p>
              <h2>选择处理方式</h2>
            </div>

            <div class="overdue-handle-view__method-grid">
              <button
                v-for="type in Object.values(OverdueHandleType)"
                :key="type"
                class="overdue-handle-view__method-card"
                :class="{ 'overdue-handle-view__method-card--active': selectedMethod === type }"
                type="button"
                @click="handleSelectMethod(type)"
              >
                <OverdueHandleTypeTag :type="type" />
              </button>
            </div>

            <label class="overdue-handle-view__field">
              <span>处理备注</span>
              <textarea
                v-model="remark"
                rows="5"
                placeholder="请输入处理结论、沟通情况或后续安排。"
              />
            </label>

            <label v-if="needsCompensation" class="overdue-handle-view__field">
              <span>赔偿金额</span>
              <input
                v-model="compensationAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="请输入赔偿金额"
              />
            </label>
          </ConsoleAsidePanel>
        </template>
      </ConsoleDetailLayout>
    </template>
  </section>
</template>

<style scoped lang="scss">
.overdue-handle-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.overdue-handle-view__hero,
.overdue-handle-view__summary-panel,
.overdue-handle-view__form-panel {
  border: 1px solid var(--app-border-soft);
  border-radius: 28px;
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-card);
  padding: 24px 28px;
}

.overdue-handle-view__hero {
  background: linear-gradient(
    135deg,
    var(--app-surface-card-strong),
    var(--app-tone-danger-surface)
  );
}

.overdue-handle-view__hero,
.overdue-handle-view__actions,
.overdue-handle-view__layout,
.overdue-handle-view__method-grid {
  display: flex;
  justify-content: space-between;
  gap: 18px;
}

.overdue-handle-view__summary-panel,
.overdue-handle-view__form-panel {
  flex: 1;
}

.overdue-handle-view__method-grid {
  margin-top: 18px;
}

.overdue-handle-view__hero :deep(.console-page-hero__eyebrow),
.overdue-handle-view__eyebrow {
  margin: 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--app-tone-danger-text);
}

.overdue-handle-view__hero :deep(.console-page-hero__title),
.overdue-handle-view__panel-header h2 {
  margin: 10px 0 0;
  font-family: 'Fira Code', monospace;
}

.overdue-handle-view__hero :deep(.console-page-hero__title) {
  color: var(--app-tone-danger-text-strong);
}

.overdue-handle-view__hero :deep(.console-page-hero__description) {
  max-width: 760px;
  margin: 14px 0 0;
  line-height: 1.8;
  color: var(--app-tone-danger-text);
}

.overdue-handle-view__detail-list {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.overdue-handle-view__detail-list dt,
.overdue-handle-view__field span {
  color: var(--app-text-secondary);
}

.overdue-handle-view__detail-list dd {
  margin: 6px 0 0;
  font-family: 'Fira Code', monospace;
  color: var(--app-text-primary);
}

.overdue-handle-view__method-card {
  flex: 1;
  padding: 18px;
  border: 1px solid var(--app-border-soft);
  border-radius: 20px;
  background: var(--app-surface-card-strong);
  color: var(--app-text-primary);
  cursor: pointer;
}

.overdue-handle-view__method-card--active {
  border-color: var(--app-tone-danger-border);
  box-shadow: var(--app-shadow-card);
}

.overdue-handle-view__field {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 18px;
}

.overdue-handle-view__field textarea,
.overdue-handle-view__field input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--app-border-strong);
  border-radius: 16px;
  background: var(--app-surface-card-strong);
  color: var(--app-text-primary);
  font: inherit;
}

.overdue-handle-view__field textarea {
  resize: vertical;
}

// 处理页右侧既包含按钮态卡片也包含原生表单控件，页面层继续包一层 token，确保深色主题下决策区和左侧快照保持同一阅读层次。
.overdue-handle-view__layout :deep(.console-aside-panel) {
  border: 1px solid var(--app-border-soft);
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-card);
}
</style>
