# 全站主题切换（浅色 / 深色 / 跟随系统） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为整个前端应用建立 `light / dark / system` 三态主题能力，让顶部导航、布局壳层、公共组件、业务页面、Element Plus 控件与 ECharts 图表统一随主题切换，并支持持久化与跟随系统。

**Architecture:** 用 `themePreference + resolvedTheme` 双层状态收口主题真相源，`src/utils/themeMode.ts` 负责系统主题解析、DOM 挂载与监听，`index.html` 负责首屏预注入以避免闪色。样式层以 `src/assets/styles/variables.scss` 为语义 token 源头，Element Plus、布局、业务组件、页面和图表全部消费同一套 token；统计图表通过主题 palette 重建 option，而不是保留散落的硬编码颜色。

**Tech Stack:** Vue 3 `<script setup>`、TypeScript、Pinia、SCSS、Element Plus、ECharts、Vitest、Vue Test Utils

---

## 文件结构与职责

- `index.html`
  - 在应用脚本执行前预注入最终主题，避免首屏“先亮后暗”
- `src/utils/themeMode.ts`
  - 新增主题类型、系统主题解析、根节点 `data-theme` 同步与监听管理
- `src/stores/modules/app.ts`
  - 维护 `themePreference`、`resolvedTheme` 与主题切换动作，持久化用户偏好
- `src/stores/__tests__/app.spec.ts`
  - 锁定主题三态、会话重置行为与系统模式解析规则
- `src/main.ts`
  - 在 `bootstrapApp()` 中接入主题初始化，确保 Store 与 DOM 状态对齐
- `src/assets/styles/variables.scss`
  - 定义浅色 / 深色语义 token、tone 家族、图表色板 token
- `src/assets/styles/element-override.scss`
  - 覆盖当前仓库实际使用的 Element Plus 组件与程序化浮层主题变量
- `src/assets/styles/reset.scss`
  - 对齐根级背景与 `color-scheme` 语义
- `src/assets/styles/_auth-pages.scss`
  - 认证页共享表单与辅助动作主题变量
- `src/components/layout/AppHeader.vue`
  - 新增三态主题入口并消费主题状态
- `src/components/layout/AppSidebar.vue`
  - 改为消费语义 token，适配深色壳层与激活态
- `src/components/layout/AppBreadcrumb.vue`
  - 跟随语义 token 调整文字与分隔语义
- `src/components/layout/ConsoleFeedbackSurface.vue`
  - 收口反馈类玻璃面板背景
- `src/layouts/DefaultLayout.vue`
  - 收口默认布局背景与主工作区主题语义
- `src/layouts/AuthLayout.vue`
  - 改造认证页画布、品牌区与辅助面板主题语义
- `src/layouts/BlankLayout.vue`
  - 保证异常页与空白页背景在暗色下也成立
- `src/components/common/EmptyState.vue`
- `src/components/common/SearchBar.vue`
  - 收口常用空状态与搜索栏表面语义
- `src/components/form/DeviceForm.vue`
- `src/components/form/ReservationForm.vue`
- `src/components/form/ResetPasswordForm.vue`
  - 收口表单容器、错误态与输入区域主题语义
- `src/components/business/StatisticsCard.vue`
- `src/components/business/OverdueAlert.vue`
- `src/components/business/DeviceCard.vue`
- `src/components/business/ReservationCard.vue`
- `src/components/business/NotificationItem.vue`
- `src/components/business/PermissionTree.vue`
- `src/components/business/AiChatBox.vue`
- `src/components/business/AiMessage.vue`
  - 收口业务级卡片、告警、树、AI 消息等复用组件主题语义
- `src/views/auth/Login.vue`
- `src/views/auth/components/PasswordResetPanel.vue`
- `src/views/ai/Chat.vue`
- `src/views/ai/History.vue`
- `src/views/user/Profile.vue`
- `src/views/user/List.vue`
- `src/views/user/Detail.vue`
- `src/views/user/Freeze.vue`
- `src/views/user/RoleAssign.vue`
- `src/views/dashboard/index.vue`
- `src/views/dashboard/UserDashboard.vue`
- `src/views/dashboard/AdminDashboard.vue`
- `src/views/device/List.vue`
- `src/views/device/Detail.vue`
- `src/views/device/category/List.vue`
- `src/views/reservation/List.vue`
- `src/views/reservation/Detail.vue`
- `src/views/reservation/CheckIn.vue`
- `src/views/reservation/manage/Pending.vue`
- `src/views/reservation/manage/History.vue`
- `src/views/borrow/List.vue`
- `src/views/borrow/Confirm.vue`
- `src/views/borrow/Return.vue`
- `src/views/borrow/Detail.vue`
- `src/views/overdue/List.vue`
- `src/views/overdue/Detail.vue`
- `src/views/overdue/Handle.vue`
- `src/views/notification/List.vue`
- `src/views/admin/RolePermission.vue`
- `src/views/admin/PromptTemplate.vue`
  - 将用户可见页面中的浅色硬编码替换为语义 token
- `src/views/statistics/chartOptions.ts`
- `src/views/statistics/SharedChartPanel.vue`
- `src/views/statistics/Overview.vue`
- `src/views/statistics/DeviceUsage.vue`
- `src/views/statistics/BorrowStats.vue`
- `src/views/statistics/OverdueStats.vue`
- `src/views/statistics/HotTimeSlots.vue`
- `src/views/statistics/__tests__/chartOptions.spec.ts`
  - 统一图表 palette、面板背景与主题依赖测试
- `src/components/layout/__tests__/AppHeader.spec.ts`
  - 锁定顶部主题入口与主题切换行为

## 实施约束

- 主题状态必须支持 `light | dark | system`，不能退化成二元切换
- `themePreference` 必须持久化，`resolvedTheme` 由偏好与系统环境实时解析，不直接持久化到 Store persist
- `resetState()` 不能把用户主题偏好一并清空
- `index.html` 必须负责首屏预注入，不能只依赖 `main.ts`
- 所有页面与图表优先消费语义 token，不允许继续新增浅色专用硬编码
- Element Plus 清单以 `src/plugins/elementPlus.ts` 与 `src/**/*.vue` 中实际使用的 `el-*` 标签为校对基线

---

### Task 1: 全量扫描主题范围并冻结最终文件清单

**Files:**

- Verify: `src/views/**/*.vue`
- Verify: `src/components/**/*.vue`
- Verify: `src/assets/styles/**/*.scss`
- Verify: `src/plugins/elementPlus.ts`
- Verify: `docs/superpowers/specs/2026-03-27-theme-mode-design.md`

