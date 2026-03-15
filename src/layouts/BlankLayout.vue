<script setup lang="ts">
/**
 * 空白布局。
 * 403、404 等错误页不需要业务头部与侧栏，因此只透传页面内容，避免错误信息被导航结构分散注意力。
 */
</script>

<template>
  <div class="blank-layout">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.blank-layout {
  min-height: 100vh;
  padding: 40px;
  background: linear-gradient(180deg, #fffdf7 0%, #f8fafc 100%);
}
</style>
