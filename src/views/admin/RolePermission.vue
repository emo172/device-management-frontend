<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import PermissionTree from '@/components/business/PermissionTree.vue'
import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleFeedbackSurface from '@/components/layout/ConsoleFeedbackSurface.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import ConsoleTableSection from '@/components/layout/ConsoleTableSection.vue'
import { UserRole, UserRoleLabel } from '@/enums/UserRole'
import { useUserStore } from '@/stores/modules/user'

/**
 * 角色权限管理页。
 * 系统管理员必须基于后端真实授权树做调整，不能靠前端菜单配置反推权限，否则会出现“页面可见但接口被拒”或“接口放开但页面没开放”的双向漂移。
 */
const userStore = useUserStore()

const selectedPermissionIds = ref<string[]>([])
const roleListErrorMessage = ref('')
const rolePermissionErrorMessage = ref('')
const savingPermissions = ref(false)

const roleList = computed(() => userStore.roleList)
const selectedRoleId = computed(() => userStore.selectedRoleId)
const permissionModules = computed(() => userStore.currentRolePermissionTree)
const currentRole = computed(
  () => roleList.value.find((role) => role.id === selectedRoleId.value) ?? null,
)
const currentRoleLabel = computed(() => {
  if (!currentRole.value) {
    return '未选择角色'
  }

  return UserRoleLabel[currentRole.value.name as UserRole] ?? currentRole.value.name
})
const permissionCount = computed(() => selectedPermissionIds.value.length)
const permissionModuleCount = computed(() =>
  rolePermissionErrorMessage.value ? 0 : permissionModules.value.length,
)
const roleCountText = computed(() => `${roleList.value.length} 个角色`)
const canSavePermissions = computed(
  () =>
    !!selectedRoleId.value &&
    !userStore.rolePermissionLoading &&
    !savingPermissions.value &&
    !rolePermissionErrorMessage.value &&
    permissionModules.value.length > 0,
)
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

  rolePermissionErrorMessage.value = ''
  selectedPermissionIds.value = []

  try {
    await userStore.fetchRolePermissionTree(roleId)
  } catch {
    /**
     * 角色切换失败时必须显式进入错误态，而不是继续展示上一个角色的权限树，避免把旧授权误保存到新角色。
     */
    rolePermissionErrorMessage.value = '当前角色权限加载失败，请重新选择角色或稍后重试。'
  }
}

async function handleSave() {
  if (!canSavePermissions.value) {
    return
  }

  try {
    savingPermissions.value = true

    await userStore.updateRolePermissions(selectedRoleId.value, {
      permissionIds: selectedPermissionIds.value,
    })
    ElMessage.success('角色权限已保存')
  } catch {
    // 请求层已经提示失败原因，这里只阻止保存按钮链路抛出未处理拒绝。
  } finally {
    savingPermissions.value = false
  }
}

