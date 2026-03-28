<script setup lang="ts">
import { RefreshRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import type { UserListItemResponse } from '@/api/users'
import FreezeStatusTag from '@/components/business/FreezeStatusTag.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import ConsoleFeedbackSurface from '@/components/layout/ConsoleFeedbackSurface.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import ConsoleSummaryGrid from '@/components/layout/ConsoleSummaryGrid.vue'
import ConsoleTableSection from '@/components/layout/ConsoleTableSection.vue'
import { FreezeStatus, UserRoleLabel } from '@/enums'
import { UserRole } from '@/enums/UserRole'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import Freeze from '@/views/user/Freeze.vue'
import RoleAssign from '@/views/user/RoleAssign.vue'

type AdminUserRow = UserListItemResponse

/**
 * 用户管理列表页。
 * 该页只对 SYSTEM_ADMIN 开放，负责承接用户查看、状态启停、冻结与角色分配的统一入口，避免管理动作散落在多个页面造成口径不一致。
 */
const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()

const filters = reactive({
  keyword: '',
})
const appliedKeyword = ref('')

const freezeDialogVisible = ref(false)
const roleDialogVisible = ref(false)
const selectedUser = ref<AdminUserRow | null>(null)

const isSystemAdmin = computed(() => authStore.userRole === UserRole.SYSTEM_ADMIN)
const normalizedKeyword = computed(() => appliedKeyword.value.trim().toLowerCase())
const tableData = computed(() =>
  userStore.adminUserList.filter((user) => matchesKeyword(user, normalizedKeyword.value)),
)
const cardUsers = computed(() => tableData.value.slice(0, 3))
const tableCount = computed(() => {
  if (!appliedKeyword.value) {
    return userStore.adminUserTotal
  }

  return `当前页匹配 ${tableData.value.length} 条 / 总计 ${userStore.adminUserTotal} 条`
})

function matchesKeyword(user: AdminUserRow, keyword: string) {
  if (!keyword) {
    return true
  }

  return [user.username, user.email, user.realName]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(keyword))
}

function getStatusLabel(status: number) {
  return status === 1 ? '启用' : '禁用'
}

function getStatusTagType(status: number) {
  return status === 1 ? 'success' : 'info'
}

/**
 * 冻结入口文案要与弹窗默认动作保持一致。
 * `RESTRICTED` 不是再次冻结，而是继续调整受限条件，因此这里必须明确提示“调整限制”。
 */
function getFreezeActionLabel(freezeStatus: FreezeStatus) {
  if (freezeStatus === FreezeStatus.FROZEN) {
    return '解冻账号'
  }

  if (freezeStatus === FreezeStatus.RESTRICTED) {
    return '调整限制'
  }

  return '冻结账号'
}

function buildQuery(overrides?: Partial<{ page: number; size: number }>) {
  return {
    page: overrides?.page ?? userStore.adminUserQuery.page ?? 1,
    size: overrides?.size ?? userStore.adminUserQuery.size ?? 10,
  }
}

async function loadAdminUserList(overrides?: Partial<{ page: number; size: number }>) {
  await userStore.fetchAdminUserList(buildQuery(overrides))
}

/**
 * 后端用户列表真实契约目前只支持 `page` 和 `size`。
 * 因此这里把关键词明确降级为“当前页筛选”，避免页面继续承诺一个后端并不存在的全局搜索能力。
 */
function handleSearch() {
  appliedKeyword.value = filters.keyword
}

function handleReset() {
  filters.keyword = ''
  appliedKeyword.value = ''
}

async function handlePaginationChange(payload: { currentPage: number; pageSize: number }) {
  try {
    await loadAdminUserList({ page: payload.currentPage, size: payload.pageSize })
  } catch {
    // 请求层已经统一提示，这里只避免分页切换事件留下未处理拒绝。
  }
}

function handleDetail(userId: string) {
  void router.push(`/users/${userId}`)
}

function handleOpenFreeze(user: AdminUserRow) {
  selectedUser.value = user
  freezeDialogVisible.value = true
}

function handleOpenRoleAssign(user: AdminUserRow) {
  selectedUser.value = user
  roleDialogVisible.value = true
}

