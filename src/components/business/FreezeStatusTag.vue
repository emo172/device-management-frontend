<script setup lang="ts">
import { computed } from 'vue'

import { FreezeStatus, FreezeStatusLabel, FreezeStatusTagType } from '@/enums'

/**
 * 账户冻结状态标签。
 * 虽然本轮主场景是设备模块，但后续设备详情关联借用人风险提示时也会复用冻结状态展示，因此提前沉淀为通用业务组件。
 */
const props = defineProps<{
  status: FreezeStatus
}>()

const label = computed(() => FreezeStatusLabel[props.status] || props.status)
const tagType = computed(() => FreezeStatusTagType[props.status] || 'info')
</script>

<template>
  <el-tag :type="tagType" effect="light">{{ label }}</el-tag>
</template>
