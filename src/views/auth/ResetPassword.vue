<script setup lang="ts">
import PasswordResetPanel from './components/PasswordResetPanel.vue'

/**
 * 重置密码页。
 * 保留独立路由承载相同的密码重置表单，便于未来从邮件、后台引导或其他公开入口直接跳转到该页。
 */
</script>

<template>
  <PasswordResetPanel
    eyebrow="Auth / Reset Password"
    title="重新设置登录密码"
    description="如果你已经拿到验证码，也可以直接在这里完成密码重置并回到登录页。"
    helper-text="重置密码不会自动登录，新密码生效后请使用新凭据重新进入系统。"
  />
</template>
