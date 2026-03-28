# 控制台导航布局重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将默认业务布局重构为“左侧整列通高侧栏 + 右侧内部顶部导航栏 + 主内容区”的控制台骨架，完成多级左侧导航、面包屑加页面标题的顶部上下文，并把默认业务页纵向滚动收口到右侧主内容区。

**Architecture:** 新增一份共享导航配置 `src/components/layout/navigation.ts`，把业务分组、角色可见项、隐藏页回溯和页面上下文解析集中管理。`AppSidebar.vue` 只负责按当前角色渲染分组导航并显示激活态，`AppHeader.vue` 负责消费导航上下文并渲染面包屑与页面标题，`AppBreadcrumb.vue` 退化为纯展示组件。`DefaultLayout.vue` 负责两列骨架与滚动边界，`reset.scss` 只提供根容器高度基线，真正的主滚动控制收口在默认布局自身。

**Tech Stack:** Vue 3 `<script setup>`、TypeScript、Vue Router、Element Plus、Pinia、SCSS、Vitest、Vue Test Utils

---

## 文件结构与职责

- `src/components/layout/navigation.ts`
  - 新增共享导航数据模型
  - 维护一级分组、二级菜单、角色可见性、隐藏页回溯规则
  - 导出 `getVisibleNavigationGroups`、`resolveNavigationContext` 等纯函数
- `src/components/layout/__tests__/navigation.spec.ts`
  - 锁定导航分组过滤、同路径不同角色文案、隐藏页回溯与面包屑拼装契约
- `src/components/layout/AppSidebar.vue`
  - 从扁平菜单升级为分组式两级导航
  - 品牌区、菜单区、底部角色区三段式结构
  - 菜单区内部滚动，支持折叠态
- `src/components/layout/__tests__/AppSidebar.spec.ts`
  - 锁定分组渲染、角色裁剪、当前路由激活、折叠态收起表现
- `src/components/layout/AppHeader.vue`
  - 顶部上下文区，显示面包屑与当前页面标题
  - 保留通知轮询、通知跳转、个人菜单和唯一折叠按钮
- `src/components/layout/AppBreadcrumb.vue`
  - 改为纯展示组件，只负责渲染传入的面包屑项
- `src/components/layout/__tests__/AppHeader.spec.ts`
  - 锁定顶部标题、面包屑、通知入口与轮询行为
- `src/components/layout/__tests__/AppBreadcrumb.spec.ts`
  - 锁定展示组件对传入面包屑项的渲染契约
- `src/layouts/DefaultLayout.vue`
  - 重构为左列整列通高侧栏、右列头部加内容视口骨架
- `src/__tests__/App.spec.ts`
  - 锁定默认布局新骨架类名与插槽承载关系
- `src/assets/styles/reset.scss`
  - 锁定根挂载容器高度基线，给默认布局的视口级滚动控制提供稳定高度参照

## 实施约束

- 只在工作树 `/home/moli/workspace/device-management-frontend/.worktrees/feature/navigation-layout-shell` 中实施
- 不修改业务路由路径、`meta.roles` 与路由守卫访问控制逻辑
- `/reservations`、`/borrows`、`/overdue` 这类同一路径但角色文案不同的页面，顶部标题以当前角色可见的导航项标题为准
- 详情页、编辑页、确认页、处理页不进入左侧导航，只通过顶部上下文表达层级
- 侧栏折叠入口只保留在头部，侧栏底部只承接角色/会话信息
- 所有新增或修改的布局、导航、匹配规则、滚动边界逻辑都补齐中文注释

---

### Task 1: 建立共享导航模型与页面上下文解析契约

**Files:**

- Create: `src/components/layout/navigation.ts`
- Create: `src/components/layout/__tests__/navigation.spec.ts`

- [ ] **Step 1: 先写失败中的导航纯函数测试**

在 `src/components/layout/__tests__/navigation.spec.ts` 中新增导航模型测试，至少覆盖 6 个关键场景：