- [ ] **Step 1: 先按目录做一次硬编码颜色扫描**

Run:

```bash
python - <<'PY'
from pathlib import Path
import re

roots = ['src/views', 'src/components', 'src/layouts', 'src/assets/styles']
pattern = re.compile(r'#[0-9a-fA-F]{3,6}|rgba\(')

for root in roots:
    for path in sorted(Path(root).rglob('*')):
        if path.suffix not in {'.vue', '.scss', '.css', '.ts'}:
            continue
        text = path.read_text(encoding='utf-8')
        if pattern.search(text):
            print(path)
PY
```

Expected: 输出完整热点文件清单，而不是只看到文档里的示例路径。

- [ ] **Step 2: 按扫描结果补齐最终实施文件表**

要求：

- 把 `src/views/auth/Register.vue`
- `src/views/auth/ForgotPassword.vue`
- `src/views/auth/ResetPassword.vue`
- `src/views/reservation/Create.vue`
- `src/views/device/Create.vue`
- `src/views/device/Edit.vue`
- `src/views/device/category/Manage.vue`

等用户可见页面并入后续任务文件清单。

- [ ] **Step 3: 校对 Element Plus 实际使用组件基线**

Run:

```bash
python - <<'PY'
from pathlib import Path
import re

tag_pattern = re.compile(r'<\s*(el-[a-z-]+)')
used = set()

for path in Path('src').rglob('*.vue'):
    used.update(tag_pattern.findall(path.read_text(encoding='utf-8')))

for item in sorted(used):
    print(item)
PY
```

Expected: 输出当前仓库真实使用的 `el-*` 标签，用于校对 `element-override.scss` 覆盖范围。

- [ ] **Step 4: 冻结扫描结论（可选提交）**

```bash
git status --short
git commit --allow-empty -m "chore(theme): 冻结主题改造实施边界"
```

说明：该提交只在执行团队需要显式记录扫描结论时使用；若不希望生成空提交，可以跳过此步，但必须保留扫描结果作为实现清单依据，并先更新后续任务的最终文件列表。

#### 2026-03-28 扫描冻结结果

**硬编码颜色热点文件（按扫描结果冻结）**

- 布局与样式
  - `src/assets/styles/variables.scss`
  - `src/assets/styles/element-override.scss`
  - `src/assets/styles/__tests__/consoleTheme.spec.ts`
  - `src/components/layout/AppHeader.vue`
  - `src/components/layout/AppSidebar.vue`
- 公共与业务组件
  - `src/components/common/EmptyState.vue`
  - `src/components/common/SearchBar.vue`
  - `src/components/form/DeviceForm.vue`
  - `src/components/form/ReservationForm.vue`
  - `src/components/form/ResetPasswordForm.vue`
  - `src/components/business/AiChatBox.vue`
  - `src/components/business/AiMessage.vue`
  - `src/components/business/DeviceCard.vue`
  - `src/components/business/NotificationItem.vue`
  - `src/components/business/OverdueAlert.vue`
  - `src/components/business/PermissionTree.vue`
  - `src/components/business/ReservationCard.vue`
  - `src/components/business/StatisticsCard.vue`
- 认证与 AI 页面
  - `src/views/auth/Login.vue`
  - `src/views/auth/components/PasswordResetPanel.vue`
  - `src/views/ai/Chat.vue`
  - `src/views/ai/History.vue`
- 用户、仪表盘与设备域页面
  - `src/views/user/Profile.vue`
  - `src/views/user/List.vue`
  - `src/views/user/Detail.vue`
  - `src/views/user/Freeze.vue`
  - `src/views/user/RoleAssign.vue`
  - `src/views/dashboard/index.vue`
  - `src/views/dashboard/UserDashboard.vue`
  - `src/views/dashboard/AdminDashboard.vue`
  - `src/views/device/List.vue`
  - `src/views/device/category/List.vue`
- 预约、借还、逾期、通知与管理页
  - `src/views/reservation/List.vue`
  - `src/views/reservation/Detail.vue`
  - `src/views/reservation/CheckIn.vue`
  - `src/views/reservation/manage/Pending.vue`
  - `src/views/reservation/manage/History.vue`
  - `src/views/borrow/List.vue`
  - `src/views/borrow/Confirm.vue`
  - `src/views/borrow/Return.vue`
  - `src/views/borrow/Detail.vue`
  - `src/views/overdue/List.vue`
  - `src/views/overdue/Detail.vue`
  - `src/views/overdue/Handle.vue`
  - `src/views/notification/List.vue`
  - `src/views/admin/RolePermission.vue`
  - `src/views/admin/PromptTemplate.vue`
- 占位 / 错误页与统计域
  - `src/views/common/ViewPlaceholder.vue`
  - `src/views/error/403.vue`
  - `src/views/error/404.vue`
  - `src/views/error/500.vue`
  - `src/views/statistics/Overview.vue`
  - `src/views/statistics/DeviceUsage.vue`
  - `src/views/statistics/BorrowStats.vue`
  - `src/views/statistics/OverdueStats.vue`
  - `src/views/statistics/HotTimeSlots.vue`
  - `src/views/statistics/SharedChartPanel.vue`
  - `src/views/statistics/chartOptions.ts`

**虽未被正则命中，但必须纳入后续任务的用户可见页面**

- 认证域：`src/views/auth/Register.vue`、`src/views/auth/ForgotPassword.vue`、`src/views/auth/ResetPassword.vue`
- 设备域：`src/views/device/Create.vue`、`src/views/device/Edit.vue`、`src/views/device/category/Manage.vue`
- 预约域：`src/views/reservation/Create.vue`

**Element Plus 实际使用基线（模板标签 + 程序化浮层）**

- 模板标签：`el-alert`、`el-aside`、`el-avatar`、`el-badge`、`el-breadcrumb`、`el-breadcrumb-item`、`el-button`、`el-card`、`el-date-picker`、`el-descriptions`、`el-descriptions-item`、`el-dialog`、`el-dropdown`、`el-dropdown-item`、`el-dropdown-menu`、`el-empty`、`el-form`、`el-form-item`、`el-icon`、`el-image`、`el-input`、`el-input-number`、`el-menu`、`el-menu-item`、`el-option`、`el-pagination`、`el-radio-button`、`el-radio-group`、`el-scrollbar`、`el-select`、`el-table`、`el-table-column`、`el-tag`、`el-timeline`、`el-timeline-item`、`el-tooltip`、`el-tree`、`el-tree-select`、`el-upload`
- 程序化 / 指令基线：`ElMessage`、`ElMessageBox`、`ElLoadingDirective`