onMounted(async () => {
  roleListErrorMessage.value = ''
  rolePermissionErrorMessage.value = ''

  try {
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
  } catch {
    /**
     * 角色列表刷新失败与权限树加载失败不是同一类错误。
     * 如果页面已经持有有效角色卡片和权限树，就不应因为列表刷新失败而整体禁用编辑能力。
     */
    roleListErrorMessage.value = '角色列表加载失败，请稍后重试。'
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
    <ConsolePageHero
      eyebrow="System / Role Access"
      title="角色权限管理"
      description="统一维护系统内三类正式角色的授权边界，避免页面菜单、按钮权限和后端接口授权出现口径漂移。"
      class="role-permission-view__hero"
    >
      <template #actions>
        <el-button
          data-testid="save-role-permissions"
          :disabled="!canSavePermissions"
          type="primary"
          @click="handleSave"
        >
          保存权限配置
        </el-button>
      </template>

      <template #meta>
        <div class="role-permission-view__meta-pill">
          <span>当前角色</span>
          <strong>{{ currentRoleLabel }}</strong>
        </div>
        <div class="role-permission-view__meta-pill">
          <span>已选权限</span>
          <strong>{{ permissionCount }}</strong>
        </div>
        <div class="role-permission-view__meta-pill">
          <span>权限模块</span>
          <strong>{{ permissionModuleCount }}</strong>
        </div>
      </template>
    </ConsolePageHero>

    <div class="role-permission-view__layout">
      <ConsoleTableSection title="角色授权矩阵" :count="roleCountText">
        <ConsoleFeedbackSurface
          v-if="roleListErrorMessage"
          state="error"
          class="role-permission-view__inline-feedback"
        >
          <p class="role-permission-view__feedback-title">角色列表刷新失败</p>
          <p class="role-permission-view__feedback-description">
            {{ roleListErrorMessage }}
          </p>
          <p v-if="roleList.length" class="role-permission-view__feedback-description">
            页面已保留当前缓存的角色与权限树，可继续编辑当前角色权限。
          </p>
        </ConsoleFeedbackSurface>

        <!-- 角色卡切换必须先于权限树编辑，避免管理员在未知角色上下文里误保存。 -->
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

        <div class="role-permission-view__content-header">
          <div>
            <h3>权限树</h3>
            <p>按后端真实模块分组展示，勾选结果会整体覆盖当前角色权限。</p>
          </div>
          <span v-if="lastSavedAt" class="role-permission-view__save-badge"
            >最近保存：{{ lastSavedAt }}</span
          >
        </div>

        <ConsoleFeedbackSurface v-if="userStore.rolePermissionLoading" state="loading">
          <p class="role-permission-view__feedback-title">权限树加载中</p>
          <p class="role-permission-view__feedback-description">
            正在同步当前角色的真实后端授权，请稍候。
          </p>
        </ConsoleFeedbackSurface>

        <ConsoleFeedbackSurface v-else-if="rolePermissionErrorMessage" state="error">
          <p class="role-permission-view__feedback-title">角色权限加载失败</p>
          <p class="role-permission-view__feedback-description">
            {{ rolePermissionErrorMessage }}
          </p>
        </ConsoleFeedbackSurface>

        <PermissionTree
          v-else-if="permissionModules.length"
          v-model="selectedPermissionIds"
          :disabled="userStore.rolePermissionLoading"
          :modules="permissionModules"
        />

        <ConsoleFeedbackSurface v-else state="empty">
          <p class="role-permission-view__feedback-title">请选择角色后查看权限树</p>
          <p class="role-permission-view__feedback-description">
            切换角色卡片后会即时拉取该角色的最新授权模块。
          </p>
        </ConsoleFeedbackSurface>
      </ConsoleTableSection>

      <!-- 授权摘要固定放在侧栏，避免把权限树主操作区挤成多栏滚动。 -->
      <ConsoleAsidePanel
        title="授权摘要"
        description="角色权限页只面向 SYSTEM_ADMIN，保存动作采用整体覆盖语义。"
      >
        <div class="role-permission-view__aside-stack">
          <section class="role-permission-view__aside-card">
            <p class="role-permission-view__aside-label">当前角色</p>
            <h3>{{ currentRoleLabel }}</h3>
            <p>{{ currentRole?.description || '请先选择需要调整的系统角色。' }}</p>
          </section>

          <section class="role-permission-view__metrics">
            <article class="role-permission-view__metric">
              <span>角色总数</span>
              <strong>{{ roleList.length }}</strong>
            </article>
            <article class="role-permission-view__metric">
              <span>已选权限</span>
              <strong>{{ permissionCount }}</strong>
            </article>
            <article class="role-permission-view__metric">
              <span>权限模块</span>
              <strong>{{ permissionModuleCount }}</strong>
            </article>
          </section>

          <section class="role-permission-view__aside-card">
            <h4>操作提醒</h4>
            <ul class="role-permission-view__rule-list">
              <li>保存会整体覆盖当前角色权限，未勾选项会一并撤销。</li>
              <li>权限树以后端真实授权模块为准，不能只根据前端菜单反推。</li>
              <li>离开页面会清理授权上下文，避免再次进入时复用旧数据。</li>
            </ul>
          </section>
        </div>

        <template #footer>
          <p class="role-permission-view__footer-note">
            {{ lastSavedAt ? `最近一次保存时间：${lastSavedAt}` : '尚未保存当前角色的权限调整。' }}
          </p>
        </template>
      </ConsoleAsidePanel>
    </div>
  </section>
</template>

<style scoped lang="scss">
.role-permission-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.role-permission-view__hero {
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, var(--app-tone-success-surface-strong), transparent 34%),
    radial-gradient(circle at bottom left, var(--app-tone-brand-surface), transparent 30%),
    linear-gradient(135deg, var(--app-surface-card-strong), var(--app-surface-card));
}

.role-permission-view__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
  align-items: start;
}

.role-permission-view__meta-pill {
  min-width: 132px;
  padding: 12px 16px;
  border: 1px solid var(--app-border-glass);
  border-radius: 18px;
  background: var(--app-surface-glass);
  backdrop-filter: blur(12px);
}

.role-permission-view__meta-pill span,
.role-card__eyebrow,
.role-permission-view__aside-label {
  display: block;
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--app-tone-success-text);
}