```ts
import { describe, expect, it } from 'vitest'

import { UserRole } from '@/enums/UserRole'
import { getVisibleNavigationGroups, resolveNavigationContext } from '../navigation'

describe('navigation', () => {
  it('为普通用户返回我的预约和借还记录分组项', () => {
    const groups = getVisibleNavigationGroups(UserRole.USER)

    expect(groups.some((group) => group.title === '预约业务')).toBe(true)
    expect(JSON.stringify(groups)).toContain('我的预约')
    expect(JSON.stringify(groups)).not.toContain('用户管理')
  })

  it('在设备管理员进入借用确认页时回溯到借还管理，但页面标题仍显示借用确认', () => {
    const context = resolveNavigationContext(
      {
        name: 'BorrowConfirm',
        path: '/borrows/confirm',
        matched: [{ path: '/borrows/confirm', meta: { title: '借用确认' } }],
      },
      UserRole.DEVICE_ADMIN,
    )

    expect(context.activeItemPath).toBe('/borrows')
    expect(context.openGroupTitle).toBe('设备与资产')
    expect(context.pageTitle).toBe('借用确认')
    expect(context.breadcrumbItems.map((item) => item.title)).toEqual([
      '设备与资产',
      '借还管理',
      '借用确认',
    ])
  })

  it('在系统管理员访问 reservations 路径时使用预约管理标题', () => {
    const context = resolveNavigationContext(
      {
        name: 'ReservationList',
        path: '/reservations',
        matched: [{ path: '/reservations', meta: { title: '预约管理' } }],
      },
      UserRole.SYSTEM_ADMIN,
    )

    expect(context.pageTitle).toBe('预约管理')
  })

  it('在普通用户访问 reservations 路径时使用我的预约标题', () => {
    const context = resolveNavigationContext(
      {
        name: 'ReservationList',
        path: '/reservations',
        matched: [{ path: '/reservations', meta: { title: '预约管理' } }],
      },
      UserRole.USER,
    )

    expect(context.pageTitle).toBe('我的预约')
    expect(context.breadcrumbItems.map((item) => item.title)).toEqual(['预约业务', '我的预约'])
  })

  it('在普通用户访问 borrows 和 overdue 路径时使用用户口径标题', () => {
    const borrowContext = resolveNavigationContext(
      {
        name: 'BorrowList',
        path: '/borrows',
        matched: [{ path: '/borrows', meta: { title: '借还管理' } }],
      },
      UserRole.USER,
    )
    const overdueContext = resolveNavigationContext(
      {
        name: 'OverdueList',
        path: '/overdue',
        matched: [{ path: '/overdue', meta: { title: '逾期管理' } }],
      },
      UserRole.USER,
    )

    expect(borrowContext.pageTitle).toBe('借还记录')
    expect(overdueContext.pageTitle).toBe('逾期记录')
  })

  it('在设备管理员访问 borrows 和 overdue 路径时使用管理员口径标题', () => {
    const borrowContext = resolveNavigationContext(
      {
        name: 'BorrowList',
        path: '/borrows',
        matched: [{ path: '/borrows', meta: { title: '借还管理' } }],
      },
      UserRole.DEVICE_ADMIN,
    )
    const overdueContext = resolveNavigationContext(
      {
        name: 'OverdueList',
        path: '/overdue',
        matched: [{ path: '/overdue', meta: { title: '逾期管理' } }],
      },
      UserRole.DEVICE_ADMIN,
    )

    expect(borrowContext.pageTitle).toBe('借还管理')
    expect(overdueContext.pageTitle).toBe('逾期管理')
  })
})
```

- [ ] **Step 2: 运行新测试并确认它先失败**

Run: `npm run test:unit -- src/components/layout/__tests__/navigation.spec.ts`

Expected: FAIL，提示缺少 `navigation.ts` 或导出函数未定义。

- [ ] **Step 3: 用最小实现创建共享导航配置与解析函数**

在 `src/components/layout/navigation.ts` 中先实现最小可用的类型与纯函数，不要立刻牵扯组件：

```ts
import type { RouteLocationMatched } from 'vue-router'

import { UserRole } from '@/enums/UserRole'

export interface NavigationItem {
  title: string
  path: string
  icon: Component
  roles: UserRole[]
  matchRouteNames?: string[]
  matchPathPatterns?: string[]
}

export interface NavigationGroup {
  title: string
  items: NavigationItem[]
}

export interface NavigationContext {
  pageTitle: string
  activeItemPath: string | null
  openGroupTitle: string | null
  breadcrumbItems: Array<{ key: string; title: string }>
}

export function getVisibleNavigationGroups(role: UserRole | null): NavigationGroup[] {
  // 先按角色裁剪分组与子项
}

export function resolveNavigationContext(
  routeLike: {
    name?: string | null
    path: string
    matched: Array<Pick<RouteLocationMatched, 'path' | 'meta'>>
  },
  role: UserRole | null,
): NavigationContext {
  // 先用 matchRouteNames，再用 matchPathPatterns，最后回退 route.meta.title
}
```

