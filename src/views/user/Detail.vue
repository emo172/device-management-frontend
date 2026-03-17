<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'

import FreezeStatusTag from '@/components/business/FreezeStatusTag.vue'
import EmptyState from '@/components/common/EmptyState.vue'
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

watch(
  userId,
  (value) => {
    if (!value) {
      userStore.resetCurrentManagedUser()
      return
    }

    userStore.resetCurrentManagedUser()
    void userStore.fetchUserDetail(value)
  },
  { immediate: true },
)

onUnmounted(() => {
  userStore.resetCurrentManagedUser()
})
</script>

<template>
  <section class="user-detail-view">
    <header class="user-detail-view__hero">
      <div>
        <p class="user-detail-view__eyebrow">System / User Detail</p>
        <h1 class="user-detail-view__title">{{ currentUser?.username || '用户详情' }}</h1>
        <p class="user-detail-view__description">
          展示系统管理员处理账号前必须确认的身份与风险信息，避免仅凭列表页最小字段做高风险决策。
        </p>
      </div>
      <FreezeStatusTag v-if="currentUser" :status="currentUser.freezeStatus as FreezeStatus" />
    </header>

    <EmptyState
      v-if="!currentUser && !userStore.detailLoading"
      title="暂无用户详情"
      description="可以返回列表重新进入，或稍后重试详情查询。"
    />

    <div v-else class="user-detail-view__grid">
      <el-card class="user-detail-view__card" shadow="never">
        <template #header>
          <div class="user-detail-view__card-header">
            <span>账户信息</span>
            <el-tag :type="currentUser?.status === 1 ? 'success' : 'info'" effect="light">
              {{ currentUser?.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </div>
        </template>

        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户名">{{
            currentUser?.username || '-'
          }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ currentUser?.email || '-' }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{
            currentUser?.realName || '-'
          }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{
            currentUser?.phone || '-'
          }}</el-descriptions-item>
          <el-descriptions-item label="角色">
            {{ UserRoleLabel[currentUser?.roleName as UserRole] ?? currentUser?.roleName ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="冻结状态">
            {{
              FreezeStatusLabel[currentUser?.freezeStatus as FreezeStatus] ??
              currentUser?.freezeStatus ??
              '-'
            }}
          </el-descriptions-item>
          <el-descriptions-item label="最近登录">{{
            currentUser?.lastLoginTime || '-'
          }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{
            currentUser?.updatedAt || '-'
          }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card class="user-detail-view__card" shadow="never">
        <template #header>
          <div class="user-detail-view__card-header">
            <span>风险信息</span>
          </div>
        </template>

        <div class="user-detail-view__risk-panel">
          <p class="user-detail-view__risk-text">{{ riskText }}</p>
          <dl class="user-detail-view__risk-list">
            <div>
              <dt>冻结原因</dt>
              <dd>{{ currentUser?.freezeReason || '-' }}</dd>
            </div>
            <div>
              <dt>冻结到期时间</dt>
              <dd>{{ currentUser?.freezeExpireTime || '-' }}</dd>
            </div>
            <div>
              <dt>创建时间</dt>
              <dd>{{ currentUser?.createdAt || '-' }}</dd>
            </div>
          </dl>
        </div>
      </el-card>
    </div>
  </section>
</template>

<style scoped lang="scss">
.user-detail-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.user-detail-view__hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 32px;
  border: 1px solid rgba(14, 116, 144, 0.12);
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(239, 68, 68, 0.12), transparent 30%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92));
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.user-detail-view__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #0f766e;
}

.user-detail-view__title {
  margin: 0;
  font-size: 30px;
  color: var(--app-text-primary);
}

.user-detail-view__description,
.user-detail-view__risk-text {
  margin: 12px 0 0;
  line-height: 1.75;
  color: var(--app-text-secondary);
}

.user-detail-view__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.user-detail-view__card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
}

.user-detail-view__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-detail-view__risk-list {
  display: grid;
  gap: 14px;
  margin: 18px 0 0;
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
