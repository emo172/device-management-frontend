# 统一筛选卡片布局 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为筛选区、查询条和顶部工具条落地统一的双层卡片骨架，并把通知中心从侧栏筛选迁回顶部横向卡片。

**Architecture:** 新增 `ConsoleFilterPanel` 作为稳定的布局壳层，只负责标题层与操作层的 DOM 和样式，不接管具体业务字段。`SearchBar` 改为消费该壳层，借还、逾期、统计、预约、通知页分别把原有顶部结构替换为同一骨架，同时保留各自业务交互与轻量页面语气。

**Tech Stack:** Vue 3 SFC、TypeScript、SCSS、Vitest、Vue Test Utils、Element Plus

---

## 文件结构与职责

- Create: `src/components/layout/ConsoleFilterPanel.vue`
  负责统一双层筛选卡片的稳定 DOM、插槽契约和基础样式。
- Modify: `src/components/layout/__tests__/ConsoleShells.spec.ts`
  为新壳层补结构测试，验证稳定类名、空插槽和主题 token 口径。
- Modify: `src/components/common/SearchBar.vue`
  从 `ConsoleToolbarShell` 迁移到 `ConsoleFilterPanel`，保留输入/查询/重置行为。
- Modify: `src/components/common/__tests__/CommonComponents.spec.ts`
  更新 `SearchBar` 的结构断言与事件断言。
- Modify: `src/views/device/List.vue`
  为设备页搜索条注入业务化标题/说明文案，确认无需额外页面壳层。
- Modify: `src/views/device/__tests__/List.spec.ts`
  把旧的 `.console-toolbar-shell` 断言切到新筛选壳层或 `SearchBar` 新结构。
- Modify: `src/views/user/List.vue`
  为用户页搜索条注入“当前页筛选”语义化标题/说明文案。
- Modify: `src/views/user/__tests__/List.spec.ts`
  更新对 `SearchBar` stub 和查询交互的断言口径。
- Modify: `src/views/borrow/List.vue`
  用 `ConsoleFilterPanel` 替换页面手写筛选壳层，保留借还状态表单和按钮。
- Modify: `src/views/borrow/__tests__/BorrowPages.spec.ts`
  将顶部壳层断言从 `.console-toolbar-shell` 调整为 `.console-filter-panel`。
- Modify: `src/views/overdue/List.vue`
  用 `ConsoleFilterPanel` 替换逾期处理状态筛选壳层。
- Modify: `src/views/overdue/__tests__/OverduePages.spec.ts`
  更新顶部筛选区断言。
- Modify: `src/views/statistics/DeviceUsage.vue`
- Modify: `src/views/statistics/BorrowStats.vue`
- Modify: `src/views/statistics/HotTimeSlots.vue`
- Modify: `src/views/statistics/OverdueStats.vue`
  统一四个统计详情页的日期筛选卡片结构。
- Modify: `src/views/statistics/__tests__/StatisticsPages.spec.ts`
  更新四个统计页顶部壳层断言。
- Modify: `src/views/reservation/List.vue`
  把操作型工具条替换为无字段版 `ConsoleFilterPanel`。
- Modify: `src/views/reservation/__tests__/List.spec.ts`
  为无字段场景更新结构断言。
- Modify: `src/views/notification/List.vue`
  移除 `ConversationShell`，重排成 `Hero -> ConsoleFilterPanel -> 列表区`。
- Modify: `src/views/notification/__tests__/List.spec.ts`
  删除对 `.conversation-shell` / `.notification-list-view__filters` 的依赖，改测新层级和筛选交互。

### Task 1: 新增统一筛选壳层组件

**Files:**

- Create: `src/components/layout/ConsoleFilterPanel.vue`
- Test: `src/components/layout/__tests__/ConsoleShells.spec.ts`

- [ ] **Step 1: 先写失败测试，锁定稳定 DOM 与插槽契约**

