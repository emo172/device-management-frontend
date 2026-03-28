<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useAppStore } from '@/stores/modules/app'

/**
 * 默认业务布局。
 * 所有受保护业务页统一复用该壳层，确保侧边导航、头部通知与主内容区结构保持一致。
 */

const appStore = useAppStore()
</script>

<template>
  <div class="default-layout" :data-resolved-theme="appStore.resolvedTheme">
    <aside class="default-layout__sidebar-column">
      <AppSidebar />
    </aside>

    <div class="default-layout__workspace">
      <!-- 右侧头部保持独立行，避免再包一层实体壳后影响主滚动区的高度计算。 -->
      <header class="default-layout__header">
        <AppHeader />
      </header>

      <!-- 默认布局把滚动收口到这里，业务页只关心自身内容，不再把整页滚动扩散到 body。 -->
      <main class="default-layout__main-scroll">
        <div class="default-layout__main-shell">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.default-layout {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  height: 100%;
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(180deg, var(--app-page-bg) 0%, var(--app-page-bg-elevated) 100%);
}

.default-layout__sidebar-column {
  height: 100%;
  min-height: 0;
}

.default-layout__workspace {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
}

.default-layout__header {
  padding: 20px 28px 0;
}

.default-layout__main-scroll {
  min-width: 0;
  min-height: 0;
  // 右侧主区同时承接纵向与横向滚动，宽表格和宽图表不会被外层裁切到不可达。
  overflow: auto;
  padding: 18px 28px 28px;
}

.default-layout__main-shell {
  min-height: 100%;
  // 主内容壳至少铺满可视宽度，但内容比容器更宽时允许撑开，交给上一层滚动容器承接横向滚动。
  min-width: 100%;
  width: fit-content;
}
</style>
