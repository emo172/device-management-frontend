<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

/**
 * 顶部面包屑。
 * 直接复用当前路由匹配链上的 meta.title，避免布局层再维护一份独立导航名称表，导致标题与路由配置漂移。
 */
const route = useRoute()

const breadcrumbItems = computed(() =>
  route.matched
    .filter((item) => item.meta.title && !item.meta.hidden)
    .map((item) => ({
      path: item.path,
      title: item.meta.title ?? '',
    })),
)
</script>

<template>
  <div class="app-breadcrumb__surface">
    <el-breadcrumb class="app-breadcrumb" separator="/">
      <el-breadcrumb-item v-for="item in breadcrumbItems" :key="`${item.path}-${item.title}`">
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
  padding: 10px 16px;
  border-radius: 999px;
}

.app-breadcrumb {
  min-width: 0;
}
</style>
