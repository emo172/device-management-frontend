<script setup lang="ts">
import type { NavigationBreadcrumbItem } from './navigation'

/**
 * 顶部面包屑展示组件。
 * 页面上下文已经在头部与导航纯函数里完成解析，这里只负责按既定顺序渲染，
 * 避免展示层再次读取路由后出现“左侧导航、面包屑、页面标题”三套文案口径。
 */
const props = defineProps<{
  /**
   * 面包屑项数组。
   * 顺序由上游上下文解析结果保证，展示组件不再自行过滤或补标题。
   */
  items: readonly NavigationBreadcrumbItem[]
}>()
</script>

<template>
  <div class="app-breadcrumb__surface">
    <el-breadcrumb class="app-breadcrumb" separator="/">
      <el-breadcrumb-item
        v-for="item in props.items"
        :key="`${item.path ?? item.title}-${item.title}`"
      >
        {{ item.title }}
      </el-breadcrumb-item>
    </el-breadcrumb>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/console-shell' as shell;

.app-breadcrumb__surface {
  @include shell.console-surface(10px);

  min-width: 0;
  padding: 4px 10px;
  border-radius: 12px;
}

.app-breadcrumb {
  min-width: 0;
  font-size: 12px;
  line-height: 1;
}
</style>
