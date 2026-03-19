<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'

/**
 * 默认业务布局。
 * 所有受保护业务页统一复用该壳层，确保侧边导航、头部通知与主内容区结构保持一致。
 */
</script>

<template>
  <div class="default-layout">
    <AppSidebar />
    <div class="default-layout__content">
      <!-- 顶栏仍由默认布局统一承接，避免业务页面重复实现通知、面包屑和折叠入口。 -->
      <header class="default-layout__header">
        <div class="default-layout__surface">
          <AppHeader />
        </div>
      </header>

      <!-- 主内容区单独包一层实体面板，后续页面母版可以在这里继续叠加 Hero/表格/详情壳。 -->
      <main class="default-layout__main">
        <div class="default-layout__main-shell">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/console-shell' as shell;

.default-layout {
  display: flex;
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
}

.default-layout__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.default-layout__header {
  padding: 20px 28px 0;
}

.default-layout__surface {
  @include shell.console-surface(12px);

  min-height: 80px;
  padding: 10px 18px;
  border-radius: var(--app-radius-lg);
}

.default-layout__main {
  flex: 1;
  min-width: 0;
  padding: 18px 28px 28px;
}

.default-layout__main-shell {
  min-height: 100%;
}
</style>
