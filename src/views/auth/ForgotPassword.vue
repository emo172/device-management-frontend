<script setup lang="ts">
import PasswordResetPanel from './components/PasswordResetPanel.vue'

/**
 * 忘记密码页。
 * 该页是公开找回入口，文案强调通过邮箱验证码重设密码，适合从登录页的“忘记密码”链路进入。
 */
</script>

<template>
  <PasswordResetPanel
    eyebrow="Auth / Forgot Password"
    title="找回账号访问权限"
    description="通过注册邮箱接收验证码并设置新密码，成功后返回登录页重新建立会话。"
    helper-text="如果验证码未收到，请检查垃圾邮件或等待冷却结束后重新发送。"
  />
</template>
