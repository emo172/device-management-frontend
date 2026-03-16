<script setup lang="ts">
import { computed } from 'vue'

import { CheckInStatus, CheckInStatusLabel, CheckInStatusTagType } from '@/enums'

const checkInStatusLabelMap = CheckInStatusLabel as Record<string, string>
const checkInStatusTagTypeMap = CheckInStatusTagType as Record<string, string>

function normalizeCheckInStatus(status: string) {
  /**
   * 真相源优先以后端实际代码为准；这里额外兼容文档曾出现过的别名值，避免联调阶段因为旧口径回包直接把标签渲染成空白。
   */
  if (status === 'NOT_SIGNED') {
    return CheckInStatus.NOT_CHECKED_IN
  }

  if (status === 'SIGNED_IN') {
    return CheckInStatus.CHECKED_IN
  }

  if (status === 'TIMEOUT') {
    return CheckInStatus.CHECKED_IN_TIMEOUT
  }

  return status
}

/**
 * 签到状态标签。
 * 列表页需要把“未签到 / 已签到 / 超时签到”直接暴露给用户，避免用户把预约状态误当成签到结果。
 */
const props = defineProps<{
  status: string
}>()

const normalizedStatus = computed(() => normalizeCheckInStatus(props.status))
const label = computed(() => checkInStatusLabelMap[normalizedStatus.value] || props.status)
const tagType = computed(() => checkInStatusTagTypeMap[normalizedStatus.value] || 'info')
</script>

<template>
  <el-tag :type="tagType" effect="light">{{ label }}</el-tag>
</template>
