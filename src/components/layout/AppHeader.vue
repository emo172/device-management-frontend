<script setup lang="ts">
import { Bell, Fold, Setting, SwitchButton } from '@element-plus/icons-vue'
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

import { useAppStore } from '@/stores/modules/app'
import { useAuthStore } from '@/stores/modules/auth'
import { useNotificationStore } from '@/stores/modules/notification'

import AppBreadcrumb from './AppBreadcrumb.vue'

const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

// 头部可能在异步未读数请求尚未结束时就被布局卸载，这里显式记录生命周期，避免 finally 里误重启轮询。
let headerAlive = true

const displayName = computed(
  () => authStore.currentUser?.realName || authStore.currentUser?.username || '未登录用户',
)

/**
 * 头部铃铛只在默认布局下出现，默认布局本身就代表已进入受保护区域，
 * 因此这里以 currentUser 是否存在作为轮询开启条件即可，避免测试场景还要构造完整 token 流程。
 */
onMounted(async () => {
  if (!authStore.currentUser) {
    return
  }

  try {
    await notificationStore.fetchUnreadCount()
  } catch {
    /**
     * 首次未读数请求可能因为瞬时网络抖动失败。
     * 这里不阻断头部初始化，后续仍依赖轮询继续刷新角标，避免一次失败让整段会话都失去通知更新能力。
     */
  } finally {
    if (headerAlive) {
      notificationStore.startPolling()
    }
  }
})

onUnmounted(() => {
  headerAlive = false
  notificationStore.stopPolling()
})

function handleOpenNotifications() {
  void router.push('/notifications')
}

function handleOpenProfile() {
  void router.push('/profile')
}

function handleOpenPasswordTab() {
  void router.push({ path: '/profile', query: { tab: 'password' } })
}

async function handleLogout() {
  await authStore.logout()
}
</script>

<template>
  <header class="app-header">
    <div class="app-header__surface">
      <div class="app-header__left">
        <el-button circle text class="app-header__toggle" @click="appStore.toggleSidebar()">
          <el-icon><Fold /></el-icon>
        </el-button>
        <AppBreadcrumb />
      </div>

      <div class="app-header__right">
        <!-- 通知入口对所有已登录角色开放，但只走通知中心统一入口，不在头部额外分叉角色快捷菜单。 -->
        <div class="app-header__notifications">
          <el-badge
            :hidden="notificationStore.unreadCount === 0"
            :value="notificationStore.unreadCount"
          >
            <el-button
              data-testid="notification-entry"
              circle
              text
              class="app-header__icon-button"
              @click="handleOpenNotifications"
            >
              <el-icon><Bell /></el-icon>
            </el-button>
          </el-badge>
        </div>

        <!-- 用户区仅承接个人中心、改密和退出，避免头部出现越权的管理型入口。 -->
        <div class="app-header__user-zone">
          <el-dropdown class="app-header__user" trigger="click">
            <button class="app-header__user-trigger" type="button">
              <el-avatar class="app-header__avatar">{{ displayName.slice(0, 1) }}</el-avatar>
              <span>{{ displayName }}</span>
            </button>

            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleOpenProfile">
                  <el-icon><Setting /></el-icon>
                  个人中心
                </el-dropdown-item>
                <el-dropdown-item @click="handleOpenPasswordTab">修改密码</el-dropdown-item>
                <el-dropdown-item @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
@use '@/assets/styles/console-shell' as shell;

.app-header {
  height: 100%;
}

.app-header__surface {
  @include shell.console-surface(10px);

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 100%;
  padding: 0 8px;
  border-radius: inherit;
}

.app-header__left,
.app-header__right,
.app-header__notifications,
.app-header__user-zone,
.app-header__user-trigger {
  display: flex;
  align-items: center;
}

.app-header__left,
.app-header__right {
  gap: 16px;
}

.app-header__notifications,
.app-header__user-zone {
  flex-shrink: 0;
}

.app-header__toggle,
.app-header__icon-button {
  width: 40px;
  height: 40px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.86);
}

.app-header__user-trigger {
  gap: 12px;
  padding: 6px 8px 6px 6px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
  color: var(--app-text-primary);
  cursor: pointer;
}

.app-header__avatar {
  background: linear-gradient(135deg, #d97706, #f59e0b);
  color: #fff;
}
</style>
