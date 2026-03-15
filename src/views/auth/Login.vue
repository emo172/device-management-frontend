<script setup lang="ts">
/**
 * 登录占位页。
 * Chunk 1 先提供一个最小可访问入口，确保 401 失效跳转能落到明确页面；
 * 真正的登录表单、校验与提交流程会在后续认证模块 Chunk 中补齐。
 */
</script>

<template>
  <main class="login-placeholder">
    <section class="login-placeholder__card">
      <p class="login-placeholder__eyebrow">Auth Entry</p>
      <h1 class="login-placeholder__title">登录页面骨架已就绪</h1>
      <p class="login-placeholder__description">
        当前页面用于承接会话失效跳转，后续会补齐账号登录、注册、找回密码等完整认证流程。
      </p>
    </section>
  </main>
</template>

<style scoped lang="scss">
.login-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 32px;
}

.login-placeholder__card {
  width: min(560px, 100%);
  padding: 36px;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 24px 72px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(12px);
}

.login-placeholder__eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--app-color-primary);
}

.login-placeholder__title {
  margin: 0;
  font-size: 32px;
  line-height: 1.2;
  color: var(--app-text-primary);
}

.login-placeholder__description {
  margin: 16px 0 0;
  font-size: 15px;
  line-height: 1.8;
  color: var(--app-text-secondary);
}
</style>
