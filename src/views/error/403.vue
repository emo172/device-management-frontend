<script setup lang="ts">
import ViewPlaceholder from '@/views/common/ViewPlaceholder.vue'

/**
 * 403 无权限页面。
 * 当用户已登录但角色不满足路由 meta.roles 时，守卫统一跳到这里，避免错误地把权限问题伪装成登录失效。
 */
</script>

<template>
  <section class="error-view">
    <div class="error-view__surface">
      <ViewPlaceholder
        eyebrow="403"
        title="当前角色无权访问该页面"
        description="你的账号已登录，但当前角色与页面权限要求不匹配。请返回有权限的模块，或联系系统管理员确认角色分配。"
      >
        <template #actions>
          <RouterLink class="error-view__action" to="/dashboard">返回仪表盘</RouterLink>
        </template>
      </ViewPlaceholder>
    </div>
  </section>
</template>

<style scoped lang="scss">
.error-view__surface {
  color: var(--app-text-primary);
}

.error-view__action {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 18px;
  border: 1px solid var(--app-color-primary);
  border-radius: 999px;
  text-decoration: none;
  color: var(--app-color-primary-contrast);
  background: var(--app-color-primary);
  box-shadow: var(--app-shadow-solid);
}
</style>