关键实现点：

- 优先基于当前角色先过滤导航项，再决定 `pageTitle`、`activeItemPath` 与 `openGroupTitle`
- `matchRouteNames` 优先于 `matchPathPatterns`
- `matchPathPatterns` 用简单的动态段转正则实现即可，不引入新依赖
- 同一路径不同角色文案从过滤后的导航项中取值，不直接复用 `route.meta.title`
- 当前页若是仅面包屑页，`pageTitle` 使用当前路由的 `meta.title`，面包屑第二级仍保留所属导航项标题
- `icon` 与标题一起放进共享导航配置，避免侧栏折叠态重新维护第二套图标映射

- [ ] **Step 4: 运行导航测试确认纯函数契约通过**

Run: `npm run test:unit -- src/components/layout/__tests__/navigation.spec.ts`

Expected: PASS，角色裁剪、隐藏页回溯和标题优先级全部通过。

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/navigation.ts src/components/layout/__tests__/navigation.spec.ts
git commit -m "feat(layout): 新增共享导航上下文模型"
```

---

### Task 2: 将侧栏升级为分组式两级导航并保留角色边界

**Files:**

- Modify: `src/components/layout/AppSidebar.vue`
- Modify: `src/components/layout/__tests__/AppSidebar.spec.ts`

- [ ] **Step 1: 先把侧栏测试改成分组导航契约**

在 `src/components/layout/__tests__/AppSidebar.spec.ts` 中扩展 `routeState`，让它同时支持 `path` 与 `name`，并先写出新结构断言：

```ts
const routeState = {
  name: 'Dashboard',
  path: '/dashboard',
}

it('为普通用户渲染分组侧栏，但不展示系统管理分组', () => {
  const wrapper = mountSidebar()

  expect(wrapper.text()).toContain('工作台')
  expect(wrapper.text()).toContain('预约业务')
  expect(wrapper.text()).toContain('我的预约')
  expect(wrapper.text()).not.toContain('系统管理')
})

it('进入借用确认页时仍高亮借还管理，并展开设备与资产分组', () => {
  routeState.name = 'BorrowConfirm'
  routeState.path = '/borrows/confirm'

  const wrapper = mountSidebar()

  expect(wrapper.get('[data-active-item]').attributes('data-active-item')).toBe('/borrows')
  expect(wrapper.get('[data-open-group]').attributes('data-open-group')).toBe('设备与资产')
})
```

同时给测试桩补上 `ElSubMenu`、`ElTooltip` 或对应的自定义组容器桩，避免组件改造后测试结构失真，并增加折叠态下图标仍可见、文本被收起的断言。

- [ ] **Step 2: 运行侧栏测试并确认新断言先失败**

Run: `npm run test:unit -- src/components/layout/__tests__/AppSidebar.spec.ts`

Expected: FAIL，当前侧栏仍是扁平菜单，不存在分组、展开态和新的数据属性。

- [ ] **Step 3: 改造 `AppSidebar.vue` 为三段式分组导航**

让侧栏完全消费 `navigation.ts`，不要继续在组件内维护扁平菜单表：

```ts
import { computed } from 'vue'

import { getVisibleNavigationGroups, resolveNavigationContext } from './navigation'

const visibleGroups = computed(() => getVisibleNavigationGroups(authStore.userRole))
const navigationContext = computed(() =>
  resolveNavigationContext(
    {
      name: route.name ? String(route.name) : null,
      path: route.path,
      matched: route.matched,
    },
    authStore.userRole,
  ),
)
```

模板目标：

- 顶部品牌区继续保留系统名与缩写
- 中部菜单区渲染一级分组和二级菜单项
- 底部角色区继续显示当前角色
- 为测试和调试保留 `data-open-group` 与 `data-active-item` 这类轻量属性
- 折叠态继续渲染图标，并通过 tooltip 或等价提示暴露菜单文案

示例骨架：

```vue
<div class="app-sidebar__nav" :data-open-group="navigationContext.openGroupTitle">
  <section v-for="group in visibleGroups" :key="group.title" class="app-sidebar__group">
    <p v-if="!appStore.sidebarCollapsed" class="app-sidebar__group-title">{{ group.title }}</p>
    <el-menu :default-active="navigationContext.activeItemPath ?? ''" class="app-sidebar__menu">
      <el-menu-item v-for="item in group.items" :key="item.path" :index="item.path">
        <el-icon><component :is="item.icon" /></el-icon>
        <span>{{ item.title }}</span>
      </el-menu-item>
    </el-menu>
  </section>