.role-permission-view__meta-pill strong,
.role-card h2,
.role-permission-view__content-header h3,
.role-permission-view__aside-card h3,
.role-permission-view__aside-card h4,
.role-permission-view__metric strong {
  margin: 0;
  color: var(--app-text-primary);
}

.role-card p,
.role-permission-view__content-header p,
.role-permission-view__feedback-description,
.role-permission-view__aside-card p,
.role-permission-view__footer-note,
.role-permission-view__rule-list {
  margin: 0;
  color: var(--app-text-secondary);
  line-height: 1.7;
}

.role-permission-view__role-section {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.role-card {
  border: 1px solid var(--app-border-soft);
  border-radius: 24px;
  background: linear-gradient(180deg, var(--app-surface-card-strong), var(--app-surface-card));
  box-shadow: var(--app-shadow-card);
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
  border-color: var(--app-tone-success-border);
  box-shadow: var(--app-shadow-card);
}

.role-permission-view__content-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.role-permission-view__save-badge {
  display: inline-flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 999px;
  background: var(--app-tone-success-surface);
  color: var(--app-tone-success-text);
  font-size: 13px;
  white-space: nowrap;
}

.role-permission-view__feedback-title {
  margin: 0;
  font-size: 18px;
  color: var(--app-text-primary);
}

.role-permission-view__inline-feedback {
  min-height: 0;
  align-items: flex-start;
  padding: 18px 20px;
  text-align: left;
}

.role-permission-view__aside-stack {
  display: grid;
  gap: 16px;
}

.role-permission-view__aside-card,
.role-permission-view__metric {
  padding: 18px;
  border: 1px solid var(--app-border-glass);
  border-radius: 20px;
  background: var(--app-surface-glass);
}

.role-permission-view :deep(.permission-tree) {
  background: var(--app-surface-card);
}

.role-permission-view__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.role-permission-view__metric {
  display: grid;
  gap: 10px;
}

.role-permission-view__metric span {
  font-size: 13px;
  color: var(--app-text-secondary);
}

.role-permission-view__rule-list {
  padding-left: 18px;
}

.role-permission-view__footer-note {
  width: 100%;
  font-size: 13px;
}

@media (max-width: 1180px) {
  .role-permission-view__layout {
    grid-template-columns: 1fr;
  }

  .role-permission-view__role-section,
  .role-permission-view__metrics {
    grid-template-columns: 1fr;
  }
}
</style>
