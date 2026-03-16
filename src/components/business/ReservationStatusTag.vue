<script setup lang="ts">
import { computed } from 'vue'

import { ReservationStatusLabel, ReservationStatusTagType } from '@/enums'

const reservationStatusLabelMap = ReservationStatusLabel as Record<string, string>
const reservationStatusTagTypeMap = ReservationStatusTagType as Record<string, string>

/**
 * 预约状态标签。
 * 预约域必须区分待设备审批、待系统审批与待人工处理，不能复用其它业务域的通用状态文案。
 */
const props = defineProps<{
  status: string
}>()

const label = computed(() => reservationStatusLabelMap[props.status] || props.status)
const tagType = computed(() => reservationStatusTagTypeMap[props.status] || 'info')
</script>

<template>
  <el-tag :type="tagType" effect="light">{{ label }}</el-tag>
</template>
