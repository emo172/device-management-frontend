<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'

/**
 * 默认业务布局。
 * 所有受保护业务页统一复用该壳层，确保侧边导航、头部通知与主内容区结构保持一致。
 */
</script>

<template>
  <el-container class="default-layout">
    <AppSidebar />
    <el-container class="default-layout__content">
      <el-header class="default-layout__header">
        <AppHeader />
      </el-header>
      <el-main class="default-layout__main">
        <slot />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped lang="scss">
.default-layout {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
}

.default-layout__content {
  min-width: 0;
}

.default-layout__header {
  height: 80px;
  padding: 20px 28px 0;
  background: transparent;
}

.default-layout__main {
  padding: 0 28px 28px;
}
</style>