</div>
```

样式目标：

- `app-sidebar` 根容器从 `height: 100vh` 改为依赖父布局的 `height: 100%`
- 菜单区使用 `min-height: 0` + `overflow: hidden`，只让内部滚动容器滚动
- 激活态保持浅琥珀色胶囊高亮
- 折叠态只保留图标与悬浮提示，不显示分组标题

- [ ] **Step 4: 运行侧栏测试确认分组导航通过**

Run: `npm run test:unit -- src/components/layout/__tests__/AppSidebar.spec.ts`

Expected: PASS，角色裁剪、分组显示、当前路由激活和折叠态断言全部通过。

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AppSidebar.vue src/components/layout/__tests__/AppSidebar.spec.ts
git commit -m "feat(layout): 重构侧栏为分组导航"
```

---

### Task 3: 重构顶部上下文区并让面包屑只负责展示

**Files:**

- Modify: `src/components/layout/AppHeader.vue`
- Modify: `src/components/layout/AppBreadcrumb.vue`
- Modify: `src/components/layout/__tests__/AppHeader.spec.ts`
- Modify: `src/components/layout/__tests__/AppBreadcrumb.spec.ts`

- [ ] **Step 1: 先把头部与面包屑测试改成新上下文契约**

在 `src/components/layout/__tests__/AppHeader.spec.ts` 中让 `routeState` 带上 `name`、`path` 与更真实的 `matched`，并新增页面标题断言：

```ts
const routeState = {
  name: 'ReservationPendingAudit',
  path: '/reservations/manage/pending',
  matched: [{ meta: { title: '预约审核' }, path: '/reservations/manage/pending' }],
}

it('在头部展示面包屑与当前页面标题', async () => {
  const wrapper = mountHeader()

  expect(wrapper.text()).toContain('预约业务')
  expect(wrapper.text()).toContain('预约审核')
  expect(wrapper.find('.app-header__page-title').exists()).toBe(true)
})

it('设备管理员进入借用确认页时，头部显示借用确认标题与借还管理面包屑', async () => {
  routeState.name = 'BorrowConfirm'
  routeState.path = '/borrows/confirm'
  routeState.matched = [{ meta: { title: '借用确认' }, path: '/borrows/confirm' }]

  const wrapper = mountHeader()

  expect(wrapper.text()).toContain('设备与资产')
  expect(wrapper.text()).toContain('借还管理')
  expect(wrapper.text()).toContain('借用确认')
})
```

在 `src/components/layout/__tests__/AppBreadcrumb.spec.ts` 中移除 `useRoute()` 依赖，改成纯 props 组件断言：

```ts
mount(AppBreadcrumb, {
  props: {
    items: [
      { key: 'group', title: '设备与资产' },
      { key: 'item', title: '借还管理' },
      { key: 'page', title: '借用确认' },
    ],
  },
})
```

- [ ] **Step 2: 运行头部与面包屑测试并确认它们先失败**

Run: `npm run test:unit -- src/components/layout/__tests__/AppHeader.spec.ts src/components/layout/__tests__/AppBreadcrumb.spec.ts`

Expected: FAIL，当前头部没有页面标题区域，`AppBreadcrumb` 也还不是 props 驱动组件。

- [ ] **Step 3: 将 `AppBreadcrumb.vue` 改成纯展示组件**

让 `AppBreadcrumb.vue` 只接受面包屑项数组，不再自己读取路由：

```ts
interface BreadcrumbItem {
  key: string
  title: string
}

const props = defineProps<{
  items: BreadcrumbItem[]
}>()
```

模板只负责渲染：

```vue
<el-breadcrumb class="app-breadcrumb" separator="/">
  <el-breadcrumb-item v-for="item in props.items" :key="item.key">
    {{ item.title }}
  </el-breadcrumb-item>
</el-breadcrumb>
```

- [ ] **Step 4: 在 `AppHeader.vue` 中接入导航上下文并重排左侧结构**

`AppHeader.vue` 新增对 `useRoute()` 和 `resolveNavigationContext()` 的消费，保持现有通知轮询逻辑不动，只改左侧结构：

```ts
import { useRoute, useRouter } from 'vue-router'

import { resolveNavigationContext } from './navigation'

const route = useRoute()

const navigationContext = computed(() =>
  resolveNavigationContext(
    {
      name: route.name ? String(route.name) : null,
      path: route.path,
      matched: route.matched,
    },
    authStore.userRole,
  ),
)
```

