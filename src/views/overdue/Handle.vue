<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { LocationQueryValue } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'

import OverdueHandleTypeTag from '@/components/business/OverdueHandleTypeTag.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { OverdueHandleType, OverdueProcessingStatus } from '@/enums'
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
const needsCompensation = computed(() => selectedMethod.value === OverdueHandleType.COMPENSATION)

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
  if (!overdueRecordId.value) {
    return
  }

  submitting.value = true

  try {
    const payload = {
      processingMethod: selectedMethod.value,
      remark: remark.value.trim() || undefined,
      compensationAmount: needsCompensation.value
        ? Number(compensationAmount.value || 0)
        : undefined,
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

onMounted(() => {
  void loadRecord()
})

onBeforeUnmount(() => {
  overdueStore.resetCurrentRecord()
})
</script>

<template>
  <section class="overdue-handle-view">
    <header class="overdue-handle-view__hero">
      <div>
        <p class="overdue-handle-view__eyebrow">Process Overdue</p>
        <h1>逾期处理</h1>
        <p>
          选择警告、赔偿或继续使用作为最终裁决。赔偿金额只在赔偿模式下生效，其余模式继续按后端真实
          DTO 空值处理。
        </p>
      </div>

      <div class="overdue-handle-view__actions">
        <el-button @click="handleBack">返回详情</el-button>
        <el-button
          class="overdue-handle-view__submit"
          type="danger"
          :loading="submitting"
          :disabled="currentRecord?.processingStatus === OverdueProcessingStatus.PROCESSED"
          @click="handleSubmit"
        >
          提交处理结果
        </el-button>
      </div>
    </header>

    <EmptyState
      v-if="!currentRecord && !overdueStore.loading"
      title="未找到待处理逾期记录"
      description="请先从逾期列表或详情页进入处理流程。"
      action-text="返回逾期列表"
      @action="router.push('/overdue')"
    />

    <template v-else-if="currentRecord">
      <section class="overdue-handle-view__layout">
        <article class="overdue-handle-view__summary-panel">
          <div class="overdue-handle-view__panel-header">
            <p class="overdue-handle-view__eyebrow">Snapshot</p>
            <h2>当前逾期信息</h2>
          </div>

          <dl class="overdue-handle-view__detail-list">
            <div>
              <dt>逾期记录 ID</dt>
              <dd>{{ currentRecord.id }}</dd>
            </div>
            <div>
              <dt>借还记录 ID</dt>
              <dd>{{ currentRecord.borrowRecordId }}</dd>
            </div>
            <div>
              <dt>逾期时长</dt>
              <dd>{{ currentRecord.overdueHours }} 小时 / {{ currentRecord.overdueDays }} 天</dd>
            </div>
            <div>
              <dt>发现时间</dt>
              <dd>{{ formatDateTime(currentRecord.createdAt) }}</dd>
            </div>
          </dl>
        </article>

        <article class="overdue-handle-view__form-panel">
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
        </article>
      </section>
    </template>
  </section>
</template>

<style scoped lang="scss">
.overdue-handle-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: #1e293b;
}

.overdue-handle-view__hero,
.overdue-handle-view__summary-panel,
.overdue-handle-view__form-panel {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
  padding: 24px 28px;
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

.overdue-handle-view__eyebrow {
  margin: 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #e11d48;
}

.overdue-handle-view__hero h1,
.overdue-handle-view__panel-header h2 {
  margin: 10px 0 0;
  font-family: 'Fira Code', monospace;
}

.overdue-handle-view__hero p:not(.overdue-handle-view__eyebrow) {
  max-width: 760px;
  margin: 14px 0 0;
  line-height: 1.8;
  color: #475569;
}

.overdue-handle-view__detail-list {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.overdue-handle-view__detail-list dt,
.overdue-handle-view__field span {
  color: #64748b;
}

.overdue-handle-view__detail-list dd {
  margin: 6px 0 0;
  font-family: 'Fira Code', monospace;
}

.overdue-handle-view__method-card {
  flex: 1;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 20px;
  background: #fff;
  cursor: pointer;
}

.overdue-handle-view__method-card--active {
  border-color: rgba(225, 29, 72, 0.45);
  box-shadow: 0 16px 36px rgba(225, 29, 72, 0.12);
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
  border: 1px solid rgba(148, 163, 184, 0.32);
  border-radius: 16px;
  font: inherit;
}

.overdue-handle-view__field textarea {
  resize: vertical;
}
</style>
