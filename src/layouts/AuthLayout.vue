<script setup lang="ts">
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'

/**
 * 认证布局。
 * 登录、注册和密码找回页面都使用统一的居中壳层，避免每个认证页各自维护一套视觉结构。
 */
</script>

<template>
  <main class="auth-layout">
    <section class="auth-layout__shell">
      <!-- 左侧 Hero 面板只负责传达系统定位与公开页上下文，不承载任何认证表单交互。 -->
      <ConsolePageHero
        eyebrow="Device Management Frontend"
        title="智能设备管理系统"
        description="认证模块正在逐步接入完整业务流程，当前先保证公开路由、布局承载与守卫跳转链路稳定可用。"
        class="auth-layout__hero-panel"
      >
        <p class="auth-layout__hero-note">
          公开认证页统一沿用轻玻璃视觉，但输入与提交区域仍保持更稳的实体感，避免首屏信息与表单层次互相抢焦点。
        </p>
      </ConsolePageHero>

      <!-- 右侧内容面板只承接认证表单本体，方便登录、注册和找回密码页面复用同一布局骨架。 -->
      <div class="auth-layout__content-panel">
        <slot />
      </div>
    </section>
  </main>
</template>

<style scoped lang="scss">
@use '@/assets/styles/console-shell' as shell;

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

.auth-layout__hero-panel {
  min-height: 100%;
}

.auth-layout__content-panel {
  @include shell.console-solid-surface;

  padding: 36px;
  border-radius: var(--app-radius-lg);
}

.auth-layout__hero-note {
  margin: 0;
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
