<script setup lang="ts">
import { computed } from 'vue'

import { CheckInStatus, CheckInStatusLabel, CheckInStatusTagType } from '@/enums'
import { normalizeCheckInStatus } from '@/utils'

const checkInStatusLabelMap = CheckInStatusLabel as Record<string, string>
const checkInStatusTagTypeMap = CheckInStatusTagType as Record<string, string>

/**
 * 签到状态标签。
 * 列表页需要把“未签到 / 已签到 / 超时签到”直接暴露给用户，避免用户把预约状态误当成签到结果。
 */
const props = defineProps<{
  status: string
}>()

/**
 * 标签组件仍保留一层本地归一化，避免未经过 API/Store 标准化的旧回包直接渲染成裸状态码。
 */
const normalizedStatus = computed(() => normalizeCheckInStatus(props.status))
const label = computed(() => checkInStatusLabelMap[normalizedStatus.value] || props.status)
const tagType = computed(() => checkInStatusTagTypeMap[normalizedStatus.value] || 'info')
</script>

<template>
  <el-tag :type="tagType" effect="light">{{ label }}</el-tag>
</template>
