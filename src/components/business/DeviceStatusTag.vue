<script setup lang="ts">
import { computed } from 'vue'

import { DeviceStatus, DeviceStatusLabel, DeviceStatusTagType } from '@/enums'

/**
 * 设备状态标签。
 * 设备域与借还域共用 `BORROWED` 等状态码，为避免页面误用错误中文口径，这里固定绑定设备域标签映射。
 */
const props = defineProps<{
  status: DeviceStatus
}>()

const label = computed(() => DeviceStatusLabel[props.status] || props.status)
const tagType = computed(() => DeviceStatusTagType[props.status] || 'info')
</script>

<template>
  <el-tag :type="tagType" effect="light">{{ label }}</el-tag>
</template>
