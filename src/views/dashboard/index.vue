<script setup lang="ts">
import ViewPlaceholder from '@/views/common/ViewPlaceholder.vue'

/**
 * 仪表盘占位页。
 * Chunk 3 只需要先把登录后的默认落点稳定下来，真实的用户/管理员仪表盘会在后续 Chunk 单独实现。
 */
</script>

<template>
  <ViewPlaceholder
    eyebrow="Dashboard"
    title="仪表盘骨架已接入"
    description="当前页面用于承接登录后的默认重定向与布局展示，后续会根据 USER、DEVICE_ADMIN、SYSTEM_ADMIN 三类角色分流到各自的仪表盘内容。"
  />
</template>
