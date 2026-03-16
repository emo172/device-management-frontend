<script setup lang="ts">
import { computed } from 'vue'

import { UserRole } from '@/enums/UserRole'
import { useAuthStore } from '@/stores/modules/auth'

import AdminDashboard from './AdminDashboard.vue'
import UserDashboard from './UserDashboard.vue'

/**
 * 仪表盘入口页。
 * 登录后的默认落点需要按当前角色立即分流：普通用户进入个人工作台，
 * 两类管理员进入管理总览，避免把权限差异散落到路由层之外的多个页面判断里。
 */
const authStore = useAuthStore()

const hasResolvedRole = computed(() => {
  return (
    authStore.userRole === UserRole.USER ||
    authStore.userRole === UserRole.DEVICE_ADMIN ||
    authStore.userRole === UserRole.SYSTEM_ADMIN
  )
})

const currentDashboard = computed(() => {
  return authStore.userRole === UserRole.USER ? UserDashboard : AdminDashboard
})
</script>

<template>
  <section v-if="!hasResolvedRole" class="dashboard-entry-pending" data-testid="dashboard-pending">
    <p class="dashboard-entry-pending__eyebrow">Dashboard</p>
    <h1>正在恢复仪表盘权限</h1>
    <p>当前先等待认证状态回填，避免在角色未恢复时误触发管理员侧接口。</p>
  </section>
  <component v-else :is="currentDashboard" />
</template>

<style scoped lang="scss">
.dashboard-entry-pending {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96)),
    linear-gradient(135deg, rgba(15, 118, 110, 0.08), rgba(249, 115, 22, 0.08));
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
  padding: 28px;
}

.dashboard-entry-pending__eyebrow {
  margin: 0;
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.dashboard-entry-pending h1 {
  margin: 10px 0 0;
  color: #172033;
  font-size: 28px;
}

.dashboard-entry-pending p:last-child {
  margin: 12px 0 0;
  color: #52607a;
  line-height: 1.6;
}
</style>
