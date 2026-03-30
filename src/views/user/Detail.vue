<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'

import FreezeStatusTag from '@/components/business/FreezeStatusTag.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleDetailLayout from '@/components/layout/ConsoleDetailLayout.vue'
import ConsoleFeedbackSurface from '@/components/layout/ConsoleFeedbackSurface.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import { FreezeStatus, FreezeStatusLabel, UserRoleLabel } from '@/enums'
import { UserRole } from '@/enums/UserRole'
import { useUserStore } from '@/stores/modules/user'

/**
 * 用户详情页。
 * 该页聚合账号身份、冻结风险和最近登录信息，帮助系统管理员在执行冻结或角色调整前先确认上下文。
 */
const route = useRoute()
const userStore = useUserStore()

const userId = computed(() => String(route.params.id || ''))
const currentUser = computed(() => userStore.currentManagedUser)
const accountStatusLabel = computed(() => (currentUser.value?.status === 1 ? '启用' : '禁用'))
const accountStatusTagType = computed(() => (currentUser.value?.status === 1 ? 'success' : 'info'))
const riskText = computed(() => {
  if (!currentUser.value) {
    return ''
  }

  if (currentUser.value.freezeStatus === FreezeStatus.FROZEN) {
    return currentUser.value.freezeReason || '当前账号已被冻结，需要确认冻结原因是否仍然成立。'
  }

  if (currentUser.value.freezeStatus === FreezeStatus.RESTRICTED) {
    return currentUser.value.freezeReason || '当前账号处于受限状态，建议先核对限制原因与到期时间。'
  }

  if (currentUser.value.status === 0) {
    return '当前账号已被禁用，若需恢复使用，请先确认历史处理记录。'
  }

  return '账号当前无额外风险提示。'
})

async function loadManagedUserDetail(targetUserId: string) {
  try {
    await userStore.fetchUserDetail(targetUserId)
  } catch {
    /**
     * 详情失败时请求层已经提示错误，这里只阻止 watch 回调抛出未处理拒绝，页面继续回落到空态反馈面板。
     */
  }
}

watch(
  userId,
  (value) => {
    /**
     * 切换到新用户详情前必须先清空旧快照。
     * 这样即使新请求慢于路由切换，也不会把上一个用户的身份与冻结信息短暂展示给系统管理员。
     */
    if (!value) {
      userStore.resetCurrentManagedUser()
      return
    }

    userStore.resetCurrentManagedUser()
    void loadManagedUserDetail(value)
  },
  { immediate: true },
)

onUnmounted(() => {
  userStore.resetCurrentManagedUser()
})
</script>

<template>
  <section class="user-detail-view">
    <ConsolePageHero
      :title="currentUser?.username || '用户详情'"
      description="展示系统管理员处理账号前必须确认的身份与风险信息，避免仅凭列表页最小字段做高风险决策。"
      class="user-detail-view__hero"
    >
      <template #actions>
        <div v-if="currentUser" class="user-detail-view__hero-actions">
          <FreezeStatusTag :status="currentUser.freezeStatus as FreezeStatus" />
          <el-tag :type="accountStatusTagType" effect="light">{{ accountStatusLabel }}</el-tag>
        </div>
      </template>
    </ConsolePageHero>

    <ConsoleFeedbackSurface
      v-if="userStore.detailLoading"
      state="loading"
      class="user-detail-view__feedback"
    >
      <p class="user-detail-view__feedback-text">正在加载用户详情...</p>
    </ConsoleFeedbackSurface>

    <ConsoleFeedbackSurface v-else-if="!currentUser" class="user-detail-view__feedback">
      <EmptyState title="暂无用户详情" description="可以返回列表重新进入，或稍后重试详情查询。" />
    </ConsoleFeedbackSurface>

    <ConsoleDetailLayout v-else class="user-detail-view__grid">
      <template #main>
        <el-card class="user-detail-view__card" shadow="never">
          <template #header>
            <div class="user-detail-view__card-header">
              <span>账户信息</span>
              <el-tag :type="accountStatusTagType" effect="light">{{ accountStatusLabel }}</el-tag>
            </div>
          </template>

          <el-descriptions :column="2" border>
            <el-descriptions-item label="用户名">{{ currentUser.username }}</el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ currentUser.email || '-' }}</el-descriptions-item>
            <el-descriptions-item label="姓名">{{
              currentUser.realName || '-'
            }}</el-descriptions-item>
            <el-descriptions-item label="手机号">{{
              currentUser.phone || '-'
            }}</el-descriptions-item>
            <el-descriptions-item label="角色">
              {{ UserRoleLabel[currentUser.roleName as UserRole] ?? currentUser.roleName }}
            </el-descriptions-item>
            <el-descriptions-item label="冻结状态">
              {{
                FreezeStatusLabel[currentUser.freezeStatus as FreezeStatus] ??
                currentUser.freezeStatus
              }}
            </el-descriptions-item>
            <el-descriptions-item label="最近登录">{{
              currentUser.lastLoginTime || '-'
            }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{
              currentUser.updatedAt || '-'
            }}</el-descriptions-item>
            <el-descriptions-item label="创建时间" :span="2">
              {{ currentUser.createdAt || '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </template>

      <template #aside>
        <ConsoleAsidePanel
          title="风险信息"
          description="冻结状态、冻结原因与最近处理时间必须集中展示，系统管理员才能在冻结、解冻或改角色前做出可追溯判断。"
        >
          <p class="user-detail-view__risk-text">{{ riskText }}</p>

          <dl class="user-detail-view__risk-list">
            <div>
              <dt>冻结原因</dt>
              <dd>{{ currentUser.freezeReason || '-' }}</dd>
            </div>
            <div>
              <dt>冻结到期时间</dt>
              <dd>{{ currentUser.freezeExpireTime || '-' }}</dd>
            </div>
            <div>
              <dt>最近登录</dt>
              <dd>{{ currentUser.lastLoginTime || '-' }}</dd>
            </div>
          </dl>
        </ConsoleAsidePanel>
      </template>
    </ConsoleDetailLayout>
  </section>
</template>

<style scoped lang="scss">
.user-detail-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.user-detail-view__hero {
  background:
    radial-gradient(circle at top right, var(--app-tone-danger-surface-strong), transparent 30%),
    linear-gradient(135deg, var(--app-surface-card-strong), var(--app-tone-danger-surface));
}

.user-detail-view__hero-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-detail-view__feedback {
  min-height: 220px;
}

.user-detail-view__feedback-text {
  margin: 0;
  color: var(--app-text-secondary);
}

.user-detail-view__card {
  border: 1px solid var(--app-border-soft);
  border-radius: 28px;
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-card);
}

.user-detail-view__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.user-detail-view__card-header span {
  color: var(--app-text-primary);
}

.user-detail-view__risk-text {
  margin: 0;
  line-height: 1.75;
  color: var(--app-text-secondary);
}

.user-detail-view__risk-list {
  display: grid;
  gap: 14px;
  margin: 0;
}

.user-detail-view__risk-list dt {
  font-size: 13px;
  color: var(--app-text-secondary);
}

.user-detail-view__risk-list dd {
  margin: 6px 0 0;
  font-weight: 600;
  color: var(--app-text-primary);
}
</style>
