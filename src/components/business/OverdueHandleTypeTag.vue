<script setup lang="ts">
import { computed } from 'vue'

import { OverdueHandleType, OverdueHandleTypeLabel, OverdueHandleTypeTagType } from '@/enums'

/**
 * 逾期处理方式标签。
 * 管理员处理结果需要在列表与详情中稳定复现；这里把“警告 / 赔偿 / 继续使用”统一映射为业务标签，避免页面各写一份条件分支。
 */
const props = defineProps<{
  type: OverdueHandleType | string | null
}>()

const normalizedType = computed(() => props.type as OverdueHandleType)
const label = computed(() => {
  if (!props.type) {
    return '未处理'
  }

  return OverdueHandleTypeLabel[normalizedType.value] ?? props.type
})

const tagType = computed(() => {
  if (!props.type) {
    return 'info'
  }

  return OverdueHandleTypeTagType[normalizedType.value] ?? 'info'
})
</script>

<template>
  <el-tag :type="tagType" effect="light" round>
    {{ label }}
  </el-tag>
</template>
