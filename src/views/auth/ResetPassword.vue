<script setup lang="ts">
import ViewPlaceholder from '@/views/common/ViewPlaceholder.vue'

/**
 * 重置密码页占位实现。
 * 该页先用于补齐认证路由矩阵，避免守卫与公开页面导航落到不存在的目标页。
 */
</script>

<template>
  <ViewPlaceholder
    eyebrow="Auth / Reset Password"
    title="重置密码页面待完善"
    description="当前先提供稳定的页面入口，后续 Chunk 会补齐验证码校验、新密码设置与成功跳转逻辑。"
  />
</template>