```ts
it('ConsoleFilterPanel 渲染稳定结构与 actions 插槽', async () => {
  const ConsoleFilterPanel = (await import('../ConsoleFilterPanel.vue')).default
  const wrapper = mount(ConsoleFilterPanel, {
    props: {
      title: '通知类型筛选',
      description: '顶部统一筛选与操作入口',
    },
    slots: {
      default: '<div class="field-stub">字段</div>',
      actions: '<button class="action-stub">刷新</button>',
    },
  })

  expect(wrapper.find('.console-filter-panel').exists()).toBe(true)
  expect(wrapper.find('.console-filter-panel__header').exists()).toBe(true)
  expect(wrapper.find('.console-filter-panel__body').exists()).toBe(true)
  expect(wrapper.find('.console-filter-panel__fields').exists()).toBe(true)
  expect(wrapper.find('.console-filter-panel__actions').exists()).toBe(true)
})

it('ConsoleFilterPanel 默认使用统一 eyebrow，且未传 description 时不渲染说明节点', async () => {
  const ConsoleFilterPanel = (await import('../ConsoleFilterPanel.vue')).default
  const wrapper = mount(ConsoleFilterPanel, {
    props: { title: '列表操作' },
  })

  expect(wrapper.text()).toContain('筛选与操作')
  expect(wrapper.find('.console-filter-panel__description').exists()).toBe(false)
})

it('ConsoleFilterPanel 在空字段和空按钮场景仍保留稳定容器', async () => {
  const ConsoleFilterPanel = (await import('../ConsoleFilterPanel.vue')).default
  const wrapper = mount(ConsoleFilterPanel, {
    props: { title: '列表操作' },
  })

  expect(wrapper.find('.console-filter-panel__fields').exists()).toBe(true)
  expect(wrapper.find('.console-filter-panel__actions').exists()).toBe(true)
})
```

- [ ] **Step 2: 运行单测，确认现在会失败**

Run: `npm run test:unit -- src/components/layout/__tests__/ConsoleShells.spec.ts -t ConsoleFilterPanel`
Expected: FAIL，报 `ConsoleFilterPanel.vue` 缺失或结构断言不成立。

- [ ] **Step 3: 写最小实现，固定标题层 / 操作层 / 稳定类名**

```vue
<template>
  <section class="console-filter-panel">
    <header class="console-filter-panel__header">
      <p class="console-filter-panel__eyebrow">{{ eyebrow }}</p>
      <h2 class="console-filter-panel__title">{{ title }}</h2>
      <p v-if="description" class="console-filter-panel__description">{{ description }}</p>
    </header>

    <section class="console-filter-panel__body">
      <div class="console-filter-panel__fields">
        <slot />
      </div>
      <div class="console-filter-panel__actions">
        <slot name="actions" />
      </div>
    </section>
  </section>
</template>
```

- [ ] **Step 4: 用现有主题 token 补基础样式和中文注释**

```scss
.console-filter-panel__body {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.console-filter-panel__fields {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.console-filter-panel__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
```

- [ ] **Step 5: 重新运行该组件测试，确认通过**

Run: `npm run test:unit -- src/components/layout/__tests__/ConsoleShells.spec.ts -t ConsoleFilterPanel`
Expected: PASS，新增用例通过。

### Task 2: 让 SearchBar 接入统一骨架并覆盖设备/用户页

**Files:**

- Modify: `src/components/common/SearchBar.vue`
- Modify: `src/components/common/__tests__/CommonComponents.spec.ts`
- Modify: `src/views/device/List.vue`
- Modify: `src/views/device/__tests__/List.spec.ts`
- Modify: `src/views/user/List.vue`
- Modify: `src/views/user/__tests__/List.spec.ts`

- [ ] **Step 1: 先更新 SearchBar 测试，要求它渲染新壳层**

```ts
expect(wrapper.find('.console-filter-panel').exists()).toBe(true)
expect(wrapper.find('.search-bar__submit').exists()).toBe(true)
expect(wrapper.find('.search-bar__reset').exists()).toBe(true)
expect(wrapper.find('.console-toolbar-shell').exists()).toBe(false)

const minimalWrapper = mount(SearchBar, {
  props: {
    modelValue: '',
  },
})

expect(minimalWrapper.text()).toContain('筛选与操作')
expect(minimalWrapper.text()).toContain('筛选条件')
```

- [ ] **Step 2: 运行 SearchBar 组件测试，确认旧实现失败**

Run: `npm run test:unit -- src/components/common/__tests__/CommonComponents.spec.ts -t SearchBar`
Expected: FAIL，旧实现仍渲染 `.console-toolbar-shell`。

- [ ] **Step 3: 改造 SearchBar 为 ConsoleFilterPanel 包装**

```vue
<ConsoleFilterPanel class="search-bar" :eyebrow="eyebrow" :title="title" :description="description">
  <label class="search-bar__field">
    <span class="search-bar__label">{{ label }}</span>
    <el-input ... />
  </label>

  <template #actions>
    <el-button class="search-bar__submit" type="primary" @click="handleSearch">查询</el-button>
    <el-button class="search-bar__reset" @click="handleReset">重置</el-button>
  </template>
</ConsoleFilterPanel>
```

