<script setup lang="ts">
import {
  Bell,
  ChatDotRound,
  DataAnalysis,
  DocumentCopy,
  FolderOpened,
  Histogram,
  House,
  List,
  Monitor,
  Notebook,
  Operation,
  Reading,
  Setting,
  User,
} from '@element-plus/icons-vue'
import { computed, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { UserRole } from '@/enums/UserRole'
import { useAppStore } from '@/stores/modules/app'
import { useAuthStore } from '@/stores/modules/auth'

interface SidebarMenuItem {
  title: string
  path: string
  icon: Component
  roles: UserRole[]
}

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()

const allRoles = [UserRole.USER, UserRole.DEVICE_ADMIN, UserRole.SYSTEM_ADMIN]

/**
 * 侧边栏菜单配置。
 * 通过统一表声明路径、标题和角色边界，避免模板里散落多处 v-if 导致菜单口径与路由权限逐渐失配。
 */
const menuItems: SidebarMenuItem[] = [
  { title: '仪表盘', path: '/dashboard', icon: House, roles: allRoles },
  { title: '设备中心', path: '/devices', icon: Monitor, roles: allRoles },
  {
    title: '分类管理',
    path: '/devices/categories',
    icon: FolderOpened,
    roles: [UserRole.DEVICE_ADMIN],
  },
  { title: '我的预约', path: '/reservations', icon: Notebook, roles: [UserRole.USER] },
  {
    title: '预约审核',
    path: '/reservations/manage/pending',
    icon: List,
    roles: [UserRole.DEVICE_ADMIN, UserRole.SYSTEM_ADMIN],
  },
  {
    title: '预约管理',
    path: '/reservations',
    icon: List,
    roles: [UserRole.DEVICE_ADMIN, UserRole.SYSTEM_ADMIN],
  },
  { title: '借还记录', path: '/borrows', icon: Reading, roles: [UserRole.USER] },
  { title: '借还管理', path: '/borrows', icon: Reading, roles: [UserRole.DEVICE_ADMIN] },
  { title: '逾期记录', path: '/overdue', icon: Operation, roles: [UserRole.USER] },
  { title: '逾期管理', path: '/overdue', icon: Operation, roles: [UserRole.DEVICE_ADMIN] },
  { title: 'AI 对话', path: '/ai', icon: ChatDotRound, roles: [UserRole.USER] },
  { title: '通知中心', path: '/notifications', icon: Bell, roles: allRoles },
  { title: '统计分析', path: '/statistics', icon: DataAnalysis, roles: [UserRole.SYSTEM_ADMIN] },
  { title: '用户管理', path: '/users', icon: User, roles: [UserRole.SYSTEM_ADMIN] },
  { title: '角色权限', path: '/admin/roles', icon: Setting, roles: [UserRole.SYSTEM_ADMIN] },
  {
    title: 'Prompt 模板',
    path: '/admin/prompt-templates',
    icon: DocumentCopy,
    roles: [UserRole.SYSTEM_ADMIN],
  },
]

const currentRole = computed(() => authStore.userRole)
const visibleMenuItems = computed(() => {
  if (!currentRole.value) {
    return []
  }

  return menuItems.filter((item) => item.roles.includes(currentRole.value as UserRole))
})

/**
 * 侧边栏高亮需要覆盖详情页、确认页等子路由。
 * 例如进入 `/borrows/confirm` 时仍应高亮 `/borrows`，否则用户会误以为自己离开了当前业务域。
 */
const activePath = computed(() => {
  const matchedItem = [...visibleMenuItems.value]
    .sort((left, right) => right.path.length - left.path.length)
    .find((item) => route.path === item.path || route.path.startsWith(`${item.path}/`))

  return matchedItem?.path ?? route.path
})

/**
 * 菜单点击统一交给路由跳转。
 * 这里不使用 router 模式，避免布局在测试环境和未挂载完整应用实例时额外依赖全局插件配置。
 */
function handleSelect(path: string) {
  if (path !== route.path) {
    void router.push(path)
  }
}
</script>

<template>
  <el-aside :width="appStore.sidebarCollapsed ? '88px' : '248px'" class="app-sidebar">
    <div class="app-sidebar__surface">
      <div class="app-sidebar__brand">
        <span class="app-sidebar__logo">DM</span>
        <div v-if="!appStore.sidebarCollapsed" class="app-sidebar__brand-text">
          <strong>智能设备管理系统</strong>
          <span>Device Console</span>
        </div>
      </div>

      <el-scrollbar class="app-sidebar__scrollbar">
        <!-- 侧边栏菜单严格按当前角色裁剪，避免未授权角色看到不应出现的业务入口。 -->
        <el-menu
          :collapse="appStore.sidebarCollapsed"
          :default-active="activePath"
          class="app-sidebar__menu"
          @select="handleSelect"
        >
          <el-menu-item v-for="item in visibleMenuItems" :key="item.title" :index="item.path">
            <el-icon>
              <component :is="item.icon" />
            </el-icon>
            <span>{{ item.title }}</span>
          </el-menu-item>
        </el-menu>
      </el-scrollbar>

      <!-- 底部角色区只做当前会话身份提示，折叠态改为紧凑图标，避免宽度收起后文字挤压。 -->
      <div v-if="!appStore.sidebarCollapsed" class="app-sidebar__role-panel">
        当前角色：{{ currentRole || '未登录' }}
      </div>
      <div v-else class="app-sidebar__role-panel app-sidebar__role-panel--collapsed">
        <el-icon><Histogram /></el-icon>
      </div>
    </div>
  </el-aside>
</template>

<style scoped lang="scss">
@use '@/assets/styles/console-shell' as shell;

.app-sidebar {
  height: 100vh;
  padding: 16px 0 16px 16px;
  background: transparent;
  transition: width 0.24s ease;
}

.app-sidebar__surface {
  @include shell.console-surface(14px);

  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: var(--app-radius-lg) 0 0 var(--app-radius-lg);
  background:
    radial-gradient(circle at top, rgba(233, 180, 76, 0.16), transparent 32%),
    var(--app-surface-glass);
}

.app-sidebar__brand {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px 20px 18px;
}

.app-sidebar__logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(135deg, #d97706, #f59e0b);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}

.app-sidebar__brand-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.app-sidebar__brand-text strong {
  font-size: 15px;
  color: var(--app-text-primary);
}

.app-sidebar__brand-text span,
.app-sidebar__role-panel {
  font-size: 12px;
  color: var(--app-text-secondary);
}

.app-sidebar__scrollbar {
  flex: 1;
  padding: 0 14px 20px;
}

.app-sidebar__menu {
  border-right: none;
  background: transparent;
}

.app-sidebar__menu :deep(.el-menu-item) {
  margin-bottom: 8px;
  border-radius: 14px;
}

.app-sidebar__menu :deep(.el-menu-item.is-active) {
  background: rgba(217, 119, 6, 0.12);
  color: #9a3412;
}

.app-sidebar__role-panel {
  padding: 18px 20px 22px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}

.app-sidebar__role-panel--collapsed {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
