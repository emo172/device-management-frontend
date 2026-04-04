<script setup lang="ts">
import {
  Bell,
  Fold,
  Monitor,
  Moon,
  Setting,
  Sunny,
  SwitchButton,
  User,
} from '@element-plus/icons-vue'
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppDropdown from '@/components/common/dropdown/AppDropdown.vue'
import type { AppDropdownItem } from '@/components/common/dropdown/types'
import { resolveNavigationContext } from '@/components/layout/navigation'
import { useAppStore } from '@/stores/modules/app'
import { useAuthStore } from '@/stores/modules/auth'
import { useNotificationStore } from '@/stores/modules/notification'
import type { ThemePreference } from '@/utils/themeMode'

import AppBreadcrumb from './AppBreadcrumb.vue'

const DEFAULT_PAGE_TITLE = '当前页面'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

// 头部可能在异步未读数请求尚未结束时就被布局卸载，这里显式记录生命周期，避免 finally 里误重启轮询。
let headerAlive = true

/**
 * 顶部主题入口只承载三态偏好切换，不在布局层自行推导额外模式，避免和 Store 的主题真相源分叉。
 */
const themeOptions: ReadonlyArray<{
  preference: ThemePreference
  label: string
  icon: typeof Sunny
}> = [
  {
    preference: 'light',
    label: '浅色',
    icon: Sunny,
  },
  {
    preference: 'dark',
    label: '深色',
    icon: Moon,
  },
  {
    preference: 'system',
    label: '跟随系统',
    icon: Monitor,
  },
]

const displayName = computed(
  () => authStore.currentUser?.realName || authStore.currentUser?.username || '未登录用户',
)

/**
 * 头部按钮需要同时表达“用户当前选择的偏好”和“当前页面最终生效的主题”。
 * 这里优先展示偏好态，避免 `system` 被直接折算成明暗色后丢失“跟随系统”的业务含义。
 */
const currentThemeOption = computed(() => {
  const matchedOption = themeOptions.find(
    (option) => option.preference === appStore.themePreference,
  )

  return matchedOption ?? themeOptions[themeOptions.length - 1]!
})

/**
 * 主题菜单当前态必须严格跟随用户显式选择的 `themePreference`，
 * 且当前项要同时输出 `active` 与 `meta: 当前`，这样 `system` 不会因为运行时解析漂移，
 * 主题下拉也能继续给用户稳定的“当前选择”辅助提示。
 */
const themeDropdownItems = computed<AppDropdownItem[]>(() =>
  themeOptions.map((option) => ({
    key: option.preference,
    label: option.label,
    icon: option.icon,
    active: option.preference === appStore.themePreference,
    meta: option.preference === appStore.themePreference ? '当前' : undefined,
    testId: `theme-option-${option.preference}`,
  })),
)

/**
 * 所有头部用户菜单项必须提供前置图标，危险态只由包装层统一表达，
 * 这样个人中心、修改密码和退出登录都能复用统一的 dropdown 行结构，避免头部再维护私有视觉分支。
 */
const userMenuItems: AppDropdownItem[] = [
  {
    key: 'profile',
    label: '个人中心',
    icon: User,
    testId: 'user-menu-profile',
  },
  {
    key: 'password',
    label: '修改密码',
    icon: Setting,
    testId: 'user-menu-password',
  },
  {
    key: 'logout',
    label: '退出登录',
    icon: SwitchButton,
    danger: true,
    testId: 'user-menu-logout',
  },
]

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

/**
 * 顶部主题入口只做偏好写入，真正的 DOM 主题切换仍由应用入口统一接管，避免头部组件重复操作 document。
 */
function handleThemePreferenceChange(preference: ThemePreference) {
  appStore.setThemePreference(preference)
}

function handleThemeSelect(item: AppDropdownItem) {
  const nextPreference = themeOptions.find((option) => option.preference === item.key)?.preference

  if (nextPreference) {
    handleThemePreferenceChange(nextPreference)
  }
}

async function handleUserMenuSelect(item: AppDropdownItem) {
  if (item.key === 'profile') {
    handleOpenProfile()
    return
  }

  if (item.key === 'password') {
    handleOpenPasswordTab()
    return
  }

  if (item.key === 'logout') {
    await handleLogout()
  }
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

        <!-- 头部主题切换和用户菜单统一复用 AppDropdown 包装层，避免浅深主题、危险项和箭头语义继续分叉成头部私有下拉视觉。 -->
        <div class="app-header__theme-switcher">
          <AppDropdown
            data-testid="theme-entry"
            :data-theme-preference="appStore.themePreference"
            :data-resolved-theme="appStore.resolvedTheme"
            :items="themeDropdownItems"
            @select="handleThemeSelect"
          >
            <template #trigger>
              <!-- 主题 trigger 只沿用共享 dropdown 壳层展示当前主题图标与文案，不再维护头部私有触发器尺寸合同。 -->
              <el-icon aria-hidden="true"><component :is="currentThemeOption.icon" /></el-icon>
              <span class="app-header__theme-label">{{ currentThemeOption.label }}</span>
            </template>
          </AppDropdown>
        </div>

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
          <AppDropdown
            data-testid="user-menu-trigger"
            :items="userMenuItems"
            @select="handleUserMenuSelect"
          >
            <template #trigger>
              <el-avatar class="app-header__avatar">{{ displayName.slice(0, 1) }}</el-avatar>
              <span>{{ displayName }}</span>
            </template>
          </AppDropdown>
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
.app-header__theme-switcher,
.app-header__notifications,
.app-header__user-zone {
  display: flex;
}

.app-header__left,
.app-header__theme-switcher,
.app-header__notifications,
.app-header__user-zone {
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
.app-header__theme-switcher,
.app-header__user-zone {
  flex-shrink: 0;
}

.app-header__toggle,
.app-header__icon-button {
  width: 40px;
  height: 40px;
  border: 1px solid var(--app-border-soft);
  background: var(--app-surface-glass-strong);
  color: var(--app-text-primary);
}

.app-header__theme-label {
  font-size: 13px;
  white-space: nowrap;
}

.app-header__avatar {
  background: linear-gradient(135deg, var(--app-tone-warning-solid), var(--app-tone-brand-solid));
  color: var(--el-color-white);
}
</style>