- [ ] **Step 4: 为 SearchBar 增加默认标题层，并在设备/用户页传入更具体文案**

```ts
withDefaults(
  defineProps<{
    modelValue: string
    title?: string
    description?: string
    eyebrow?: string
    placeholder?: string
    label?: string
  }>(),
  {
    eyebrow: '筛选与操作',
    title: '筛选条件',
    description: '调整条件后更新当前列表结果。',
  },
)
```

```vue
<SearchBar
  v-model="filters.categoryName"
  title="设备筛选"
  description="按分类名称快速缩小当前设备列表范围。"
  label="分类名称"
  ...
/>
```

- [ ] **Step 5: 更新设备页与用户页测试 stub / 断言**

```ts
SearchBar: {
  template: '<div class="console-filter-panel search-bar-stub"></div>'
}

expect(wrapper.find('.console-filter-panel').exists()).toBe(true)
expect(wrapper.find('.console-toolbar-shell').exists()).toBe(false)
```

- [ ] **Step 6: 运行组件 + 设备页 + 用户页相关测试**

Run: `npm run test:unit -- src/components/common/__tests__/CommonComponents.spec.ts src/views/device/__tests__/List.spec.ts src/views/user/__tests__/List.spec.ts`
Expected: PASS，SearchBar 相关断言全部切到 `.console-filter-panel`。

### Task 3: 迁移借还页与逾期页的筛选区

**Files:**

- Modify: `src/views/borrow/List.vue`
- Modify: `src/views/borrow/__tests__/BorrowPages.spec.ts`
- Modify: `src/views/overdue/List.vue`
- Modify: `src/views/overdue/__tests__/OverduePages.spec.ts`

- [ ] **Step 1: 先改借还/逾期测试，要求顶部区出现新壳层**

```ts
expect(wrapper.find('.console-filter-panel').exists()).toBe(true)
expect(wrapper.find('.console-toolbar-shell').exists()).toBe(false)
```

- [ ] **Step 2: 运行借还/逾期页测试，确认会按旧壳层断言失败**

Run: `npm run test:unit -- src/views/borrow/__tests__/BorrowPages.spec.ts src/views/overdue/__tests__/OverduePages.spec.ts`
Expected: FAIL，旧页面仍输出 `.console-toolbar-shell`。

- [ ] **Step 3: 在借还页替换为 ConsoleFilterPanel，并保留现有表单字段**

```vue
<ConsoleFilterPanel
  class="borrow-list-view__filter-panel"
  eyebrow="筛选与操作"
  title="借还状态筛选"
  description="统一筛选借还状态，并保留管理员常用操作入口。"
>
  <label class="borrow-list-view__field">...</label>

  <template #actions>
    <el-button type="primary" @click="handleSearch">查询</el-button>
    <el-button @click="handleReset">重置</el-button>
  </template>
</ConsoleFilterPanel>
```

- [ ] **Step 4: 在逾期页替换为 ConsoleFilterPanel，并收掉重复标题层样式**

```vue
<ConsoleFilterPanel
  class="overdue-list-view__filter-panel"
  title="处理状态筛选"
  description="统一筛选待处理与已处理逾期单据，避免用户反复寻找入口。"
>
  <label class="overdue-list-view__field">...</label>
  <template #actions>...</template>
</ConsoleFilterPanel>
```

- [ ] **Step 5: 清理页面级重复的标题/眉标壳层 CSS，只保留字段布局**

```scss
.borrow-list-view__field,
.overdue-list-view__field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
```

- [ ] **Step 6: 确认借还/逾期源码级 token 断言仍成立，必要时补充新布局类名的 token 断言**

```ts
expect(listSource).toContain('var(--app-surface-card-strong)')
expect(listSource).toContain('var(--app-shadow-card)')
expect(listSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\()/)
```

- [ ] **Step 7: 重新运行借还/逾期页测试**

Run: `npm run test:unit -- src/views/borrow/__tests__/BorrowPages.spec.ts src/views/overdue/__tests__/OverduePages.spec.ts`
Expected: PASS，顶部筛选断言切到 `.console-filter-panel`，原有业务交互仍通过。

### Task 4: 迁移统计详情页的日期筛选卡片

**Files:**

