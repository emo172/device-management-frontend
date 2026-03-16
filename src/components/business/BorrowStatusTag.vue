<script setup lang="ts">
import { computed } from 'vue'

import { BorrowStatus, BorrowStatusLabel, BorrowStatusTagType } from '@/enums'

/**
 * 借还状态标签。
 * 借还域与设备域都存在 `BORROWED` 等同名状态码，这里单独封装组件，避免页面误把设备状态中文“已借出”用于借还记录。
 */
const props = defineProps<{
  status: BorrowStatus | string
}>()

const normalizedStatus = computed(() => props.status as BorrowStatus)
const label = computed(() => BorrowStatusLabel[normalizedStatus.value] ?? props.status)
const tagType = computed(() => BorrowStatusTagType[normalizedStatus.value] ?? 'info')
</script>

<template>
  <el-tag :type="tagType" effect="light" round>
    {{ label }}
  </el-tag>
</template>