async function handleToggleStatus(user: AdminUserRow) {
  const nextStatus = user.status === 1 ? 0 : 1
  const reason =
    nextStatus === 1 ? '系统管理员从用户管理页恢复账号可用状态' : '系统管理员从用户管理页禁用账号'

  try {
    await userStore.updateUserStatus(user.id, { status: nextStatus, reason })
    ElMessage.success(`账号已切换为${getStatusLabel(nextStatus)}`)
  } catch {
    /**
     * 请求层已经负责弹出失败提示，这里只负责阻止按钮点击链路继续向上抛出未处理拒绝。
     */
  }
}

async function handleDialogSuccess() {
  if (!userStore.roleList.length) {
    try {
      await userStore.fetchRoleList()
    } catch {
      // 失败提示交给请求层，这里避免对话框 success 回调留下未处理拒绝。
    }
  }
}

function handleRefresh() {
  void loadAdminUserList().catch(() => {
    // 请求层已经统一提示，这里只收口按钮点击产生的 Promise 拒绝。
  })
}

function handleReloadEmptyState() {
  handleRefresh()
}

onMounted(async () => {
  if (!isSystemAdmin.value) {
    return
  }

  /**
   * 重新进入用户管理页时，必须先清空上一次留下的分页结果与详情快照。
   * 这样即使本次首次请求失败，也不会把旧列表继续展示给系统管理员做后续操作。
   */
  userStore.resetUserManagementState()

  try {
    await Promise.all([loadAdminUserList({ page: 1, size: 10 }), userStore.fetchRoleList()])
  } catch {
    // 初始化失败由请求层提示，页面保留当前空态，避免 mounted 链路抛出未处理拒绝。
  }
})

onBeforeUnmount(() => {
  userStore.resetUserManagementState()
})
</script>

