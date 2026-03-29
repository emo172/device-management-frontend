<script setup lang="ts">
import { Histogram } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAppStore } from '@/stores/modules/app'
import { useAuthStore } from '@/stores/modules/auth'

import { getVisibleNavigationGroups, resolveNavigationContext } from './navigation'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()

/**
 * 侧栏改为完全消费共享导航真相源。
 * 这样左侧分组、高亮回溯和角色裁剪都与顶部上下文复用同一套规则，避免布局层各自维护一份菜单口径。
 */
const currentRole = computed(() => authStore.userRole)
const visibleGroups = computed(() =>
  currentRole.value ? getVisibleNavigationGroups(currentRole.value) : [],
)

/**
 * 当前命中的菜单项与展开分组必须走共享解析逻辑。
 * 例如 `/borrows/confirm` 这类仅出现在面包屑里的确认页，侧栏仍要高亮 `/borrows` 并展开“设备与资产”。
 */
const navigationContext = computed(() => {
  if (!currentRole.value) {
    return {
      activeItemPath: route.path,
      breadcrumbItems: [],
      openGroupTitle: '',
      pageTitle: typeof route.meta?.title === 'string' ? route.meta.title : route.path,
    }
  }

  return resolveNavigationContext(
    {
      name: route.name,
      path: route.path,
      meta: {
        title: typeof route.meta?.title === 'string' ? route.meta.title : null,
      },
    },
    currentRole.value,
  )
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
  <el-aside
    :width="appStore.sidebarCollapsed ? '96px' : '248px'"
    class="app-sidebar"
    :class="{ 'is-collapsed': appStore.sidebarCollapsed }"
    :data-resolved-theme="appStore.resolvedTheme"
  >
    <div class="app-sidebar__surface">
      <div class="app-sidebar__brand">
        <span class="app-sidebar__logo">DM</span>
        <div v-if="!appStore.sidebarCollapsed" class="app-sidebar__brand-text">
          <strong>智能设备管理系统</strong>
          <span>Device Console</span>
        </div>
      </div>

      <el-scrollbar class="app-sidebar__scrollbar">
        <div class="app-sidebar__nav" :data-open-group="navigationContext.openGroupTitle">
          <section
            v-for="group in visibleGroups"
            :key="group.title"
            class="app-sidebar__group"
            :class="{ 'is-open': navigationContext.openGroupTitle === group.title }"
          >
            <!-- 分组标题只在展开态展示，折叠态改由 tooltip 暴露文案，避免窄侧栏堆叠文字。 -->
            <p v-if="!appStore.sidebarCollapsed" class="app-sidebar__group-title">
              {{ group.title }}
            </p>
            <el-menu
              :collapse="appStore.sidebarCollapsed"
              :default-active="navigationContext.activeItemPath ?? ''"
              class="app-sidebar__menu"
              :data-active-item="navigationContext.activeItemPath ?? ''"
            >
              <template
                v-for="item in group.items"
                :key="`${group.title}-${item.path}-${item.title}`"
              >
                <!-- 折叠态提示必须放在菜单项内部，避免破坏 el-menu 与 el-menu-item 的直系层级关系。 -->
                <el-menu-item
                  :index="item.path"
                  class="app-sidebar__menu-item"
                  @click="handleSelect(item.path)"
                >
                  <el-tooltip
                    v-if="appStore.sidebarCollapsed"
                    :content="`${group.title} · ${item.title}`"
                    placement="right"
                  >
                    <el-icon class="app-sidebar__menu-icon">
                      <component :is="item.icon" />
                    </el-icon>
                  </el-tooltip>

                  <template v-else>
                    <el-icon class="app-sidebar__menu-icon">
                      <component :is="item.icon" />
                    </el-icon>
                    <span class="app-sidebar__menu-label">{{ item.title }}</span>
                  </template>
                </el-menu-item>
              </template>
            </el-menu>
          </section>
        </div>
      </el-scrollbar>

      <!-- 底部角色区只做当前会话身份提示，折叠态改为紧凑图标，避免宽度收起后文字挤压。 -->
      <div v-if="!appStore.sidebarCollapsed" class="app-sidebar__role-panel">
        当前角色：{{ currentRole || '未登录' }}
      </div>
      <div
        v-else
        class="app-sidebar__role-panel app-sidebar__role-panel--collapsed"
        :title="currentRole || '未登录'"
      >
        <el-icon><Histogram /></el-icon>
      </div>
    </div>
  </el-aside>
</template>

<style scoped lang="scss">
@use '@/assets/styles/console-shell' as shell;

.app-sidebar {
  height: 100%;
  padding: 16px 0 16px 16px;
  overflow: hidden;
  background: transparent;
  transition: width 0.24s ease;
}

// 折叠态必须为 Element Plus 64px 折叠菜单留出完整宽度预算，避免图标被裁切后触发横向滚动。
.app-sidebar.is-collapsed {
  padding: 16px 0 16px 8px;
}

.app-sidebar__surface {
  @include shell.console-surface(14px);

  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border-radius: var(--app-radius-lg);
  background:
    radial-gradient(circle at top, var(--app-page-accent-strong), transparent 32%),
    var(--app-surface-glass);
}

.app-sidebar__brand {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px 20px 18px;
}

.app-sidebar.is-collapsed .app-sidebar__brand {
  justify-content: center;
  gap: 0;
  padding: 18px 10px 14px;
}

.app-sidebar__logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--app-tone-warning-solid), var(--app-tone-brand-solid));
  color: var(--el-color-white);
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
  min-height: 0;
  padding: 0 14px 20px;
  overflow: hidden;
}

.app-sidebar.is-collapsed .app-sidebar__scrollbar {
  padding: 0 10px 18px;
}

.app-sidebar__scrollbar :deep(.el-scrollbar__view) {
  min-height: 100%;
}

.app-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 100%;
}

.app-sidebar__group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.app-sidebar__group-title {
  margin: 0;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--app-text-secondary);
  text-transform: uppercase;
}

.app-sidebar__group.is-open .app-sidebar__group-title {
  color: var(--app-tone-warning-text-strong);
}

.app-sidebar__menu {
  border-right: none;
  background: transparent;
}

.app-sidebar__menu :deep(.el-menu) {
  border-right: none;
  background: transparent;
}

.app-sidebar__menu :deep(.el-menu-item) {
  margin-bottom: 8px;
  min-height: 44px;
  border-radius: 14px;
}

.app-sidebar__menu :deep(.el-menu-item.is-active) {
  background: var(--app-tone-warning-surface);
  color: var(--app-tone-warning-text-strong);
}

.app-sidebar__menu-icon {
  flex-shrink: 0;
}

.app-sidebar__menu-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-sidebar__role-panel {
  padding: 18px 20px 22px;
  border-top: 1px solid var(--app-border-soft);
}

.app-sidebar.is-collapsed .app-sidebar__role-panel {
  padding: 14px 10px 16px;
}

.app-sidebar__role-panel--collapsed {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
