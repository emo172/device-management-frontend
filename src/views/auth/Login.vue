<script setup lang="ts">
import ViewPlaceholder from '@/views/common/ViewPlaceholder.vue'

/**
 * 登录页占位实现。
 * 路由与布局完成后，登录页不再自己占满整屏，而是交给 AuthLayout 承接统一视觉结构，避免重复维护认证容器样式。
 */
</script>

<template>
  <ViewPlaceholder
    eyebrow="Auth / Login"
    title="登录页面骨架已就绪"
    description="当前页面用于承接会话失效跳转，后续认证 Chunk 会补齐账号登录、注册跳转与密码找回入口。"
  />
</template>
