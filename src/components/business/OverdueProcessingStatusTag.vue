<script setup lang="ts">
import { computed } from 'vue'

import {
  OverdueProcessingStatus,
  OverdueProcessingStatusLabel,
  OverdueProcessingStatusTagType,
} from '@/enums'

/**
 * 逾期处理状态标签。
 * 逾期页面同时展示待处理与已处理记录，统一组件能保证列表、详情和告警区始终使用同一中文口径与颜色语义。
 */
const props = defineProps<{
  status: OverdueProcessingStatus | string
}>()

const normalizedStatus = computed(() => props.status as OverdueProcessingStatus)
const label = computed(() => OverdueProcessingStatusLabel[normalizedStatus.value] ?? props.status)
const tagType = computed(() => OverdueProcessingStatusTagType[normalizedStatus.value] ?? 'info')
</script>

<template>
  <el-tag :type="tagType" effect="light" round>
    {{ label }}
  </el-tag>
</template>
