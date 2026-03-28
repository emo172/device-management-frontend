<script setup lang="ts">
import { useAppStore } from '@/stores/modules/app'

/**
 * 空白布局。
 * 403、404 等错误页不需要业务头部与侧栏，因此只透传页面内容，避免错误信息被导航结构分散注意力。
 */

const appStore = useAppStore()
</script>

<template>
  <div class="blank-layout" :data-resolved-theme="appStore.resolvedTheme">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.blank-layout {
  min-height: 100vh;
  padding: 40px;
  background: linear-gradient(180deg, var(--app-page-bg) 0%, var(--app-page-bg-elevated) 100%);
}
</style>
