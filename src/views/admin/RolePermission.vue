<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import PermissionTree from '@/components/business/PermissionTree.vue'
import { UserRole, UserRoleLabel } from '@/enums/UserRole'
import { useUserStore } from '@/stores/modules/user'

/**
 * 角色权限管理页。
 * 系统管理员必须基于后端真实授权树做调整，不能靠前端菜单配置反推权限，否则会出现“页面可见但接口被拒”或“接口放开但页面没开放”的双向漂移。
 */
const userStore = useUserStore()

const selectedPermissionIds = ref<string[]>([])

const roleList = computed(() => userStore.roleList)
const selectedRoleId = computed(() => userStore.selectedRoleId)
const permissionModules = computed(() => userStore.currentRolePermissionTree)
const lastSavedAt = computed(() => {
  if (userStore.lastPermissionUpdate?.roleId !== selectedRoleId.value) {
    return ''
  }

  return userStore.lastPermissionUpdate.updatedAt
})

const prefetchedRoleId =
  !userStore.selectedRoleId &&
  userStore.roleList.length &&
  !userStore.currentRolePermissionTree.length
    ? userStore.roleList[0]?.id || ''
    : ''

/**
 * 用户管理页或测试场景可能已经提前把角色列表写入 store。
 * 这里在 setup 阶段优先消费预热数据，确保首屏就能带着默认角色权限树渲染，而不是先闪空态再补数据。
 */
if (prefetchedRoleId) {
  void handleSelectRole(prefetchedRoleId)
}

watch(
  permissionModules,
  (modules) => {
    selectedPermissionIds.value = modules
      .flatMap((moduleItem) => moduleItem.permissions)
      .filter((permission) => permission.selected)
      .map((permission) => permission.permissionId)
  },
  { immediate: true },
)

async function handleSelectRole(roleId: string) {
  if (!roleId) {
    return
  }

  await userStore.fetchRolePermissionTree(roleId)
}

async function handleSave() {
  if (!selectedRoleId.value) {
    return
  }

  await userStore.updateRolePermissions(selectedRoleId.value, {
    permissionIds: selectedPermissionIds.value,
  })
  ElMessage.success('角色权限已保存')
}

onMounted(async () => {
  const latestRoleList = await userStore.fetchRoleList()
  const hasValidSelectedRole = latestRoleList.some((role) => role.id === userStore.selectedRoleId)
  const nextRoleId = hasValidSelectedRole ? userStore.selectedRoleId : latestRoleList[0]?.id

  /**
   * 角色列表刷新后必须确认当前选中角色仍然有效。
   * 如果 store 留着失效角色 ID，页面需要回退到最新角色列表里的首个有效角色，避免出现“没有对应角色卡片却仍展示权限树”的错位状态。
   */
  if (
    nextRoleId &&
    (!hasValidSelectedRole || (!prefetchedRoleId && !permissionModules.value.length))
  ) {
    await handleSelectRole(nextRoleId)
  }
})

/**
 * 角色权限树属于页面级授权上下文，而不是全局可复用快照。
 * 离开页面后若不清理选中角色与权限树，再次进入时会误以为已有最新数据，导致页面跳过真实后端拉取并复用旧授权结果。
 */
onBeforeUnmount(() => {
  userStore.resetRolePermissionState()
})
</script>

<template>
  <section class="role-permission-view">
    <header class="role-permission-view__hero">
      <div>
        <p class="role-permission-view__eyebrow">System / Role Access</p>
        <h1 class="role-permission-view__title">角色权限管理</h1>
        <p class="role-permission-view__description">
          统一维护系统内三类正式角色的授权边界，避免页面菜单、按钮权限和后端接口授权出现口径漂移。
        </p>
      </div>

      <div class="role-permission-view__hero-actions">
        <el-button
          data-testid="save-role-permissions"
          :disabled="!selectedRoleId || userStore.rolePermissionLoading"
          type="primary"
          @click="handleSave"
        >
          保存权限配置
        </el-button>
      </div>
    </header>

    <section class="role-permission-view__role-section">
      <article
        v-for="role in roleList"
        :key="role.id"
        :data-testid="`role-card-${role.id}`"
        :class="['role-card', { 'role-card--active': role.id === selectedRoleId }]"
        @click="handleSelectRole(role.id)"
      >
        <p class="role-card__eyebrow">{{ role.name }}</p>
        <h2>{{ UserRoleLabel[role.name as UserRole] ?? role.name }}</h2>
        <p>{{ role.description || '暂无角色描述' }}</p>
      </article>
    </section>

    <section class="role-permission-view__content">
      <div class="role-permission-view__content-header">
        <div>
          <h2>权限树</h2>
          <p>按后端真实模块分组展示，勾选结果会整体覆盖当前角色权限。</p>
        </div>
        <el-tag v-if="lastSavedAt" effect="light">最近保存：{{ lastSavedAt }}</el-tag>
      </div>

      <el-skeleton v-if="userStore.rolePermissionLoading && !permissionModules.length" animated>
        <template #template>
          <el-skeleton-item variant="p" style="width: 40%" />
          <el-skeleton-item variant="p" style="width: 70%" />
        </template>
      </el-skeleton>

      <PermissionTree
        v-else-if="permissionModules.length"
        v-model="selectedPermissionIds"
        :disabled="userStore.rolePermissionLoading"
        :modules="permissionModules"
      />

      <el-empty v-else description="请选择角色后查看权限树" />
    </section>
  </section>
</template>

<style scoped lang="scss">
.role-permission-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.role-permission-view__hero,
.role-permission-view__content,
.role-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
}

.role-permission-view__hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
  background:
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.16), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(236, 254, 255, 0.92));
}

.role-permission-view__eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #0f766e;
}

.role-permission-view__title,
.role-permission-view__content-header h2,
.role-card h2 {
  margin: 0;
  color: var(--app-text-primary);
}

.role-permission-view__description,
.role-permission-view__content-header p,
.role-card p {
  color: var(--app-text-secondary);
  line-height: 1.7;
}

.role-permission-view__hero-actions {
  align-self: flex-start;
}

.role-permission-view__role-section {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.role-card {
  padding: 20px 22px;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.role-card:hover,
.role-card--active {
  transform: translateY(-2px);
  border-color: rgba(15, 118, 110, 0.4);
  box-shadow: 0 18px 42px rgba(15, 118, 110, 0.12);
}

.role-card__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #0f766e;
}

.role-permission-view__content {
  padding: 24px;
}

.role-permission-view__content-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 18px;
}
</style>