模板把左侧拆成上下文区，折叠按钮移动到右侧工具区并保持唯一入口：

```vue
<div class="app-header__left">
  <div class="app-header__context">
    <AppBreadcrumb :items="navigationContext.breadcrumbItems" />
    <h1 class="app-header__page-title">{{ navigationContext.pageTitle }}</h1>
  </div>
</div>

<div class="app-header__right">
  <el-button circle text class="app-header__toggle" @click="appStore.toggleSidebar()">
    <el-icon><Fold /></el-icon>
  </el-button>
  <!-- 其余通知与用户入口继续保留 -->
</div>
```

样式目标：

- 面包屑是辅助信息，不再单独包成胶囊大壳
- 页面标题是左侧视觉焦点
- 右侧通知与用户区的交互与断言保持可复用

- [ ] **Step 5: 运行头部与面包屑测试确认上下文契约通过**

Run: `npm run test:unit -- src/components/layout/__tests__/AppHeader.spec.ts src/components/layout/__tests__/AppBreadcrumb.spec.ts`

Expected: PASS，页面标题、面包屑渲染和通知轮询行为同时成立。

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/AppHeader.vue src/components/layout/AppBreadcrumb.vue src/components/layout/__tests__/AppHeader.spec.ts src/components/layout/__tests__/AppBreadcrumb.spec.ts
git commit -m "feat(layout): 重构头部导航上下文"
```

---

### Task 4: 重构默认布局壳层并收口右侧主滚动区

**Files:**

- Modify: `src/layouts/DefaultLayout.vue`
- Modify: `src/assets/styles/reset.scss`
- Modify: `src/__tests__/App.spec.ts`

- [ ] **Step 1: 先把默认布局测试改成参考图骨架契约**

在 `src/__tests__/App.spec.ts` 的默认布局用例里改成新骨架断言：

```ts
it('未声明布局时回退到参考图骨架的 DefaultLayout', () => {
  routeState.name = 'Dashboard'
  routeState.meta = {}

  const wrapper = mount(App)

  expect(wrapper.find('.default-layout').exists()).toBe(true)
  expect(wrapper.find('.default-layout__workspace').exists()).toBe(true)
  expect(wrapper.find('.default-layout__header').exists()).toBe(true)
  expect(wrapper.find('.default-layout__main-scroll').exists()).toBe(true)
})
```

- [ ] **Step 2: 运行 App 布局测试并确认新断言先失败**

Run: `npm run test:unit -- src/__tests__/App.spec.ts`

Expected: FAIL，当前默认布局还没有新的工作区和主滚动视口类名。

- [ ] **Step 3: 改造 `DefaultLayout.vue` 为两列总骨架**

参考图目标结构：

```vue
<div class="default-layout">
  <aside class="default-layout__sidebar-column">
    <AppSidebar />
  </aside>

  <div class="default-layout__workspace">
    <header class="default-layout__header">
      <AppHeader />
    </header>

    <main class="default-layout__main-scroll">
      <div class="default-layout__main-shell">
        <slot />
      </div>
    </main>
  </div>
