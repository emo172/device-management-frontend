<script setup lang="ts">
import { RefreshRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import Freeze from '@/views/user/Freeze.vue'
import RoleAssign from '@/views/user/RoleAssign.vue'
import type { UserListItemResponse } from '@/api/users'
import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import FreezeStatusTag from '@/components/business/FreezeStatusTag.vue'
import { FreezeStatus, UserRoleLabel } from '@/enums'
import { UserRole } from '@/enums/UserRole'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'

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

function matchesKeyword(user: AdminUserRow, keyword: string) {
  if (!keyword) {
    return true
  }

  return [user.username, user.email, user.realName]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(keyword))
}

/**
 * 后端用户列表真实契约目前只支持 `page` 和 `size`。
 * 因此这里把关键词明确降级为“当前页筛选”，避免页面继续承诺一个后端并不存在的全局搜索能力。
 */
const tableData = computed(() =>
  userStore.adminUserList.filter((user) => matchesKeyword(user, normalizedKeyword.value)),
)
const cardUsers = computed(() => tableData.value.slice(0, 3))

function getStatusLabel(status: number) {
  return status === 1 ? '启用' : '禁用'
}

function getStatusTagType(status: number) {
  return status === 1 ? 'success' : 'info'
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
 * 关键词筛选仅作用于当前页数据，因此搜索按钮只负责确认筛选词，不再向后端发送不存在的查询参数。
 */
function handleSearch() {
  appliedKeyword.value = filters.keyword
}

function handleReset() {
  filters.keyword = ''
  appliedKeyword.value = ''
}

async function handlePaginationChange(payload: { currentPage: number; pageSize: number }) {
  await loadAdminUserList({ page: payload.currentPage, size: payload.pageSize })
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

  await userStore.updateUserStatus(user.id, { status: nextStatus, reason })
  ElMessage.success(`账号已切换为${getStatusLabel(nextStatus)}`)
}

async function handleDialogSuccess() {
  if (!userStore.roleList.length) {
    await userStore.fetchRoleList()
  }
}

onMounted(async () => {
  if (!isSystemAdmin.value) {
    return
  }

  await Promise.all([loadAdminUserList({ page: 1, size: 10 }), userStore.fetchRoleList()])
})
</script>

<template>
  <section class="user-list-view">
    <header class="user-list-view__hero">
      <div>
        <p class="user-list-view__eyebrow">System / Users</p>
        <h1 class="user-list-view__title">用户管理</h1>
        <p class="user-list-view__description">
          统一查看账号状态、冻结风险与角色归属。所有管理动作都收敛到系统管理员页面，避免出现跨页面维护造成的信息不同步。
        </p>
      </div>

      <div class="user-list-view__hero-actions">
        <el-button @click="loadAdminUserList()">
          <el-icon><RefreshRight /></el-icon>
          刷新
        </el-button>
      </div>
    </header>

    <SearchBar
      v-model="filters.keyword"
      label="当前页筛选"
      placeholder="按当前页用户名 / 邮箱 / 姓名筛选"
      @search="handleSearch"
      @reset="handleReset"
    />

    <div v-if="cardUsers.length" class="user-list-view__card-grid">
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
            {{ user.freezeStatus === FreezeStatus.FROZEN ? '解冻账号' : '冻结账号' }}
          </el-button>
        </div>
      </article>
    </div>

    <div class="user-list-view__table-shell">
      <div class="user-list-view__table-header">
        <h2>用户列表</h2>
        <span>
          {{
            appliedKeyword
              ? `当前页匹配 ${tableData.length} 条 / 总计 ${userStore.adminUserTotal} 条`
              : `共 ${userStore.adminUserTotal} 条`
          }}
        </span>
      </div>

      <EmptyState
        v-if="!tableData.length && !userStore.loading"
        :title="appliedKeyword ? '当前页暂无匹配用户' : '暂无符合条件的用户'"
        :description="
          appliedKeyword
            ? '当前后端仅支持分页查询，已按本页数据执行关键词筛选。'
            : '可以刷新列表，或等待后端产生新的账号数据。'
        "
        action-text="重新加载"
        @action="loadAdminUserList()"
      />

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
                <el-button text type="primary" @click="handleOpenRoleAssign(scope.row)"
                  >分配角色</el-button
                >
                <el-button text type="danger" @click="handleOpenFreeze(scope.row)">
                  {{ scope.row.freezeStatus === FreezeStatus.FROZEN ? '解冻' : '冻结' }}
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
    </div>

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

.user-list-view__hero,
.user-list-view__table-shell,
.user-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
}

.user-list-view__hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
  background:
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.16), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(239, 246, 255, 0.92));
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

.user-list-view__eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #0369a1;
}

.user-list-view__title,
.user-list-view__table-header h2 {
  margin: 0;
  color: var(--app-text-primary);
}

.user-list-view__title {
  font-size: clamp(30px, 4vw, 40px);
}

.user-list-view__description {
  max-width: 760px;
  margin: 14px 0 0;
  font-size: 15px;
  line-height: 1.8;
  color: var(--app-text-secondary);
}

.user-list-view__card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.user-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px;
}

.user-card__header,
.user-list-view__table-header {
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
  padding: 24px;
}

.user-list-view__table-header {
  align-items: center;
  margin-bottom: 18px;
}

.user-list-view__table-header span {
  font-size: 13px;
  color: var(--app-text-secondary);
}
</style>
