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
    title="重置登录密码"
    description="如果你已经拿到验证码，可以直接完成密码重置，再返回登录页继续访问系统。"
    helper-text="新密码提交成功后不会自动登录，请使用新密码重新进入系统。"
  />
</template>