---

### Task 2: 建立主题状态、主题解析器与首屏预注入

**Files:**

- Create: `src/utils/themeMode.ts`
- Modify: `index.html`
- Modify: `src/stores/modules/app.ts`
- Modify: `src/stores/__tests__/app.spec.ts`
- Modify: `src/main.ts`
- Test: `src/__tests__/main.spec.ts`

- [ ] **Step 1: 先写失败中的主题状态与解析测试**

在 `src/stores/__tests__/app.spec.ts` 中补三态主题相关用例；如测试粒度不够，再新增 `src/utils/__tests__/themeMode.spec.ts`。至少覆盖：

```ts
it('stores theme preference and resolves system mode', () => {
  const store = useAppStore()

  expect(store.themePreference).toBe('system')
  expect(store.resolvedTheme).toBe('light')

  store.setThemePreference('dark')

  expect(store.themePreference).toBe('dark')
  expect(store.resolvedTheme).toBe('dark')
})

it('keeps theme preference when resetState clears transient ui state', () => {
  const store = useAppStore()

  store.setThemePreference('dark')
  store.setSidebarCollapsed(true)
  store.resetState()

  expect(store.themePreference).toBe('dark')
  expect(store.sidebarCollapsed).toBe(false)
})
```

- [ ] **Step 2: 运行测试确认先失败**

Run: `npm run test:unit -- src/stores/__tests__/app.spec.ts src/__tests__/main.spec.ts`

Expected: FAIL，缺少主题状态、启动接管或主题预注入相关逻辑。

- [ ] **Step 3: 实现 `src/utils/themeMode.ts` 与 `app` store 主题状态**

在 `src/utils/themeMode.ts` 中至少实现：

```ts
export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'theme_preference'

export function resolveThemePreference(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  return preference === 'system' ? (systemPrefersDark ? 'dark' : 'light') : preference
}

export function applyResolvedTheme(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}
```

在 `src/stores/modules/app.ts` 中新增主题字段、动作与中文注释；`persist.pick` 必须包含 `themePreference`。

- [ ] **Step 4: 在 `index.html` 与 `src/main.ts` 接入主题初始化**

`index.html` 内联脚本只做最小预注入：

```html
<script>
  ;(() => {
    const key = 'theme_preference'
    const stored = localStorage.getItem(key)
    const preference =
      stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const resolved = preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference
    document.documentElement.dataset.theme = resolved
    document.documentElement.style.colorScheme = resolved
  })()
</script>
```

`src/main.ts` 在 `bootstrapApp()` 里正式初始化 Store、注册系统监听，并同步最终主题到 DOM。

- [ ] **Step 5: 复跑主题状态测试**

Run: `npm run test:unit -- src/stores/__tests__/app.spec.ts`

Expected: PASS，三态主题、重置行为和初始化逻辑通过。

- [ ] **Step 6: Commit**

```bash
git add index.html src/utils/themeMode.ts src/stores/modules/app.ts src/stores/__tests__/app.spec.ts src/main.ts
git commit -m "feat(theme): 新增主题状态与启动预注入"
```

---

### Task 3: 建立全局语义 token 与 Element Plus 深色变量

**Files:**

- Modify: `src/assets/styles/variables.scss`
- Modify: `src/assets/styles/element-override.scss`
- Modify: `src/assets/styles/reset.scss`
- Modify: `src/assets/styles/_auth-pages.scss`
- Verify: `src/plugins/elementPlus.ts`
- Test: `src/plugins/__tests__/elementPlus.spec.ts`
- Test: `src/assets/styles/__tests__/consoleTheme.spec.ts`

- [ ] **Step 1: 先把语义 token 与 tone 家族结构写出来**

在 `src/assets/styles/variables.scss` 中把单主题变量扩为两套主题：

```scss
:root {
  --app-page-bg: #f4f7f8;
  --app-surface-solid: #ffffff;
  --app-text-primary: #112636;
  --app-tone-brand-solid: #2563eb;
  --app-tone-success-surface: rgba(15, 118, 110, 0.12);
}

[data-theme='dark'] {
  --app-page-bg: #0f1722;
  --app-surface-solid: #16202d;
  --app-text-primary: #e7eef7;
  --app-tone-brand-solid: #60a5fa;
  --app-tone-success-surface: rgba(45, 212, 191, 0.18);
}
```

- [ ] **Step 2: 让 Element Plus 覆盖层消费 token**

在 `src/assets/styles/element-override.scss` 里补当前仓库真实使用控件：

- `el-aside`
- `el-avatar`
- `el-badge`
- `el-button`
- `el-alert`
- `el-card`
- `el-descriptions` / `el-descriptions-item`
- `el-empty`
- `el-form` / `el-form-item`
- `el-image`
- `el-icon`
- `el-input`
- `el-input-number`
- `el-select` / `el-option`
- `el-radio-group` / `el-radio-button`
- `el-table` / `el-table-column`
- `el-dialog`
- `el-dropdown`
- `el-dropdown-menu` / `el-dropdown-item`
- `el-breadcrumb` / `el-breadcrumb-item`
- `el-menu` / `el-menu-item`
- `el-tooltip`
- `el-scrollbar`
- `el-tree` / `el-tree-select`
- `el-timeline` / `el-timeline-item`
- `el-date-picker`
- `el-pagination`
- `el-tag`
- `el-upload`
- `ElMessage` / `ElMessageBox` / `ElLoadingDirective` 对应浮层 token

- [ ] **Step 3: 修正 reset 与认证页共享样式**

在 `src/assets/styles/reset.scss` 和 `src/assets/styles/_auth-pages.scss` 中去掉浅色专用背景与文字色，确保深色下输入、辅助链接、错误提示仍可读。

- [ ] **Step 4: 运行样式与组件库相关回归**

Run: `npm run test:unit -- src/plugins/__tests__/elementPlus.spec.ts src/assets/styles/__tests__/consoleTheme.spec.ts`

Expected: PASS，说明组件注册与主题 token 基线没有被破坏。

- [ ] **Step 5: 运行类型检查做样式层回归**

Run: `npm run type-check`

Expected: PASS，样式文件改造不影响 TypeScript / Vue 构建。

- [ ] **Step 6: Commit**

```bash
git add src/assets/styles/variables.scss src/assets/styles/element-override.scss src/assets/styles/reset.scss src/assets/styles/_auth-pages.scss
git commit -m "feat(theme): 建立全局主题 token 与组件库变量"
```

