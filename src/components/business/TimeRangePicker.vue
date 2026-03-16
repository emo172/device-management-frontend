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

const rangeValue = computed(() => [props.modelValue.startTime, props.modelValue.endTime])

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
  <el-date-picker
    class="time-range-picker"
    :model-value="rangeValue"
    type="datetimerange"
    range-separator="至"
    start-placeholder="请选择开始时间"
    end-placeholder="请选择结束时间"
    format="YYYY-MM-DD HH:mm:ss"
    value-format="YYYY-MM-DDTHH:mm:ss"
    :disabled-hours="disabledHours"
    :disabled-minutes="disabledMinutes"
    :disabled-seconds="disabledSeconds"
    @update:modelValue="handleRangeChange"
  />
</template>
