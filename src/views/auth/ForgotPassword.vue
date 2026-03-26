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
    title="重置登录密码"
    description="通过注册邮箱完成身份校验后设置新密码，再返回登录页继续访问系统。"
    helper-text="如果验证码未收到，请检查垃圾邮件或等待冷却结束后重新发送。"
  />
</template>