---

### Task 4: 在顶部新增三态主题入口并适配布局壳层

**Files:**

- Modify: `src/components/layout/AppHeader.vue`
- Modify: `src/components/layout/AppSidebar.vue`
- Modify: `src/components/layout/AppBreadcrumb.vue`
- Modify: `src/components/layout/ConsoleFeedbackSurface.vue`
- Modify: `src/layouts/DefaultLayout.vue`
- Modify: `src/layouts/AuthLayout.vue`
- Modify: `src/layouts/BlankLayout.vue`
- Modify: `src/components/layout/__tests__/AppHeader.spec.ts`
- Modify: `src/components/layout/__tests__/navigation.spec.ts`
- Modify: `src/components/layout/__tests__/AppSidebar.spec.ts`
- Modify: `src/components/layout/__tests__/AppBreadcrumb.spec.ts`
- Modify: `src/components/layout/__tests__/ConsoleShells.spec.ts`

- [ ] **Step 1: 先写顶部主题入口失败测试**

在 `src/components/layout/__tests__/AppHeader.spec.ts` 中增加：

```ts
it('renders a theme entry with light dark and system options', async () => {
  const wrapper = mountHeader()

  expect(wrapper.find('[data-testid="theme-entry"]').exists()).toBe(true)
  expect(wrapper.text()).toContain('跟随系统')
})
```

- [ ] **Step 2: 运行头部测试确认先失败**

Run: `npm run test:unit -- src/components/layout/__tests__/AppHeader.spec.ts`

Expected: FAIL，当前头部没有主题入口。

- [ ] **Step 3: 在 `AppHeader.vue` 中接入主题入口**

入口可使用 dropdown / segmented 等现有 Element Plus 组合，但必须满足：

- 展示当前主题态图标
- 支持 `浅色 / 深色 / 跟随系统`
- 点击后调用 `appStore.setThemePreference(...)`
- 工具区布局不挤压通知与用户菜单

- [ ] **Step 4: 把布局壳层统一改成 token 消费**

调整：

- `AppSidebar.vue`
- `AppBreadcrumb.vue`
- `ConsoleFeedbackSurface.vue`
- `DefaultLayout.vue`
- `AuthLayout.vue`
- `BlankLayout.vue`

重点清除：浅色玻璃、浅色渐变、浅色按钮背景、浅色阴影边框硬编码。

- [ ] **Step 5: 复跑布局壳层相关测试**

Run: `npm run test:unit -- src/components/layout/__tests__/AppHeader.spec.ts src/components/layout/__tests__/navigation.spec.ts src/components/layout/__tests__/AppSidebar.spec.ts src/components/layout/__tests__/AppBreadcrumb.spec.ts src/components/layout/__tests__/ConsoleShells.spec.ts`

