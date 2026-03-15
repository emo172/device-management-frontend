<script setup lang="ts">
/**
 * 认证布局。
 * 登录、注册和密码找回页面都使用统一的居中壳层，避免每个认证页各自维护一套视觉结构。
 */
</script>

<template>
  <main class="auth-layout">
    <section class="auth-layout__shell">
      <div class="auth-layout__hero">
        <p class="auth-layout__eyebrow">Device Management Frontend</p>
        <h1 class="auth-layout__title">智能设备管理系统</h1>
        <p class="auth-layout__description">
          认证模块正在逐步接入完整业务流程，当前先保证公开路由、布局承载与守卫跳转链路稳定可用。
        </p>
      </div>
      <div class="auth-layout__content">
        <slot />
      </div>
    </section>
  </main>
</template>

<style scoped lang="scss">
.auth-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 32px;
  background:
    radial-gradient(circle at top left, rgba(245, 158, 11, 0.22), transparent 30%),
    radial-gradient(circle at right bottom, rgba(15, 118, 110, 0.14), transparent 36%),
    linear-gradient(135deg, #f7f4ec 0%, #eef5f7 100%);
}

.auth-layout__shell {
  display: grid;
  grid-template-columns: minmax(280px, 420px) minmax(320px, 520px);
  gap: 24px;
  width: min(1120px, 100%);
}

.auth-layout__hero,
.auth-layout__content {
  padding: 36px;
  border: 1px solid rgba(255, 255, 255, 0.62);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: 0 24px 72px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(14px);
}

.auth-layout__eyebrow {
  margin: 0 0 14px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--app-color-primary);
}

.auth-layout__title {
  margin: 0;
  font-size: clamp(34px, 5vw, 54px);
  line-height: 1.08;
  color: var(--app-text-primary);
}

.auth-layout__description {
  margin: 16px 0 0;
  font-size: 15px;
  line-height: 1.8;
  color: var(--app-text-secondary);
}

@media (max-width: 960px) {
  .auth-layout__shell {
    grid-template-columns: 1fr;
  }
}
</style>
