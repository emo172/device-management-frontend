<script setup lang="ts">
import { computed } from 'vue'

interface TimeRangeValue {
  startTime: string
  endTime: string
}

/**
 * 预约时间范围选择器。
 * 创建页统一把 Element Plus 的时间区间选择结果收口成 `{ startTime, endTime }`，
 * 避免页面和表单层分别处理数组结构，导致后续提交 DTO 拼装口径不一致。
 */
const props = defineProps<{
  modelValue: TimeRangeValue
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TimeRangeValue]
}>()

/**
 * `el-date-picker` 的区间值在空态时必须传 `null`，否则会把 `['', '']` 误当成已选择范围，
 * 进而让创建页初始态出现不可预测的运行时行为。
 * 若用户处于半选状态，则继续保留空字符串占位，避免打断当前输入过程。
 */
const rangeValue = computed<string[] | null>(() => {
  const { startTime, endTime } = props.modelValue

  if (!startTime && !endTime) {
    return null
  }

  if (startTime && endTime) {
    return [startTime, endTime]
  }

  return [startTime || '', endTime || '']
})

/**
 * 默认补齐预约时间窗口的上下边界，确保日期面板在选中日期后仍优先落到业务允许的 08:00 与 22:00。
 */
const defaultTime = [new Date(2000, 0, 1, 8, 0, 0), new Date(2000, 0, 1, 22, 0, 0)]

function disabledHours() {
  return Array.from({ length: 24 }, (_, hour) => hour).filter((hour) => hour < 8 || hour > 22)
}

function disabledMinutes(hour: number) {
  if (hour !== 22) {
    return []
  }

  return Array.from({ length: 59 }, (_, minute) => minute + 1)
}

function disabledSeconds(hour: number, minute: number) {
  if (hour !== 22 || minute !== 0) {
    return []
  }

  return Array.from({ length: 59 }, (_, second) => second + 1)
}

function handleRangeChange(value: string[] | null) {
  emit('update:modelValue', {
    startTime: value?.[0] || '',
    endTime: value?.[1] || '',
  })
}
</script>

<template>
  <el-date-picker class="time-range-picker" :model-value="rangeValue" :default-time="defaultTime" type="datetimerange"
    range-separator="至" start-placeholder="请选择开始时间" end-placeholder="请选择结束时间" format="YYYY-MM-DD HH:mm:ss"
    value-format="YYYY-MM-DDTHH:mm:ss" :disabled-hours="disabledHours" :disabled-minutes="disabledMinutes"
    :disabled-seconds="disabledSeconds" @update:modelValue="handleRangeChange" />
</template>
