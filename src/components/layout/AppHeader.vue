<script setup lang="ts">
import { Bell, Fold, Setting, SwitchButton } from '@element-plus/icons-vue'
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { resolveNavigationContext } from '@/components/layout/navigation'
import { useAppStore } from '@/stores/modules/app'
import { useAuthStore } from '@/stores/modules/auth'
import { useNotificationStore } from '@/stores/modules/notification'

import AppBreadcrumb from './AppBreadcrumb.vue'

const DEFAULT_PAGE_TITLE = '当前页面'

const route = useRoute()
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
 * 顶部上下文统一复用共享导航解析结果。
 * 这样可以保证左侧菜单高亮、面包屑分组标题和当前页标题始终使用同一套角色口径，
 * 尤其是 `/reservations`、`/borrows` 这类同路径不同角色文案的页面不会再次漂移。
 */
const navigationContext = computed(() => {
  const routeTitle = typeof route.meta.title === 'string' ? route.meta.title : ''
  const currentRole = authStore.currentUser?.role

  if (!currentRole) {
    /**
     * 未登录场景只需要保留一个稳定可读的标题兜底，
     * 不能把原始路径直接暴露到头部，避免测试态或异常态把内部路由细节展示给用户。
     */
    return {
      activeItemPath: route.path,
      breadcrumbItems: routeTitle ? [{ title: routeTitle, path: route.path }] : [],
      openGroupTitle: '',
      pageTitle: routeTitle || DEFAULT_PAGE_TITLE,
    }
  }

  return resolveNavigationContext(
    {
      meta: { title: routeTitle },
      name: route.name,
      path: route.path,
    },
    currentRole,
  )
})

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
        <!-- 左侧只表达页面上下文，面包屑负责定位业务域，页面标题负责承接当前页主语义。 -->
        <div class="app-header__context">
          <AppBreadcrumb :items="navigationContext.breadcrumbItems" />
          <h1 class="app-header__page-title">{{ navigationContext.pageTitle }}</h1>
        </div>
      </div>

      <div class="app-header__right">
        <!-- 侧栏折叠入口只保留在头部工具区，避免布局同时出现两个入口造成操作分叉。 -->
        <el-button circle text class="app-header__toggle" @click="appStore.toggleSidebar()">
          <el-icon><Fold /></el-icon>
        </el-button>

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
.app-header__context,
.app-header__notifications,
.app-header__user-zone,
.app-header__user-trigger {
  display: flex;
}

.app-header__left,
.app-header__notifications,
.app-header__user-zone,
.app-header__user-trigger {
  align-items: center;
}

.app-header__left {
  flex: 1;
  min-width: 0;
}

.app-header__context {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.app-header__page-title {
  margin: 0;
  color: var(--app-text-primary);
  font-size: clamp(22px, 2vw, 28px);
  font-weight: 600;
  line-height: 1.1;
}

.app-header__right {
  align-items: center;
  flex-shrink: 0;
  gap: 12px;
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