</div>
```

样式目标：

- `default-layout` 使用固定视口高度和两列布局
- `default-layout__workspace` 使用 `grid-template-rows: auto minmax(0, 1fr)`
- `default-layout__main-scroll` 使用 `overflow-y: auto` 作为唯一主滚动区
- 左列整列通高，不再给右侧头部额外包一层会影响高度计算的实体壳

- [ ] **Step 4: 在 `reset.scss` 中补齐根容器高度基线，但不全局禁用 `body` 滚动**

补充全局高度基线，让默认布局可以稳定使用 `height: 100vh` / `minmax(0, 1fr)`，但不要直接把 `body` 设成全局禁滚，以免影响认证页和空白页：

```scss
html,
body,
#app {
  height: 100%;
}
```

保留当前最小宽度和背景逻辑，只新增与视口控制相关的中文注释，说明为什么默认布局要依赖根容器高度基线。

- [ ] **Step 5: 运行默认布局测试确认骨架契约通过**

Run: `npm run test:unit -- src/__tests__/App.spec.ts`

Expected: PASS，根组件能渲染新布局骨架，认证与 blank 布局断言保持不变。

- [ ] **Step 6: Commit**

```bash
git add src/layouts/DefaultLayout.vue src/assets/styles/reset.scss src/__tests__/App.spec.ts
git commit -m "feat(layout): 重构默认控制台骨架"
```

---

### Task 5: 全量验证、格式整理与交付检查

**Files:**

- Verify: `src/components/layout/navigation.ts`
- Verify: `src/components/layout/AppSidebar.vue`
- Verify: `src/components/layout/AppHeader.vue`
- Verify: `src/components/layout/AppBreadcrumb.vue`
- Verify: `src/layouts/DefaultLayout.vue`
- Verify: `src/assets/styles/reset.scss`
- Verify: `src/components/layout/__tests__/navigation.spec.ts`
- Verify: `src/components/layout/__tests__/AppSidebar.spec.ts`
- Verify: `src/components/layout/__tests__/AppHeader.spec.ts`
- Verify: `src/components/layout/__tests__/AppBreadcrumb.spec.ts`
- Verify: `src/__tests__/App.spec.ts`

- [ ] **Step 1: 运行导航与布局相关单测**

Run: `npm run test:unit -- src/components/layout/__tests__/navigation.spec.ts src/components/layout/__tests__/AppSidebar.spec.ts src/components/layout/__tests__/AppHeader.spec.ts src/components/layout/__tests__/AppBreadcrumb.spec.ts src/__tests__/App.spec.ts`

Expected: PASS，导航模型、侧栏、头部、面包屑和默认布局骨架全部通过。

- [ ] **Step 2: 运行类型检查**

Run: `npm run type-check`

Expected: PASS，无新的 TypeScript 或 Vue 类型错误。

- [ ] **Step 3: 运行生产构建**

Run: `npm run build`

Expected: PASS，生产构建成功，说明布局重构没有破坏编译期依赖。

- [ ] **Step 4: 格式化本次改动文件**

Run: `npx prettier --write src/components/layout/navigation.ts src/components/layout/AppSidebar.vue src/components/layout/AppHeader.vue src/components/layout/AppBreadcrumb.vue src/layouts/DefaultLayout.vue src/assets/styles/reset.scss src/components/layout/__tests__/navigation.spec.ts src/components/layout/__tests__/AppSidebar.spec.ts src/components/layout/__tests__/AppHeader.spec.ts src/components/layout/__tests__/AppBreadcrumb.spec.ts src/__tests__/App.spec.ts`

Expected: 所有改动文件格式化完成，不引入额外逻辑变更。

- [ ] **Step 5: 再跑一次导航与布局单测做格式化后回归**

Run: `npm run test:unit -- src/components/layout/__tests__/navigation.spec.ts src/components/layout/__tests__/AppSidebar.spec.ts src/components/layout/__tests__/AppHeader.spec.ts src/components/layout/__tests__/AppBreadcrumb.spec.ts src/__tests__/App.spec.ts`

Expected: PASS，确认格式化没有影响模板结构、选择器和上下文解析。

- [ ] **Step 6: 手工验证滚动边界与跨布局回归**

Run: `npm run dev`

Expected: 本地开发服务器启动后，至少人工检查以下场景：

- `/borrows` 页面纵向滚动时，只滚动右侧主内容区，不出现浏览器整页双滚动
- `/overdue` 页面纵向滚动时，表格局部滚动不抢占主内容区滚动
- `/ai` 页面消息区保留局部滚动，但页面级滚动仍由右侧主内容区承接
- 侧栏菜单项足够多时，左侧仅菜单区内部滚动，品牌区与底部角色区保持固定
- `/login` 与 `404` 页面仍可正常展示，不因为默认布局重构造成内容裁切

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/navigation.ts src/components/layout/AppSidebar.vue src/components/layout/AppHeader.vue src/components/layout/AppBreadcrumb.vue src/layouts/DefaultLayout.vue src/assets/styles/reset.scss src/components/layout/__tests__/navigation.spec.ts src/components/layout/__tests__/AppSidebar.spec.ts src/components/layout/__tests__/AppHeader.spec.ts src/components/layout/__tests__/AppBreadcrumb.spec.ts src/__tests__/App.spec.ts
git commit -m "feat(layout): 完成控制台导航布局重构"
```

---

## 完成定义

- 默认业务布局符合“左侧整列通高侧栏 + 右侧内部顶部导航栏 + 主内容区”骨架
- 左侧导航支持一级业务分组与二级菜单项，并按角色严格裁剪
- 同一路径但不同角色的标题口径由导航配置统一控制
- 详情页、编辑页、确认页、处理页不出现在左侧导航，但顶部面包屑和页面标题仍完整
- 左侧只有菜单区内部滚动，默认业务页主要纵向滚动只发生在右侧主内容区
- 导航与布局相关单测、类型检查、生产构建全部通过
