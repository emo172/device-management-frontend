<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

import ConflictWarning from '@/components/business/ConflictWarning.vue'
import TimeRangePicker from '@/components/business/TimeRangePicker.vue'
import { validateReservationTimeRange } from '@/utils'

interface ReservationFormValue {
  deviceId: string
  startTime: string
  endTime: string
  purpose: string
  remark: string
}

interface DeviceOption {
  id: string
  name: string
  deviceNumber: string
  status: string
}

/**
 * 预约表单组件。
 * 创建页和后续编辑/代预约能力都会依赖同一套字段规则，因此把设备选择、时间范围、用途与备注统一收口在组件内，
 * 由页面层只处理角色差异和最终提交动作。
 */
const props = withDefaults(
  defineProps<{
    initialValue: ReservationFormValue
    deviceOptions: DeviceOption[]
    serverConflictMessage?: string
    submitting?: boolean
  }>(),
  {
    serverConflictMessage: '',
    submitting: false,
  },
)

const emit = defineEmits<{
  submit: [value: ReservationFormValue]
  'clear-conflict': []
}>()

const formState = reactive<ReservationFormValue>({
  deviceId: '',
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

  if (!formState.deviceId) {
    warnings.push('请选择预约设备')
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

function handleDeviceChange(value: string) {
  formState.deviceId = value
  emitClearConflict()
}

function handleTimeRangeChange(value: Pick<ReservationFormValue, 'startTime' | 'endTime'>) {
  formState.startTime = value.startTime
  formState.endTime = value.endTime
  emitClearConflict()
}

function handlePurposeChange(value: string) {
  formState.purpose = value
  emitClearConflict()
}

function handleRemarkChange(value: string) {
  formState.remark = value
  emitClearConflict()
}

function handleSubmit() {
  if (localWarnings.value.length > 0) {
    return
  }

  emit('submit', {
    deviceId: formState.deviceId,
    startTime: formState.startTime,
    endTime: formState.endTime,
    purpose: formState.purpose.trim(),
    remark: formState.remark.trim(),
  })
}
</script>

<template>
  <el-form label-position="top" class="reservation-form">
    <div class="reservation-form__grid">
      <el-form-item label="预约设备">
        <el-select
          :model-value="formState.deviceId"
          class="reservation-form__device"
          placeholder="请选择可预约设备"
          @update:modelValue="handleDeviceChange"
        >
          <el-option
            v-for="device in deviceOptions"
            :key="device.id"
            :label="`${device.name}（${device.deviceNumber}）`"
            :value="device.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="预约时间范围" class="reservation-form__time-item">
        <TimeRangePicker
          :model-value="{ startTime: formState.startTime, endTime: formState.endTime }"
          @update:modelValue="handleTimeRangeChange"
        />
      </el-form-item>

      <el-form-item label="预约用途" class="reservation-form__purpose-item">
        <el-input
          :model-value="formState.purpose"
          class="reservation-form__purpose"
          placeholder="请输入预约用途"
          @update:modelValue="handlePurposeChange"
        />
      </el-form-item>

      <el-form-item label="备注" class="reservation-form__remark-item">
        <el-input
          :model-value="formState.remark"
          class="reservation-form__remark"
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
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.94);
}

.reservation-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 18px;
  margin-bottom: 18px;
}

.reservation-form__time-item,
.reservation-form__purpose-item,
.reservation-form__remark-item {
  grid-column: 1 / -1;
}

.reservation-form__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}
</style>