- Modify: `src/views/statistics/DeviceUsage.vue`
- Modify: `src/views/statistics/BorrowStats.vue`
- Modify: `src/views/statistics/HotTimeSlots.vue`
- Modify: `src/views/statistics/OverdueStats.vue`
- Modify: `src/views/statistics/__tests__/StatisticsPages.spec.ts`

- [ ] **Step 1: 先把四个统计页测试的顶部壳层断言改成新组件**

```ts
expect(wrapper.find('.console-filter-panel').exists()).toBe(true)
expect(wrapper.find('.console-toolbar-shell').exists()).toBe(false)
```

- [ ] **Step 2: 运行统计页测试，确认旧壳层断言失败**

Run: `npm run test:unit -- src/views/statistics/__tests__/StatisticsPages.spec.ts`
Expected: FAIL，四个详情页仍使用 `.console-toolbar-shell`。

- [ ] **Step 3: 把四个统计页顶部统一替换成 ConsoleFilterPanel**

```vue
<ConsoleFilterPanel
  class="statistics-detail-view__toolbar"
  eyebrow="筛选与操作"
  title="统计日期筛选"
  description="所有统计子页共用同一日期口径，避免图表与总览页口径漂移。"
>
  <el-date-picker ... />

  <template #actions>
    <el-button @click="handleRefresh">刷新数据</el-button>
  </template>
</ConsoleFilterPanel>
```

- [ ] **Step 4: 清理四个页面里只服务旧壳层的局部布局样式**

```scss
.statistics-detail-view__toolbar :deep(.console-filter-panel__fields) {
  align-items: flex-end;
}
```

- [ ] **Step 5: 保留或补充统计页源码级 token 断言，避免新壳层引入硬编码颜色**

```ts
expect(source).toContain('var(--app-surface-card)')
expect(source).toContain('var(--app-border-soft)')
expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\()/)
```

- [ ] **Step 6: 重新运行统计页测试**

Run: `npm run test:unit -- src/views/statistics/__tests__/StatisticsPages.spec.ts`
Expected: PASS，图表页仍保留侧栏摘要和日期切换行为，顶部壳层统一成 `.console-filter-panel`。

### Task 5: 迁移预约列表的无字段操作型卡片

**Files:**

- Modify: `src/views/reservation/List.vue`
- Modify: `src/views/reservation/__tests__/List.spec.ts`

- [ ] **Step 1: 先把预约列表测试断言切到新骨架**

```ts
expect(wrapper.find('.console-filter-panel').exists()).toBe(true)
expect(wrapper.find('.console-filter-panel__fields').exists()).toBe(true)
expect(wrapper.find('.console-filter-panel__actions').exists()).toBe(true)
expect(wrapper.find('.console-toolbar-shell').exists()).toBe(false)
```

- [ ] **Step 2: 运行预约列表测试，确认旧工具条断言失败**

Run: `npm run test:unit -- src/views/reservation/__tests__/List.spec.ts`
Expected: FAIL，页面顶部仍是 `.console-toolbar-shell`。

- [ ] **Step 3: 将预约列表顶部改为无字段版 ConsoleFilterPanel**

```vue
<ConsoleFilterPanel
  class="reservation-list-view__toolbar"
  title="列表操作"
  description="本页承接预约刷新与创建入口，不在这里混入额外审批流程。"
>
  <template #actions>
    <el-button @click="loadReservationList()">刷新</el-button>
    <el-button v-if="canCreateReservation" type="primary" @click="handleCreate">创建预约</el-button>
  </template>
</ConsoleFilterPanel>
```

- [ ] **Step 4: 给空字段场景补页面级最小样式，避免 body 高度塌陷**

```scss
.reservation-list-view__toolbar :deep(.console-filter-panel__fields) {
  min-height: 0;
}
```

- [ ] **Step 5: 如预约页测试尚未覆盖源码级 token 约束，补一条列表源码断言**

```ts
const source = readReservationViewSource('List.vue')
expect(source).toContain('var(--app-surface-card-strong)')
expect(source).toContain('var(--app-shadow-card)')
expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\()/)
```

- [ ] **Step 6: 重新运行预约列表测试**

Run: `npm run test:unit -- src/views/reservation/__tests__/List.spec.ts`
Expected: PASS，用户 / 系统管理员 / 设备管理员三种角色路径仍通过。

### Task 6: 重排通知中心为顶部筛选卡片 + 单主列列表

**Files:**

- Modify: `src/views/notification/List.vue`
- Modify: `src/views/notification/__tests__/List.spec.ts`

- [ ] **Step 1: 先把通知页测试改成新层级断言**

