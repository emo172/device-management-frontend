<script setup lang="ts">
import { computed } from 'vue'

import { DeviceStatus, DeviceStatusLabel, DeviceStatusTagType } from '@/enums'

const deviceStatusCompatibilityLabel: Record<string, string> = {
  RETIRED: '已退役',
}

const deviceStatusCompatibilityTagType: Record<string, string> = {
  RETIRED: 'info',
}

/**
 * 设备状态标签。
 * 设备域与借还域共用 `BORROWED` 等状态码，为避免页面误用错误中文口径，这里固定绑定设备域标签映射。
 * 同时兼容后端已落库但枚举尚未全量迁移到前端真相源的状态码，避免详情与列表回退成原始英文。
 */
const props = defineProps<{
  status: string
}>()

const label = computed(() => {
  return (
    DeviceStatusLabel[props.status as DeviceStatus] ||
    deviceStatusCompatibilityLabel[props.status] ||
    props.status
  )
})

const tagType = computed(() => {
  return (
    DeviceStatusTagType[props.status as DeviceStatus] ||
    deviceStatusCompatibilityTagType[props.status] ||
    'info'
  )
})
</script>

<template>
  <el-tag :type="tagType" effect="light">{{ label }}</el-tag>
</template>
