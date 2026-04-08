<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

import ConflictWarning from '@/components/business/ConflictWarning.vue'
import TimeRangePicker from '@/components/business/TimeRangePicker.vue'
import { validateReservationTimeRange } from '@/utils'

interface ReservationFormValue {
  startTime: string
  endTime: string
  purpose: string
  remark: string
}

/**
 * 预约表单组件。
 * T7 起设备搜索、多选、分页和已选面板都上移到创建页，
 * 表单只继续承接时间、用途、备注与提交动作，避免旧单设备下拉继续成为创建链路的事实来源。
 */
const props = withDefaults(
  defineProps<{
    initialValue: ReservationFormValue
    selectedDeviceCount: number
    serverConflictMessage?: string
    submitting?: boolean
  }>(),
  {
    serverConflictMessage: '',
    submitting: false,
  },
)

const emit = defineEmits<{
  change: [value: ReservationFormValue]
  submit: [value: ReservationFormValue]
  'clear-conflict': []
}>()

const formState = reactive<ReservationFormValue>({
  startTime: '',
  endTime: '',
  purpose: '',
  remark: '',
})

watch(
  () => props.initialValue,
  (value) => {
    Object.assign(formState, value)
  },
  { immediate: true, deep: true },
)

const localWarnings = computed(() => {
  const warnings: string[] = []

  /**
   * 已选设备真相已经独立收口到创建页，但提交入口仍在表单中，
   * 所以前端要在这里继续阻止“零设备提交”，避免空设备请求落到后端才失败。
   */
  if (props.selectedDeviceCount === 0) {
    warnings.push('请至少选择 1 台设备')
  }

  warnings.push(
    ...validateReservationTimeRange({
      startTime: formState.startTime,
      endTime: formState.endTime,
    }),
  )

  if (!formState.purpose.trim()) {
    warnings.push('预约用途不能为空')
  }

  return warnings
})

function emitClearConflict() {
  emit('clear-conflict')
}

function emitFormChange() {
  emit('change', {
    startTime: formState.startTime,
    endTime: formState.endTime,
    purpose: formState.purpose,
    remark: formState.remark,
  })
}

function handleTimeRangeChange(value: Pick<ReservationFormValue, 'startTime' | 'endTime'>) {
  formState.startTime = value.startTime
  formState.endTime = value.endTime
  emitClearConflict()
  emitFormChange()
}

function handlePurposeChange(value: string) {
  formState.purpose = value
  emitClearConflict()
  emitFormChange()
}

function handleRemarkChange(value: string) {
  formState.remark = value
  emitClearConflict()
  emitFormChange()
}

function handleSubmit() {
  if (localWarnings.value.length > 0) {
    return
  }

  emit('submit', {
    startTime: formState.startTime,
    endTime: formState.endTime,
    purpose: formState.purpose.trim(),
    remark: formState.remark.trim(),
  })
}
</script>

<template>
  <el-form label-position="top" class="reservation-form" data-testid="reservation-form">
    <div class="reservation-form__grid">
      <el-form-item label="预约时间范围" class="reservation-form__time-item">
        <!-- 时间范围测试钩子必须落在真实容器上，避免 TimeRangePicker 不透传 attrs 时浏览器里查不到节点。 -->
        <div class="reservation-form__time-range" data-testid="reservation-time-range">
          <TimeRangePicker
            :model-value="{ startTime: formState.startTime, endTime: formState.endTime }"
            @update:modelValue="handleTimeRangeChange"
          />
        </div>
      </el-form-item>

      <el-form-item label="预约用途" class="reservation-form__purpose-item">
        <el-input
          :model-value="formState.purpose"
          class="reservation-form__purpose"
          data-testid="reservation-purpose-input"
          placeholder="请输入预约用途"
          @update:modelValue="handlePurposeChange"
        />
      </el-form-item>

      <el-form-item label="备注" class="reservation-form__remark-item">
        <el-input
          :model-value="formState.remark"
          class="reservation-form__remark"
          data-testid="reservation-remark-input"
          type="textarea"
          :rows="4"
          placeholder="可选：补充实验安排、携带材料等说明"
          @update:modelValue="handleRemarkChange"
        />
      </el-form-item>
    </div>

    <ConflictWarning
      :local-warnings="localWarnings"
      :server-conflict-message="serverConflictMessage"
    />

    <div class="reservation-form__actions">
      <el-button
        class="reservation-form__submit"
        data-testid="reservation-submit-button"
        type="primary"
        :loading="submitting"
        @click="handleSubmit"
      >
        提交预约
      </el-button>
    </div>
  </el-form>
</template>

<style scoped lang="scss">
.reservation-form {
  padding: 24px;
  border: 1px solid var(--app-border-soft);
  border-radius: var(--app-radius-lg);
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-solid);
}

// 预约表单在深色下需要让时间、用途和备注共用同一实体输入表面，避免冲突提示上方出现浅色孤岛。
.reservation-form :deep(.el-input__wrapper),
.reservation-form :deep(.el-textarea__inner),
.reservation-form :deep(.el-input-number) {
  background: var(--app-surface-card-strong);
  box-shadow: inset 0 0 0 1px var(--app-border-soft);
}

.reservation-form :deep(.el-input__wrapper:hover),
.reservation-form :deep(.el-textarea__inner:hover),
.reservation-form :deep(.el-input-number:hover) {
  box-shadow: inset 0 0 0 1px var(--app-border-strong);
}

.reservation-form__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px 18px;
  margin-bottom: 18px;
}

.reservation-form__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}
</style>