```ts
expect(wrapper.find('.conversation-shell').exists()).toBe(false)
expect(wrapper.find('.notification-list-view__filters').exists()).toBe(false)
expect(wrapper.find('.console-filter-panel').exists()).toBe(true)
expect(wrapper.find('.notification-list-view__list-shell').exists()).toBe(true)
expect(wrapper.find('.notification-list-view__list-header').exists()).toBe(true)
expect(wrapper.find('.notification-list-view__hero-actions').text()).toContain('1 条未读')
expect(wrapper.find('.notification-list-view__hero-actions').text()).not.toContain('刷新列表')
expect(wrapper.find('.console-filter-panel').text()).toContain('刷新列表')
expect(wrapper.find('.console-filter-panel').text()).toContain('全部标记已读')
```

- [ ] **Step 2: 运行通知页测试，确认旧侧栏结构断言失败**

Run: `npm run test:unit -- src/views/notification/__tests__/List.spec.ts`
Expected: FAIL，页面仍依赖 `ConversationShell` 和侧栏筛选。

- [ ] **Step 3: 移除 ConversationShell，改成纵向流布局**

```vue
<ConsolePageHero ...>
  <template #actions>
    <div class="notification-list-view__hero-actions">
      <el-tag type="warning" effect="light">{{ unreadCountText }}</el-tag>
    </div>
  </template>
</ConsolePageHero>

<ConsoleFilterPanel
  title="通知类型筛选"
  description="统一承载通知类型过滤、刷新和已读操作，避免通知页成为侧栏特例。"
>
  <el-select v-model="selectedType" ... />
  <template #actions>
    <el-button @click="handleResetFilter">重置筛选</el-button>
    <el-button @click="loadNotifications">刷新列表</el-button>
    <el-button type="primary" :disabled="notificationStore.unreadCount === 0" @click="handleMarkAllRead">全部标记已读</el-button>
  </template>
</ConsoleFilterPanel>

<section class="notification-list-view__list-shell">...</section>
```

- [ ] **Step 4: 清理只服务旧侧栏布局的样式，并保留列表头和列表区稳定类名**

```scss
.notification-list-view__list-shell {
  border: 1px solid var(--app-border-soft);
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-card);
}
```

- [ ] **Step 5: 在通知页测试里把列表区直系层级写死**

```ts
const listShell = wrapper.get('.notification-list-view__list-shell')
expect(listShell.find('.notification-list-view__list-header').exists()).toBe(true)
expect(
  listShell.find('.notification-list-view__list').exists() ||
    listShell.find('.empty-state-stub').exists(),
).toBe(true)
```

- [ ] **Step 6: 重新运行通知页测试**

Run: `npm run test:unit -- src/views/notification/__tests__/List.spec.ts`
Expected: PASS，未读摘要仍在 Hero，筛选/刷新/全部已读迁入 `ConsoleFilterPanel`，类型筛选交互仍正常。

### Task 7: 全量回归与交付验证

**Files:**

- Modify: `src/components/layout/ConsoleFilterPanel.vue`（如回归暴露最后修正）
- Modify: 所有本计划已变更文件

- [ ] **Step 1: 跑本次改动的集中单测回归**

Run: `npm run test:unit -- src/components/layout/__tests__/ConsoleShells.spec.ts src/components/common/__tests__/CommonComponents.spec.ts src/views/device/__tests__/List.spec.ts src/views/user/__tests__/List.spec.ts src/views/borrow/__tests__/BorrowPages.spec.ts src/views/overdue/__tests__/OverduePages.spec.ts src/views/statistics/__tests__/StatisticsPages.spec.ts src/views/reservation/__tests__/List.spec.ts src/views/notification/__tests__/List.spec.ts`
Expected: PASS，所有顶部壳层断言都统一到 `.console-filter-panel`。

- [ ] **Step 2: 运行类型检查**

Run: `npm run type-check`
Expected: PASS，无 TS / Vue 模板类型错误。

- [ ] **Step 3: 运行生产构建**

Run: `npm run build`
Expected: PASS，Vite 构建成功，无新增构建警告阻断。

- [ ] **Step 4: 如有失败，按失败日志最小修正并重跑对应命令**

```text
先修触发失败的最小文件，再回到对应测试或构建命令验证，不跨文件无关重构。
```

- [ ] **Step 5: 整理最终变更说明，若用户明确要求再执行 git 提交**

```text
默认只交付代码与验证结果，不主动执行 git commit；如用户要求提交，再统一整理 staged files 和中文 commit message。
```
