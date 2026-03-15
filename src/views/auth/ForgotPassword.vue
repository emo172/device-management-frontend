<script setup lang="ts">
import ViewPlaceholder from '@/views/common/ViewPlaceholder.vue'

/**
 * 忘记密码页占位实现。
 * 先保证公开路由、守卫白名单和认证布局完整，后续再补邮箱验证码与密码重置交互。
 */
</script>

<template>
  <ViewPlaceholder
    eyebrow="Auth / Forgot Password"
    title="忘记密码流程待接入"
    description="当前页面用于提前打通公开认证路由与跳转链路，后续 Chunk 会补齐邮箱验证码、倒计时与重置密码表单。"
  />
</template>
