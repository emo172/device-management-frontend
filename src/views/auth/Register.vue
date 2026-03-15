<script setup lang="ts">
import ViewPlaceholder from '@/views/common/ViewPlaceholder.vue'

/**
 * 注册页占位实现。
 * Chunk 3 先保证公开路由和认证布局成型，具体注册表单会在认证页面 Chunk 中补齐。
 */
</script>

<template>
  <ViewPlaceholder
    eyebrow="Auth / Register"
    title="注册页面待接入完整表单"
    description="当前先提供可访问的注册路由，占位承接认证布局、公开路由与导航跳转，后续 Chunk 会补齐注册字段、校验与自动登录流程。"
  />
</template>