<template>
  <section class="user-list-view">
    <ConsolePageHero
      eyebrow="System / Users"
      title="用户管理"
      description="统一查看账号状态、冻结风险与角色归属。所有管理动作都收敛到系统管理员页面，避免出现跨页面维护造成的信息不同步。"
      class="user-list-view__hero"
    >
      <template #actions>
        <div class="user-list-view__hero-actions">
          <el-button @click="handleRefresh">
            <el-icon><RefreshRight /></el-icon>
            刷新
          </el-button>
        </div>
      </template>
    </ConsolePageHero>

    <SearchBar
      v-model="filters.keyword"
      label="当前页筛选"
      placeholder="按当前页用户名 / 邮箱 / 姓名筛选"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ConsoleSummaryGrid v-if="cardUsers.length" class="user-list-view__card-grid">
      <article v-for="user in cardUsers" :key="user.id" class="user-card">
        <div class="user-card__header">
          <div>
            <p class="user-card__username">{{ user.username }}</p>
            <p class="user-card__meta">{{ user.email }}</p>
          </div>
          <FreezeStatusTag :status="user.freezeStatus as FreezeStatus" />
        </div>

        <dl class="user-card__meta-grid">
          <div>
            <dt>姓名</dt>
            <dd>{{ user.realName || '-' }}</dd>
          </div>
          <div>
            <dt>角色</dt>
            <dd>{{ UserRoleLabel[user.roleName as UserRole] ?? user.roleName }}</dd>
          </div>
        </dl>

        <!-- 卡片区与表格区都保留管理入口，确保系统管理员在不同浏览密度下都能触发同一组动作。 -->
        <div class="user-card__actions">
          <el-button
            data-testid="user-detail-trigger"
            text
            type="primary"
            @click="handleDetail(user.id)"
          >
            查看详情
          </el-button>
          <el-button
            data-testid="user-status-trigger"
            text
            type="warning"
            @click="handleToggleStatus(user)"
          >
            {{ user.status === 1 ? '禁用账号' : '启用账号' }}
          </el-button>
          <el-button
            data-testid="user-role-trigger"
            text
            type="primary"
            @click="handleOpenRoleAssign(user)"
          >
            分配角色
          </el-button>
          <el-button
            data-testid="user-freeze-trigger"
            text
            type="danger"
            @click="handleOpenFreeze(user)"
          >
            {{ getFreezeActionLabel(user.freezeStatus as FreezeStatus) }}
          </el-button>
        </div>
      </article>
    </ConsoleSummaryGrid>

    <ConsoleTableSection title="用户列表" :count="tableCount" class="user-list-view__table-shell">
      <ConsoleFeedbackSurface
        v-if="!tableData.length && !userStore.loading"
        class="user-list-view__feedback"
      >
        <EmptyState
          :title="appliedKeyword ? '当前页暂无匹配用户' : '暂无符合条件的用户'"
          :description="
            appliedKeyword
              ? '当前后端仅支持分页查询，已按本页数据执行关键词筛选。'
              : '可以刷新列表，或等待后端产生新的账号数据。'
          "
          action-text="重新加载"
          @action="handleReloadEmptyState"
        />
      </ConsoleFeedbackSurface>

      <template v-else>
        <el-table v-loading="userStore.loading" :data="tableData" stripe>
          <el-table-column prop="username" label="用户名" min-width="160" />
          <el-table-column prop="email" label="邮箱" min-width="220" />
          <el-table-column prop="realName" label="姓名" min-width="140" />
          <el-table-column label="角色" min-width="160">
            <template #default="scope">
              <el-tag effect="light">{{
                UserRoleLabel[scope.row.roleName as UserRole] ?? scope.row.roleName
              }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="120">
            <template #default="scope">
              <el-tag :type="getStatusTagType(scope.row.status)" effect="light">
                {{ getStatusLabel(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="冻结状态" min-width="140">
            <template #default="scope">
              <FreezeStatusTag :status="scope.row.freezeStatus as FreezeStatus" />
            </template>
          </el-table-column>
          <el-table-column label="操作" min-width="320" fixed="right">
            <template #default="scope">
              <!-- 路由本身只允许 SYSTEM_ADMIN 进入，这里仍保留显式注释，提醒后续维护时不要把管理按钮放给其他角色。 -->
              <div class="user-list-view__table-actions">
                <el-button text type="primary" @click="handleDetail(scope.row.id)">详情</el-button>
                <el-button text type="warning" @click="handleToggleStatus(scope.row)">
                  {{ scope.row.status === 1 ? '禁用' : '启用' }}
                </el-button>
                <el-button text type="primary" @click="handleOpenRoleAssign(scope.row)">
                  分配角色
                </el-button>
                <el-button text type="danger" @click="handleOpenFreeze(scope.row)">
                  {{
                    scope.row.freezeStatus === FreezeStatus.FROZEN
                      ? '解冻'
                      : scope.row.freezeStatus === FreezeStatus.RESTRICTED
                        ? '调整限制'
                        : '冻结'
                  }}
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <Pagination
          :current-page="userStore.adminUserQuery.page ?? 1"
          :page-size="userStore.adminUserQuery.size ?? 10"
          :total="userStore.adminUserTotal"
          :disabled="userStore.loading"
          @change="handlePaginationChange"
        />
      </template>
    </ConsoleTableSection>

    <Freeze v-model="freezeDialogVisible" :user="selectedUser" @success="handleDialogSuccess" />
    <RoleAssign v-model="roleDialogVisible" :user="selectedUser" @success="handleDialogSuccess" />
  </section>
</template>

<style scoped lang="scss">
.user-list-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.user-list-view__hero {
  background:
    radial-gradient(circle at top right, var(--app-tone-brand-surface-strong), transparent 32%),
    linear-gradient(135deg, var(--app-surface-card-strong), var(--app-tone-brand-surface));
}

.user-list-view__hero-actions,
.user-list-view__table-actions,
.user-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-list-view__hero-actions {
  align-self: flex-start;
}

.user-list-view__card-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.user-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px;
  border: 1px solid var(--app-border-soft);
  border-radius: 28px;
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-card);
}

.user-card__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.user-card__username {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--app-text-primary);
}

.user-card__meta {
  margin: 6px 0 0;
  color: var(--app-text-secondary);
}

.user-card__meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.user-card__meta-grid dt {
  font-size: 12px;
  color: var(--app-text-secondary);
}

.user-card__meta-grid dd {
  margin: 4px 0 0;
  font-weight: 600;
  color: var(--app-text-primary);
}

.user-list-view__table-shell {
  gap: 18px;
}

.user-list-view__feedback {
  min-height: 220px;
}
</style>