Expected: PASS，主题入口、侧栏、面包屑与壳层结构同时成立。

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/AppHeader.vue src/components/layout/AppSidebar.vue src/components/layout/AppBreadcrumb.vue src/components/layout/ConsoleFeedbackSurface.vue src/layouts/DefaultLayout.vue src/layouts/AuthLayout.vue src/layouts/BlankLayout.vue src/components/layout/__tests__/AppHeader.spec.ts src/components/layout/__tests__/navigation.spec.ts src/components/layout/__tests__/AppSidebar.spec.ts src/components/layout/__tests__/AppBreadcrumb.spec.ts src/components/layout/__tests__/ConsoleShells.spec.ts
git commit -m "feat(theme): 为头部与布局壳层接入三态主题"
```

---

### Task 5: 收口公共组件主题语义

**Files:**

- Modify: `src/components/common/EmptyState.vue`
- Modify: `src/components/common/SearchBar.vue`
- Test: `src/components/common/__tests__/CommonComponents.spec.ts`

- [ ] **Step 1: 先替换公共组件的浅色表面与边框**

重点处理空状态与搜索栏的浅色底、边框、辅助文字与 hover 语义。

- [ ] **Step 2: 运行公共组件测试回归**

Run: `npm run test:unit -- src/components/common/__tests__/CommonComponents.spec.ts`

Expected: PASS，公共组件基础结构与交互保持稳定。

- [ ] **Step 3: Commit**

```bash
git add src/components/common/EmptyState.vue src/components/common/SearchBar.vue
git commit -m "refactor(theme): 统一公共组件主题语义"
```

---

### Task 6: 收口表单组件主题语义

**Files:**

- Modify: `src/components/form/DeviceForm.vue`
- Modify: `src/components/form/ReservationForm.vue`
- Modify: `src/components/form/ResetPasswordForm.vue`
- Modify: `src/components/form/CategoryForm.vue`
- Test: `src/components/form/__tests__/DeviceForm.spec.ts`
- Test: `src/components/form/__tests__/ReservationForm.spec.ts`
- Test: `src/components/form/__tests__/ResetPasswordForm.spec.ts`
- Test: `src/components/form/__tests__/CategoryForm.spec.ts`

- [ ] **Step 1: 替换表单容器、输入区域与错误提示颜色**

让设备表单、预约表单、重置密码表单和分类表单都消费统一 token，不再保留浅色输入底与错误色硬编码。

- [ ] **Step 2: 运行表单测试回归**

Run: `npm run test:unit -- src/components/form/__tests__/DeviceForm.spec.ts src/components/form/__tests__/ReservationForm.spec.ts src/components/form/__tests__/ResetPasswordForm.spec.ts src/components/form/__tests__/CategoryForm.spec.ts`

Expected: PASS，表单字段、校验与提交交互保持正确。

- [ ] **Step 3: Commit**

```bash
git add src/components/form/DeviceForm.vue src/components/form/ReservationForm.vue src/components/form/ResetPasswordForm.vue src/components/form/CategoryForm.vue
git commit -m "refactor(theme): 统一表单组件主题语义"
```

---

### Task 7: 收口业务组件主题语义

**Files:**

- Modify: `src/components/business/StatisticsCard.vue`
- Modify: `src/components/business/OverdueAlert.vue`
- Modify: `src/components/business/DeviceCard.vue`
- Modify: `src/components/business/ReservationCard.vue`
- Modify: `src/components/business/NotificationItem.vue`
- Modify: `src/components/business/PermissionTree.vue`
- Modify: `src/components/business/AiChatBox.vue`
- Modify: `src/components/business/AiMessage.vue`
- Modify: `src/components/business/ReservationTimeline.vue`
- Test: `src/components/business/__tests__/StatisticsCard.spec.ts`
- Test: `src/components/business/__tests__/OverdueAlert.spec.ts`
- Test: `src/components/business/__tests__/DeviceCard.spec.ts`
- Test: `src/components/business/__tests__/ReservationCard.spec.ts`
- Test: `src/components/business/__tests__/NotificationItem.spec.ts`
- Test: `src/components/business/__tests__/PermissionTree.spec.ts`
- Test: `src/components/business/__tests__/AiChatBox.spec.ts`
- Test: `src/components/business/__tests__/ReservationTimeline.spec.ts`

- [ ] **Step 1: 先按 tone 家族建立业务组件映射**

把统计卡片、告警卡片、设备卡片、预约卡片、通知项、权限树、AI 消息与时间线统一映射到 `brand/info/success/warning/danger`。

- [ ] **Step 2: 逐个替换业务组件硬编码颜色**

重点替换卡片背景、强调态、状态 badge、时间线节点与 AI 气泡的浅色专用样式。

- [ ] **Step 3: 运行业务组件测试回归**

Run: `npm run test:unit -- src/components/business/__tests__/StatisticsCard.spec.ts src/components/business/__tests__/OverdueAlert.spec.ts src/components/business/__tests__/DeviceCard.spec.ts src/components/business/__tests__/ReservationCard.spec.ts src/components/business/__tests__/NotificationItem.spec.ts src/components/business/__tests__/PermissionTree.spec.ts src/components/business/__tests__/AiChatBox.spec.ts src/components/business/__tests__/ReservationTimeline.spec.ts`

Expected: PASS，业务组件渲染与交互结构保持正确。

- [ ] **Step 4: Commit**

```bash
git add src/components/business/StatisticsCard.vue src/components/business/OverdueAlert.vue src/components/business/DeviceCard.vue src/components/business/ReservationCard.vue src/components/business/NotificationItem.vue src/components/business/PermissionTree.vue src/components/business/AiChatBox.vue src/components/business/AiMessage.vue src/components/business/ReservationTimeline.vue
git commit -m "refactor(theme): 统一业务组件主题语义"
```

---

### Task 8: 覆盖认证页主题语义

**Files:**

- Modify: `src/views/auth/Login.vue`
- Modify: `src/views/auth/Register.vue`
- Modify: `src/views/auth/ForgotPassword.vue`
- Modify: `src/views/auth/ResetPassword.vue`
- Modify: `src/views/auth/components/PasswordResetPanel.vue`
- Test: `src/views/auth/__tests__/auth-pages.spec.ts`

- [ ] **Step 1: 替换认证页与重置面板硬编码颜色**

让登录、注册、忘记密码、重置密码与密码重置面板全部走主题 token，保证深色下认证页不是“浅色孤岛”。

- [ ] **Step 2: 运行认证页测试回归**

Run: `npm run test:unit -- src/views/auth/__tests__/auth-pages.spec.ts`

Expected: PASS，认证页主流程与提示文案仍成立。

- [ ] **Step 3: Commit**

```bash
git add src/views/auth/Login.vue src/views/auth/Register.vue src/views/auth/ForgotPassword.vue src/views/auth/ResetPassword.vue src/views/auth/components/PasswordResetPanel.vue
git commit -m "refactor(theme): 统一认证页面主题语义"
```

---

### Task 9: 覆盖 AI 页面主题语义

**Files:**

- Modify: `src/views/ai/Chat.vue`
- Modify: `src/views/ai/History.vue`
- Test: `src/views/ai/__tests__/Chat.spec.ts`
- Test: `src/views/ai/__tests__/History.spec.ts`

- [ ] **Step 1: 替换 AI 页面与消息区的主题硬编码**

重点处理会话卡片、消息面板、输入区、状态提示与时间轴背景，确保暗色下消息层级仍可读。

- [ ] **Step 2: 运行 AI 页面测试回归**

Run: `npm run test:unit -- src/views/ai/__tests__/Chat.spec.ts src/views/ai/__tests__/History.spec.ts`

Expected: PASS，聊天和历史页结构、消息区与交互未受破坏。

- [ ] **Step 3: Commit**

```bash
git add src/views/ai/Chat.vue src/views/ai/History.vue
git commit -m "refactor(theme): 统一 AI 页面主题语义"
```

---

### Task 10: 覆盖用户域页面主题语义

**Files:**

- Modify: `src/views/user/Profile.vue`
- Modify: `src/views/user/List.vue`
- Modify: `src/views/user/Detail.vue`
- Modify: `src/views/user/Freeze.vue`
- Modify: `src/views/user/RoleAssign.vue`
- Test: `src/views/user/__tests__/Profile.spec.ts`
- Test: `src/views/user/__tests__/List.spec.ts`
- Test: `src/views/user/__tests__/Detail.spec.ts`
- Test: `src/views/user/__tests__/Freeze.spec.ts`
- Test: `src/views/user/__tests__/RoleAssign.spec.ts`

- [ ] **Step 1: 替换用户域卡片、详情、冻结与授权面板颜色**

把用户域页面中的 hero、信息卡、表单面板、冻结提示与权限树都切到主题 token。

- [ ] **Step 2: 运行用户域测试回归**

Run: `npm run test:unit -- src/views/user/__tests__/Profile.spec.ts src/views/user/__tests__/List.spec.ts src/views/user/__tests__/Detail.spec.ts src/views/user/__tests__/Freeze.spec.ts src/views/user/__tests__/RoleAssign.spec.ts`

Expected: PASS，用户域页面结构与表单交互保持稳定。

- [ ] **Step 3: Commit**

```bash
git add src/views/user/Profile.vue src/views/user/List.vue src/views/user/Detail.vue src/views/user/Freeze.vue src/views/user/RoleAssign.vue
git commit -m "refactor(theme): 统一用户域页面主题语义"
```

---

### Task 11: 覆盖仪表盘页面主题语义

**Files:**

- Modify: `src/views/dashboard/index.vue`
- Modify: `src/views/dashboard/UserDashboard.vue`
- Modify: `src/views/dashboard/AdminDashboard.vue`
- Test: `src/views/dashboard/__tests__/index.spec.ts`
- Test: `src/views/dashboard/__tests__/UserDashboard.spec.ts`
- Test: `src/views/dashboard/__tests__/AdminDashboard.spec.ts`

- [ ] **Step 1: 调整仪表盘 hero、统计卡片与概览面板主题色**

重点替换 hero 渐变、统计卡片强调色、信息面板背景与次级文字色。

- [ ] **Step 2: 运行仪表盘测试回归**

Run: `npm run test:unit -- src/views/dashboard/__tests__/index.spec.ts src/views/dashboard/__tests__/UserDashboard.spec.ts src/views/dashboard/__tests__/AdminDashboard.spec.ts`

Expected: PASS，仪表盘布局、指标卡与角色分支渲染正确。

- [ ] **Step 3: Commit**

```bash
git add src/views/dashboard/index.vue src/views/dashboard/UserDashboard.vue src/views/dashboard/AdminDashboard.vue
git commit -m "refactor(theme): 统一仪表盘页面主题语义"
```

---

### Task 12: 覆盖设备域页面主题语义

**Files:**

- Modify: `src/views/device/List.vue`
- Modify: `src/views/device/Create.vue`
- Modify: `src/views/device/Edit.vue`
- Modify: `src/views/device/Detail.vue`
- Modify: `src/views/device/category/List.vue`
- Modify: `src/views/device/category/Manage.vue`
- Test: `src/views/device/__tests__/List.spec.ts`
- Test: `src/views/device/__tests__/FormPages.spec.ts`
- Test: `src/views/device/__tests__/Detail.spec.ts`
- Test: `src/views/device/category/__tests__/List.spec.ts`
- Test: `src/views/device/category/__tests__/Manage.spec.ts`

- [ ] **Step 1: 替换设备列表、表单、详情与分类管理颜色**

覆盖列表 hero、表单面板、详情描述、分类树和分类管理弹窗背景。

- [ ] **Step 2: 运行设备域测试回归**

Run: `npm run test:unit -- src/views/device/__tests__/List.spec.ts src/views/device/__tests__/FormPages.spec.ts src/views/device/__tests__/Detail.spec.ts src/views/device/category/__tests__/List.spec.ts src/views/device/category/__tests__/Manage.spec.ts`

Expected: PASS，设备域列表、表单与分类管理行为未受影响。

- [ ] **Step 3: Commit**

```bash
git add src/views/device/List.vue src/views/device/Create.vue src/views/device/Edit.vue src/views/device/Detail.vue src/views/device/category/List.vue src/views/device/category/Manage.vue
git commit -m "refactor(theme): 统一设备域页面主题语义"
```

---

### Task 13: 覆盖预约域页面主题语义

**Files:**

- Modify: `src/views/reservation/List.vue`
- Modify: `src/views/reservation/Create.vue`
- Modify: `src/views/reservation/Detail.vue`
- Modify: `src/views/reservation/CheckIn.vue`
- Modify: `src/views/reservation/manage/Pending.vue`
- Modify: `src/views/reservation/manage/History.vue`
- Test: `src/views/reservation/__tests__/List.spec.ts`
- Test: `src/views/reservation/__tests__/Create.spec.ts`
- Test: `src/views/reservation/__tests__/Detail.spec.ts`
- Test: `src/views/reservation/__tests__/CheckIn.spec.ts`
- Test: `src/views/reservation/manage/__tests__/Pending.spec.ts`
- Test: `src/views/reservation/manage/__tests__/History.spec.ts`

- [ ] **Step 1: 替换预约页列表、创建、详情、签到与审核面板颜色**

重点处理表格壳层、状态提示、审核卡片和签到页信息面板。

- [ ] **Step 2: 运行预约域测试回归**

Run: `npm run test:unit -- src/views/reservation/__tests__/List.spec.ts src/views/reservation/__tests__/Create.spec.ts src/views/reservation/__tests__/Detail.spec.ts src/views/reservation/__tests__/CheckIn.spec.ts src/views/reservation/manage/__tests__/Pending.spec.ts src/views/reservation/manage/__tests__/History.spec.ts`

Expected: PASS，预约域页面流程与审核交互保持稳定。

- [ ] **Step 3: Commit**

```bash
git add src/views/reservation/List.vue src/views/reservation/Create.vue src/views/reservation/Detail.vue src/views/reservation/CheckIn.vue src/views/reservation/manage/Pending.vue src/views/reservation/manage/History.vue
git commit -m "refactor(theme): 统一预约域页面主题语义"
```

---

### Task 14: 覆盖借还域页面主题语义

**Files:**

- Modify: `src/views/borrow/List.vue`
- Modify: `src/views/borrow/Confirm.vue`
- Modify: `src/views/borrow/Return.vue`
- Modify: `src/views/borrow/Detail.vue`
- Test: `src/views/borrow/__tests__/BorrowPages.spec.ts`

- [ ] **Step 1: 替换借还列表、确认、归还与详情页面颜色**

覆盖列表、表单壳层、状态强调色与详情说明面板。

- [ ] **Step 2: 运行借还域测试回归**

Run: `npm run test:unit -- src/views/borrow/__tests__/BorrowPages.spec.ts`

Expected: PASS，借还域流程与交互仍正确。

- [ ] **Step 3: Commit**

```bash
git add src/views/borrow/List.vue src/views/borrow/Confirm.vue src/views/borrow/Return.vue src/views/borrow/Detail.vue
git commit -m "refactor(theme): 统一借还域页面主题语义"
```

---

### Task 15: 覆盖逾期域页面主题语义

**Files:**

- Modify: `src/views/overdue/List.vue`
- Modify: `src/views/overdue/Detail.vue`
- Modify: `src/views/overdue/Handle.vue`
- Test: `src/views/overdue/__tests__/OverduePages.spec.ts`

- [ ] **Step 1: 替换逾期列表、详情与处理页面颜色**

重点收口告警红色、详情面板、处理表单与表格壳层。

- [ ] **Step 2: 运行逾期域测试回归**

Run: `npm run test:unit -- src/views/overdue/__tests__/OverduePages.spec.ts`

Expected: PASS，逾期域列表、详情与处理流程仍成立。

- [ ] **Step 3: Commit**

```bash
git add src/views/overdue/List.vue src/views/overdue/Detail.vue src/views/overdue/Handle.vue
git commit -m "refactor(theme): 统一逾期域页面主题语义"
```

---

### Task 16: 覆盖通知页主题语义

**Files:**

- Modify: `src/views/notification/List.vue`
- Test: `src/views/notification/__tests__/List.spec.ts`

- [ ] **Step 1: 替换通知页颜色**

确保通知列表页在暗色下不保留浅色底与浅色文案。

- [ ] **Step 2: 运行通知页测试回归**

Run: `npm run test:unit -- src/views/notification/__tests__/List.spec.ts`

Expected: PASS，通知页结构与交互保持正确。

- [ ] **Step 3: Commit**

```bash
git add src/views/notification/List.vue
git commit -m "refactor(theme): 统一通知页主题语义"
```

---

### Task 17: 覆盖通用占位页与错误页主题语义

**Files:**

- Modify: `src/views/common/ViewPlaceholder.vue`
- Modify: `src/views/error/403.vue`
- Modify: `src/views/error/404.vue`
- Modify: `src/views/error/500.vue`
- Test: `src/views/common/__tests__/ViewPlaceholder.spec.ts`
- Test: `src/views/error/__tests__/ErrorPages.spec.ts`
- Test: `src/views/error/__tests__/500.spec.ts`

- [ ] **Step 1: 替换通用占位页与错误页颜色**

确保占位页、403/404/500 在暗色下不保留浅色底和浅色文案。

- [ ] **Step 2: 运行通用页与错误页测试回归**

Run: `npm run test:unit -- src/views/common/__tests__/ViewPlaceholder.spec.ts src/views/error/__tests__/ErrorPages.spec.ts src/views/error/__tests__/500.spec.ts`

Expected: PASS，兜底页面结构与交互保持正确。

- [ ] **Step 3: Commit**

```bash
git add src/views/common/ViewPlaceholder.vue src/views/error/403.vue src/views/error/404.vue src/views/error/500.vue
git commit -m "refactor(theme): 统一占位与错误页面主题语义"
```

---

### Task 18: 覆盖管理页主题语义

**Files:**

- Modify: `src/views/admin/RolePermission.vue`
- Modify: `src/views/admin/PromptTemplate.vue`
- Test: `src/views/admin/__tests__/RolePermission.spec.ts`
- Test: `src/views/admin/__tests__/PromptTemplate.spec.ts`

- [ ] **Step 1: 替换角色权限与 Prompt 模板页颜色**

重点处理管理页 hero、编辑面板、状态卡片、模板预览和树结构背景。

- [ ] **Step 2: 运行管理页测试回归**

Run: `npm run test:unit -- src/views/admin/__tests__/RolePermission.spec.ts src/views/admin/__tests__/PromptTemplate.spec.ts`

Expected: PASS，管理页结构与交互保持稳定。

- [ ] **Step 3: Commit**

```bash
git add src/views/admin/RolePermission.vue src/views/admin/PromptTemplate.vue
git commit -m "refactor(theme): 统一管理页面主题语义"
```

---

### Task 19: 让统计图表与面板随主题切换

**Files:**

- Modify: `src/views/statistics/chartOptions.ts`
- Modify: `src/views/statistics/SharedChartPanel.vue`
- Modify: `src/views/statistics/Overview.vue`
- Modify: `src/views/statistics/DeviceUsage.vue`
- Modify: `src/views/statistics/BorrowStats.vue`
- Modify: `src/views/statistics/OverdueStats.vue`
- Modify: `src/views/statistics/HotTimeSlots.vue`
- Modify: `src/views/statistics/__tests__/chartOptions.spec.ts`
- Modify: `src/views/statistics/__tests__/StatisticsPages.spec.ts`

- [ ] **Step 1: 先写图表主题 palette 失败测试**

在 `src/views/statistics/__tests__/chartOptions.spec.ts` 中至少补：

```ts
it('returns different palette colors for light and dark themes', () => {
  const light = getChartThemeTokens('light')
  const dark = getChartThemeTokens('dark')

  expect(light.axisLabelColor).not.toBe(dark.axisLabelColor)
})
```

- [ ] **Step 2: 运行图表测试确认先失败**

Run: `npm run test:unit -- src/views/statistics/__tests__/chartOptions.spec.ts src/views/statistics/__tests__/StatisticsPages.spec.ts`

Expected: FAIL，缺少主题 palette 或 option 仍写死颜色。

- [ ] **Step 3: 在 `chartOptions.ts` 抽主题 palette**

示例：

```ts
export function getChartThemeTokens(theme: 'light' | 'dark') {
  return theme === 'dark'
    ? { axisLabelColor: '#cbd5e1', gridColor: 'rgba(148, 163, 184, 0.2)' }
    : { axisLabelColor: '#526277', gridColor: 'rgba(17, 38, 54, 0.08)' }
}
```

所有 `create*Option` 都接收 `theme` 或消费同一 palette，不能保留写死颜色。

- [ ] **Step 4: 在统计页面与 `SharedChartPanel.vue` 中接入 `resolvedTheme`**

页面层 `computed` 生成图表 option 时显式依赖 `appStore.resolvedTheme`，保证切换主题后图表即时重算。

- [ ] **Step 5: 复跑图表与统计页测试**

Run: `npm run test:unit -- src/views/statistics/__tests__/chartOptions.spec.ts src/views/statistics/__tests__/StatisticsPages.spec.ts`

Expected: PASS，浅色 / 深色 palette、页面级 option 重算与统计页容器行为都正确。

- [ ] **Step 6: Commit**

```bash
git add src/views/statistics/chartOptions.ts src/views/statistics/SharedChartPanel.vue src/views/statistics/Overview.vue src/views/statistics/DeviceUsage.vue src/views/statistics/BorrowStats.vue src/views/statistics/OverdueStats.vue src/views/statistics/HotTimeSlots.vue src/views/statistics/__tests__/chartOptions.spec.ts src/views/statistics/__tests__/StatisticsPages.spec.ts
git commit -m "feat(theme): 适配统计图表与面板主题"
```

---

### Task 20: 全量验证与浏览器回归

**Files:**

- Verify: `index.html`
- Verify: `src/utils/themeMode.ts`
- Verify: `src/stores/modules/app.ts`
- Verify: `src/__tests__/main.spec.ts`
- Verify: `src/assets/styles/**/*.scss`
- Verify: `src/components/**/*.vue`
- Verify: `src/layouts/**/*.vue`
- Verify: `src/views/**/*.vue`
- Verify: `src/stores/__tests__/app.spec.ts`
- Verify: `src/assets/styles/__tests__/consoleTheme.spec.ts`
- Verify: `src/plugins/__tests__/elementPlus.spec.ts`
- Verify: `src/components/layout/__tests__/*.spec.ts`
- Verify: `src/components/layout/__tests__/navigation.spec.ts`
- Verify: `src/components/common/__tests__/*.spec.ts`
- Verify: `src/components/form/__tests__/*.spec.ts`
- Verify: `src/components/business/__tests__/*.spec.ts`
- Verify: `src/views/auth/__tests__/*.spec.ts`
- Verify: `src/views/ai/__tests__/*.spec.ts`
- Verify: `src/views/user/__tests__/*.spec.ts`
- Verify: `src/views/dashboard/__tests__/*.spec.ts`
- Verify: `src/views/device/__tests__/*.spec.ts`
- Verify: `src/views/device/category/__tests__/*.spec.ts`
- Verify: `src/views/reservation/__tests__/*.spec.ts`
- Verify: `src/views/reservation/manage/__tests__/*.spec.ts`
- Verify: `src/views/borrow/__tests__/*.spec.ts`
- Verify: `src/views/overdue/__tests__/*.spec.ts`
- Verify: `src/views/notification/__tests__/*.spec.ts`
- Verify: `src/views/common/__tests__/*.spec.ts`
- Verify: `src/views/error/__tests__/*.spec.ts`
- Verify: `src/views/admin/__tests__/*.spec.ts`
- Verify: `src/views/statistics/__tests__/*.spec.ts`

- [ ] **Step 1: 运行主题相关全量单测**

Run: `npm run test:unit -- src/__tests__/main.spec.ts src/stores/__tests__/app.spec.ts src/assets/styles/__tests__/consoleTheme.spec.ts src/plugins/__tests__/elementPlus.spec.ts src/components/layout/__tests__/*.spec.ts src/components/common/__tests__/*.spec.ts src/components/form/__tests__/*.spec.ts src/components/business/__tests__/*.spec.ts src/views/auth/__tests__/*.spec.ts src/views/ai/__tests__/*.spec.ts src/views/user/__tests__/*.spec.ts src/views/dashboard/__tests__/*.spec.ts src/views/device/__tests__/*.spec.ts src/views/device/category/__tests__/*.spec.ts src/views/reservation/__tests__/*.spec.ts src/views/reservation/manage/__tests__/*.spec.ts src/views/borrow/__tests__/*.spec.ts src/views/overdue/__tests__/*.spec.ts src/views/notification/__tests__/*.spec.ts src/views/common/__tests__/*.spec.ts src/views/error/__tests__/*.spec.ts src/views/admin/__tests__/*.spec.ts src/views/statistics/__tests__/*.spec.ts`

Expected: PASS，主题状态、token 基线、组件库、布局入口、各业务域页面与图表回归全部通过。

- [ ] **Step 2: 运行类型检查**

Run: `npm run type-check`

Expected: PASS，无新的 TS / Vue 类型错误。

- [ ] **Step 3: 运行生产构建**

Run: `npm run build`

Expected: PASS，说明主题改造没有破坏生产构建。

- [ ] **Step 4: 运行格式化**

Run: `npx prettier --write index.html src/utils/themeMode.ts src/stores/modules/app.ts src/stores/__tests__/app.spec.ts src/main.ts src/assets/styles/variables.scss src/assets/styles/element-override.scss src/assets/styles/reset.scss src/assets/styles/_auth-pages.scss src/components/layout/*.vue src/layouts/*.vue src/components/common/*.vue src/components/form/*.vue src/components/business/*.vue src/views/auth/*.vue src/views/auth/components/*.vue src/views/ai/*.vue src/views/user/*.vue src/views/dashboard/*.vue src/views/device/*.vue src/views/device/category/*.vue src/views/reservation/*.vue src/views/reservation/manage/*.vue src/views/borrow/*.vue src/views/overdue/*.vue src/views/notification/*.vue src/views/common/*.vue src/views/error/*.vue src/views/admin/*.vue src/views/statistics/*.vue src/views/statistics/__tests__/*.spec.ts src/components/layout/__tests__/*.spec.ts`

Expected: 主题相关文件全部格式化完成。

- [ ] **Step 5: 再跑一次主题相关全量单测做格式化后回归**

Run: `npm run test:unit -- src/__tests__/main.spec.ts src/stores/__tests__/app.spec.ts src/assets/styles/__tests__/consoleTheme.spec.ts src/plugins/__tests__/elementPlus.spec.ts src/components/layout/__tests__/*.spec.ts src/views/statistics/__tests__/*.spec.ts src/views/auth/__tests__/*.spec.ts src/views/ai/__tests__/*.spec.ts`

Expected: PASS，确认格式化未破坏主题入口、状态模型、图表与关键页面结构。

- [ ] **Step 6: 浏览器级回归浅色 / 深色 / 跟随系统三态**

Run: `npm run dev`

Expected: 至少人工检查以下场景：

- 顶部主题入口可在 `浅色 / 深色 / 跟随系统` 三态间切换
- `system` 模式下切换操作系统主题时，页面与图表同步变化
- 认证页、AI、用户域、仪表盘、设备、预约、借还、逾期、通知、管理页、占位页与错误页都不存在明显残留浅色硬编码
- 表格、卡片、对话框、dropdown、message、message box、loading 遮罩在暗色下可读
- 统计图表的 tooltip、legend、坐标轴和 visualMap 与深色面板一致

- [ ] **Step 7: Commit**

```bash
git add index.html src/utils/themeMode.ts src/stores/modules/app.ts src/stores/__tests__/app.spec.ts src/main.ts src/assets/styles/variables.scss src/assets/styles/element-override.scss src/assets/styles/reset.scss src/assets/styles/_auth-pages.scss src/components/layout/*.vue src/layouts/*.vue src/components/common/*.vue src/components/form/*.vue src/components/business/*.vue src/views/auth/*.vue src/views/auth/components/*.vue src/views/ai/*.vue src/views/user/*.vue src/views/dashboard/*.vue src/views/device/*.vue src/views/device/category/*.vue src/views/reservation/*.vue src/views/reservation/manage/*.vue src/views/borrow/*.vue src/views/overdue/*.vue src/views/notification/*.vue src/views/common/*.vue src/views/error/*.vue src/views/admin/*.vue src/views/statistics/*.vue src/views/statistics/__tests__/*.spec.ts src/components/layout/__tests__/*.spec.ts
git commit -m "feat(theme): 支持全站三态主题切换"
```

---

## 完成定义

- 顶部入口支持 `浅色 / 深色 / 跟随系统` 三态
- `themePreference` 可持久化，`resolvedTheme` 可正确解析与响应系统变化
- 首屏通过 `index.html` 预注入避免闪色
- 共享组件、业务页面、认证页、布局壳层和图表统一随主题切换
- Element Plus 当前仓库在用控件与程序化浮层都能在暗色下正确显示
- 主题相关单测、类型检查、生产构建和浏览器回归通过
