<script setup lang="ts">
import ViewPlaceholder from '@/views/common/ViewPlaceholder.vue'

/**
 * 404 页面未找到页。
 * 用于兜底未知路径，避免路由系统在路径拼写错误或菜单尚未接入时直接落到空白界面。
 */
</script>

<template>
  <section class="error-view">
    <div class="error-view__surface">
      <ViewPlaceholder
        eyebrow="404"
        title="页面不存在或尚未开放"
        description="当前访问的地址没有对应页面，可能是链接失效，也可能是后续功能页面尚未在本阶段开放。你可以先返回仪表盘继续操作。"
      >
        <template #actions>
          <RouterLink class="error-view__action" to="/dashboard">返回仪表盘</RouterLink>
        </template>
      </ViewPlaceholder>
    </div>
  </section>
</template>

<style scoped lang="scss">
.error-view__action {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  text-decoration: none;
  color: #fff;
  background: var(--app-color-primary);
}
</style>
