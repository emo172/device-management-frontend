# 全站主题切换（浅色 / 深色 / 跟随系统）V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在当前分支已具备主题基础设施的前提下，增量补齐全局 token、组件库覆盖、页面硬编码清理、图表主题一致性与最终回归，交付可稳定上线的三态主题能力。

**Architecture:** 复用当前已存在的 `index.html` 首屏预注入、`src/utils/themeMode.ts` 主题解析器、`src/stores/modules/app.ts` 主题状态、`src/main.ts` 启动接管、`AppHeader.vue` 顶部入口与 `chartOptions.ts` 图表主题工厂，不再重复实现第二套主题真相源。执行顺序调整为“冻结基线与缺口 -> 收口全局 token/组件库 -> 布局与复用组件补漏 -> 分业务域清理页面 -> 图表与最终回归”，每个阶段都只做增量修补，并同步补齐中文注释与验证证据。

**Tech Stack:** Vue 3 `<script setup>`、TypeScript、Pinia、SCSS、Element Plus、ECharts、Vitest、Vue Test Utils、Vite

---

## 执行前提与实施约束

- 本计划以 `docs/superpowers/specs/2026-03-27-theme-mode-design.md` 中“本次需求已明确扩大范围”为前提，只用于当前主题需求分支，不把“允许主题切换”扩展为通用项目基线。
- `docs/superpowers/specs/2026-03-27-theme-mode-design.md` 中“当前基线与问题点”描述的是设计当日快照，不等同于当前工作树现状；实际实施一律以 Task 1 烟雾测试与扫描结果为准。若 Task 1 基线烟雾测试已经通过，禁止再按规格里的“缺失项”重做主题基础设施。
- 只覆盖桌面端体验，不顺手引入移动端适配、响应式改造、多品牌换肤、自定义配色面板或无障碍高对比主题。
- 当前工作树可能已带有未提交的主题改造或相关联本地改动；执行每个任务前必须先读取目标文件，在现有差异基础上增量修改，禁止为了贴合计划而回退、覆盖或抹掉未提交内容。
- 必须复用现有主题基础设施：`index.html`、`src/utils/themeMode.ts`、`src/stores/modules/app.ts`、`src/main.ts`、`src/components/layout/AppHeader.vue`、`src/views/statistics/chartOptions.ts`；如果这些文件的现有契约已经通过测试，后续任务只能补漏，不能再并行造第二套 `persist` 或第二套 DOM 挂载逻辑。
- `themePreference` 继续走 `theme_preference` 本地持久化键；`resolvedTheme` 继续作为运行时推导态，不写入 Pinia `persist.pick`。
- 所有新增或修改的 TypeScript、Vue SFC、SCSS、`index.html` 内联脚本都必须补齐与复杂度匹配的中文注释，重点解释业务原因、主题边界与为何这样做。
- 若任务清单中的页面、组件或测试文件在执行时不存在，先在缺口矩阵里标记为“未实现而非主题残留”，不要为了对齐计划清单而新建同名页面或测试；只对当前仓库已存在且已命中扫描范围的文件做主题补漏。
- 若触达文件已有测试，至少补 1 条主题相关断言；若无现成测试但属于高可见页面或复用组件，补 1 个最小 smoke case；若确实无法补测，必须在 Task 9 的验证证据中记录原因与人工替代检查项。
- 除非用户明确要求，否则执行过程中不主动 `git commit`、`git push`、创建 PR 或生成空提交；计划中不再内置 Git 写操作步骤。
- 每完成一个功能块至少执行该块相关单测与 `npm run type-check`；宣称整体完成前必须执行 `npm run build`。
- `chartOptions.ts` 可以保留集中化的图表主题色板常量，但页面层、组件层和分散的 option 片段不允许继续散落硬编码颜色。

## 当前可复用基线

- `index.html`
  - 已具备首屏主题预注入脚本，是避免“先亮后暗”闪色的唯一入口。
- `src/utils/themeMode.ts`
  - 已定义 `ThemePreference`、`ResolvedTheme`、`THEME_STORAGE_KEY`、系统主题监听、DOM 写入与本地持久化逻辑。
- `src/stores/modules/app.ts`
  - 已维护 `themePreference`、`resolvedTheme`、`initializeThemeState()`、`setThemePreference()`、`refreshResolvedTheme()` 与 `resetState()` 保留主题偏好的契约。
- `src/main.ts`
  - 已负责启动时同步主题状态到 DOM，并注册系统主题监听。
- `src/components/layout/AppHeader.vue`
  - 已存在顶部主题入口，是后续布局阶段唯一允许扩展主题交互的地方。
- `src/layouts/DefaultLayout.vue`
- `src/layouts/AuthLayout.vue`
- `src/layouts/BlankLayout.vue`
  - 已通过 `data-resolved-theme` 把最终主题透传到布局根节点。
- `src/views/statistics/chartOptions.ts`
  - 已存在 `getChartThemeTokens()` 与图表 option 工厂，是统计域主题色板的集中出口。
- 现有基线测试
  - `src/stores/__tests__/app.spec.ts`
  - `src/__tests__/main.spec.ts`
  - `src/components/layout/__tests__/AppHeader.spec.ts`
  - `src/layouts/__tests__/LayoutTheme.spec.ts`
  - `src/assets/styles/__tests__/consoleTheme.spec.ts`
  - `src/plugins/__tests__/elementPlus.spec.ts`
  - `src/views/statistics/__tests__/chartOptions.spec.ts`

## 文件结构与职责

- `index.html`
  - 保留首屏预注入职责，只在主题键名、兜底分支或注释缺口时做最小调整。
- `src/utils/themeMode.ts`
- `src/stores/modules/app.ts`
- `src/main.ts`
  - 只作为主题状态、解析与启动接管的基础设施层，不在页面组件内复制监听与持久化逻辑。
- `src/assets/styles/variables.scss`
- `src/assets/styles/element-override.scss`
- `src/assets/styles/reset.scss`
- `src/assets/styles/_auth-pages.scss`
  - 统一承载语义 token、Element Plus 变量、根背景与认证域共享主题样式。
- `src/components/layout/AppHeader.vue`
- `src/components/layout/AppSidebar.vue`
- `src/components/layout/AppBreadcrumb.vue`
- `src/components/layout/ConsoleFeedbackSurface.vue`
- `src/layouts/DefaultLayout.vue`
- `src/layouts/AuthLayout.vue`
- `src/layouts/BlankLayout.vue`
  - 统一承载导航壳层、认证壳层、异常页壳层的主题语义。
- `src/components/common/EmptyState.vue`
- `src/components/common/SearchBar.vue`
- `src/components/form/CategoryForm.vue`
- `src/components/form/DeviceForm.vue`
- `src/components/form/ReservationForm.vue`
- `src/components/form/ResetPasswordForm.vue`
- `src/components/business/AiChatBox.vue`
- `src/components/business/AiMessage.vue`
- `src/components/business/DeviceCard.vue`
- `src/components/business/DeviceStatusTag.vue`
- `src/components/business/NotificationItem.vue`
- `src/components/business/OverdueAlert.vue`
- `src/components/business/PermissionTree.vue`
- `src/components/business/ReservationCard.vue`
- `src/components/business/ReservationTimeline.vue`
- `src/components/business/StatisticsCard.vue`
  - 作为页面复用表面层，负责把 token 落到卡片、表单、消息气泡、状态标签与提示面板。
- `src/views/auth/*.vue`
- `src/views/ai/*.vue`
- `src/views/user/*.vue`
- `src/views/dashboard/*.vue`
- `src/views/device/*.vue`
- `src/views/device/category/*.vue`
- `src/views/reservation/*.vue`
- `src/views/reservation/manage/*.vue`
- `src/views/borrow/*.vue`
- `src/views/overdue/*.vue`
- `src/views/notification/*.vue`
- `src/views/common/*.vue`
- `src/views/error/*.vue`
- `src/views/admin/*.vue`
- `src/views/statistics/*.vue`
  - 只消费语义 token 与复用组件，不再自行发明页面级颜色体系。

---

### Task 1: 冻结 V2 基线并生成缺口矩阵

**Files:**

- Verify: `index.html`
- Verify: `src/utils/themeMode.ts`
- Verify: `src/stores/modules/app.ts`
- Verify: `src/main.ts`
- Verify: `src/components/layout/AppHeader.vue`
- Verify: `src/layouts/DefaultLayout.vue`
- Verify: `src/layouts/AuthLayout.vue`
- Verify: `src/layouts/BlankLayout.vue`
- Verify: `src/views/statistics/chartOptions.ts`
- Verify: `src/stores/__tests__/app.spec.ts`
- Verify: `src/__tests__/main.spec.ts`
- Verify: `src/components/layout/__tests__/AppHeader.spec.ts`
- Verify: `src/layouts/__tests__/LayoutTheme.spec.ts`
- Verify: `src/assets/styles/__tests__/consoleTheme.spec.ts`
- Verify: `src/plugins/__tests__/elementPlus.spec.ts`
- Verify: `src/views/statistics/__tests__/chartOptions.spec.ts`
- Verify: `src/views/**/*.vue`
- Verify: `src/components/**/*.vue`
- Verify: `src/layouts/**/*.vue`
- Verify: `src/assets/styles/**/*.scss`

- [ ] **Step 1: 先跑主题基础设施烟雾测试，确认当前分支不是从零开始**

Run: `npm run test:unit -- src/stores/__tests__/app.spec.ts src/__tests__/main.spec.ts src/components/layout/__tests__/AppHeader.spec.ts src/layouts/__tests__/LayoutTheme.spec.ts src/views/statistics/__tests__/chartOptions.spec.ts`

Expected: PASS，证明主题状态、首屏预注入、头部入口、布局透传与图表主题工厂都已存在。

若结果不是 PASS：先判断失败是“主题基础设施缺口”还是“当前工作树已有改动引入的回归”，并把失败文件归类记录到缺口矩阵；禁止不做判断就直接重写 `themeMode.ts`、`app.ts`、`main.ts` 或 `index.html`。

- [ ] **Step 1.5: 若 Step 1 失败，先完成基础设施最小补漏并复跑同一组烟雾测试，PASS 前不得进入 Task 2-9**

Run: `npm run test:unit -- src/stores/__tests__/app.spec.ts src/__tests__/main.spec.ts src/components/layout/__tests__/AppHeader.spec.ts src/layouts/__tests__/LayoutTheme.spec.ts src/views/statistics/__tests__/chartOptions.spec.ts`

Expected: PASS，基线冻结后再推进后续任务；若仍失败，继续在 Task 1 内迭代定位与修复。

若失败只落在非主题文件、未触达本计划范围的测试，或明显属于当前工作树其他改动引入的回归：先把失败项记录到缺口矩阵，并暂停进入 Task 2-9，等待确认，不自行把修复范围扩展到主题计划之外。

- [ ] **Step 2: 扫描剩余硬编码颜色热点，只统计非测试源文件**

Run:

```bash
python - <<'PY'
from pathlib import Path
import re

roots = ['src/views', 'src/components', 'src/layouts', 'src/assets/styles']
pattern = re.compile(
    r'#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|(?:linear|radial|conic)-gradient\(|\b(?:white|black|transparent)\b'
)

for root in roots:
    for path in sorted(Path(root).rglob('*')):
        if '__tests__' in path.parts:
            continue
        if path.suffix not in {'.vue', '.scss', '.css', '.ts'}:
            continue
        text = path.read_text(encoding='utf-8')
        if pattern.search(text):
            print(path)
PY
```

Expected: 输出真实热点文件清单，用于对照后续任务，而不是再凭旧计划猜测范围。

缺口矩阵至少记录以下字段：

- `文件路径`
- `命中类型`：基础设施 / 样式 / 布局组件 / 业务组件 / 页面 / 图表 / 非计划范围
- `现象`：硬编码背景 / 边框 / 阴影 / 渐变 / 文字色 / 浮层 / 其他
- `归属 Task`
- `是否需要补测试`
- `保留或豁免原因`

清理判定口径：

- 必须清零：浅色背景、浅色边框、浅色阴影、仅适用于浅色底的文字色、页面级浅色渐变
- 允许保留但必须写明原因：业务状态语义色、`chartOptions.ts` 的集中图表色板、品牌 Logo 固定色、`transparent`

- [ ] **Step 3: 按扫描结果把缺口归类到后续任务，不重复改造已通过烟雾测试的主题基础设施**

要求：

- 基础设施缺口：只允许落到 `index.html`、`src/utils/themeMode.ts`、`src/stores/modules/app.ts`、`src/main.ts`
- 样式与组件库缺口：落到 `src/assets/styles/*.scss`
- 布局与复用组件缺口：落到 `src/components/**` 与 `src/layouts/**`
- 页面缺口：落到各业务域页面文件
- 图表缺口：落到 `src/views/statistics/chartOptions.ts` 与统计页

Task 1 完成标准：

- 主题基础设施烟雾测试 PASS
- 扫描结果全部进入缺口矩阵
- 每一条扫描结果都有归属 Task、补测结论或豁免理由
- 执行者已经明确哪些文件“本次要改”、哪些文件“只记录不扩修”

- [ ] **Step 4: 若基础设施烟雾测试已通过，后续任务禁止再新增第二套主题持久化或系统监听实现**

Expected: 执行者明确“补漏优先，禁止重写”。

---

### Task 2: 收口全局 token、Element Plus 与认证共享样式

> 本任务开始，Task 2-9 统一使用同一套完成判定模板：`范围` / `注释` / `自动验证` / `人工验证` / `记录`。如果某项在当前 Task 不单独执行，必须明确写明“并入 Task 9 总回归”或“已在缺口矩阵记录”。

**Files:**

- Modify: `src/assets/styles/variables.scss`
- Modify: `src/assets/styles/element-override.scss`
- Modify: `src/assets/styles/reset.scss`
- Modify: `src/assets/styles/_auth-pages.scss`
- Modify: `src/assets/styles/__tests__/consoleTheme.spec.ts`
- Modify: `src/plugins/__tests__/elementPlus.spec.ts`

- [ ] **Step 1: 以现有变量体系为基础补齐缺失 token，不重命名已被广泛消费的稳定变量**

重点补齐：

- 页面背景、浮层背景、实体表面、边框、阴影、焦点环
- 主文字、次文字、弱文字、占位文字
- `brand / info / success / warning / danger` tone 家族的 `text / surface / border / solid`
- 图表专用 token 或与 `chartOptions.ts` 对齐的色板出口

- [ ] **Step 2: 在样式文件中补中文注释，说明深色覆盖与程序化浮层为何必须集中在这里**

示例结构：

```scss
/* 深色主题下的组件库浮层必须走同一套 token，避免页面已暗而 Message / Dialog 仍亮。 */
[data-theme='dark'] {
  --app-surface-overlay: #16202d;
}
```

- [ ] **Step 3: 让 Element Plus 当前在用控件与程序化浮层统一消费 token**

至少覆盖：

- `el-button`、`el-input`、`el-select`、`el-radio-button`、`el-table`、`el-dialog`
- `el-dropdown`、`el-tooltip`、`el-pagination`、`el-tree`、`el-upload`
- `ElMessage`、`ElMessageBox`、`ElLoadingDirective`

覆盖完成判定：

- 组件文字色、边框色、浮层背景都能追溯到统一 token 链路
- 程序化浮层至少有 1 条测试断言或可验证的变量 / class 断言
- 深色模式下不存在“页面已暗但浮层仍亮”的残留现象

- [ ] **Step 4: 收口 `reset.scss` 与 `_auth-pages.scss` 的浅色专用背景、输入底与错误色**

Expected: 登录、注册、忘记密码、重置密码的共享底色和辅助文案在深色下仍保持可读。

- [ ] **Step 5: 跑样式与组件库测试回归**

Run: `npm run test:unit -- src/assets/styles/__tests__/consoleTheme.spec.ts src/plugins/__tests__/elementPlus.spec.ts`

Expected: PASS，主题 token 基线与组件库覆写契约稳定。

- [ ] **Step 6: 跑一次类型检查，确保样式层改造没有破坏 Vue / TS 构建**

Run: `npm run type-check`

Expected: PASS。

**本 Task 完成判定（统一模板）**

- `范围`：`variables.scss`、`element-override.scss`、`reset.scss`、`_auth-pages.scss` 及对应测试文件已完成主题补漏；若清单中文件不存在或超出当前工作树真实范围，已写入缺口矩阵。
- `注释`：本 Task 触达的 SCSS 与测试文件已补齐必要中文注释，能够解释 token 分层、深色覆盖和程序化浮层为何集中在样式层。
- `自动验证`：本 Task 指定测试命令与 `npm run type-check` 全部 PASS；若新增了主题相关断言，满足“至少 1 条主题断言或可验证变量 / class 断言”的下限。
- `人工验证`：如本 Task 未单独做浏览器检查，则在 Task 9 中至少覆盖 1 个使用 Element Plus 浮层的页面或场景，验证样式层改造结果。
- `记录`：允许保留的语义色、图表色板、品牌色及其他豁免项已写入缺口矩阵，未出现未说明的硬编码残留。

---

### Task 3: 补齐布局壳层、主题入口与公共组件主题语义

**Files:**

- Modify: `src/components/layout/AppHeader.vue`
- Modify: `src/components/layout/AppSidebar.vue`
- Modify: `src/components/layout/AppBreadcrumb.vue`
- Modify: `src/components/layout/ConsoleFeedbackSurface.vue`
- Modify: `src/layouts/DefaultLayout.vue`
- Modify: `src/layouts/AuthLayout.vue`
- Modify: `src/layouts/BlankLayout.vue`
- Modify: `src/components/common/EmptyState.vue`
- Modify: `src/components/common/SearchBar.vue`
- Modify: `src/components/layout/__tests__/AppHeader.spec.ts`
- Modify: `src/components/layout/__tests__/AppSidebar.spec.ts`
- Modify: `src/components/layout/__tests__/AppBreadcrumb.spec.ts`
- Modify: `src/components/layout/__tests__/ConsoleShells.spec.ts`
- Modify: `src/components/layout/__tests__/navigation.spec.ts`
- Modify: `src/layouts/__tests__/LayoutTheme.spec.ts`
- Modify: `src/components/common/__tests__/CommonComponents.spec.ts`

- [ ] **Step 1: 保留现有顶部三态主题入口，只修补交互细节与主题语义缺口，并为触达的布局 / 公共组件补 `<script setup>` 头部职责注释**

要求：

- 不把主题切换按钮迁到其他位置
- 不在 `AppSidebar.vue`、布局组件或公共组件内重复写 `matchMedia` / `localStorage`
- 工具区布局不能因为主题入口挤压通知和用户菜单

- [ ] **Step 2: 布局根节点继续通过 `data-resolved-theme` 透传最终主题，并补齐中文注释解释该约束**

Expected: `DefaultLayout`、`AuthLayout`、`BlankLayout` 保持同一透传口径。

- [ ] **Step 3: 把侧栏、面包屑、反馈面板、空状态、搜索栏中的浅色底、阴影、边框和 hover 收口到 token**

Expected: 布局壳层与公共组件不再出现“深色页面里夹一个浅色卡片”的孤岛效果。

- [ ] **Step 4: 跑布局与公共组件回归测试**

Run: `npm run test:unit -- src/components/layout/__tests__/AppHeader.spec.ts src/components/layout/__tests__/AppSidebar.spec.ts src/components/layout/__tests__/AppBreadcrumb.spec.ts src/components/layout/__tests__/ConsoleShells.spec.ts src/components/layout/__tests__/navigation.spec.ts src/layouts/__tests__/LayoutTheme.spec.ts src/components/common/__tests__/CommonComponents.spec.ts`

Expected: PASS，头部入口、侧栏、布局透传与公共组件结构稳定。

- [ ] **Step 5: 跑一次类型检查**

Run: `npm run type-check`

Expected: PASS。

**本 Task 完成判定（统一模板）**

- `范围`：布局壳层、主题入口、空状态与搜索栏等 `Files` 清单中的现有文件已完成主题语义收口；不存在的文件已记录为“未实现而非主题残留”。
- `注释`：所有触达的 Vue SFC 已补 `<script setup>` 头部职责注释，涉及 `data-resolved-theme` 透传与主题入口约束的模板或脚本逻辑已有中文说明。
- `自动验证`：本 Task 指定的布局 / 公共组件测试命令与 `npm run type-check` 全部 PASS，且至少新增或保留 1 条与主题入口或布局透传相关的有效断言。
- `人工验证`：如未单独开浏览器检查，则在 Task 9 中至少覆盖头部主题入口、侧栏、面包屑和 1 个公共组件的主题切换表现。
- `记录`：工具区布局风险、公共组件残留样式或非本任务范围问题已记入缺口矩阵，不留口头约定。

---

### Task 4: 收口表单组件与业务组件主题语义

**Files:**

- Modify: `src/components/form/CategoryForm.vue`
- Modify: `src/components/form/DeviceForm.vue`
- Modify: `src/components/form/ReservationForm.vue`
- Modify: `src/components/form/ResetPasswordForm.vue`
- Modify: `src/components/business/AiChatBox.vue`
- Modify: `src/components/business/AiMessage.vue`
- Modify: `src/components/business/DeviceCard.vue`
- Modify: `src/components/business/DeviceStatusTag.vue`
- Modify: `src/components/business/NotificationItem.vue`
- Modify: `src/components/business/OverdueAlert.vue`
- Modify: `src/components/business/PermissionTree.vue`
- Modify: `src/components/business/ReservationCard.vue`
- Modify: `src/components/business/ReservationTimeline.vue`
- Modify: `src/components/business/StatisticsCard.vue`
- Modify: `src/components/form/__tests__/CategoryForm.spec.ts`
- Modify: `src/components/form/__tests__/DeviceForm.spec.ts`
- Modify: `src/components/form/__tests__/ReservationForm.spec.ts`
- Modify: `src/components/form/__tests__/ResetPasswordForm.spec.ts`
- Modify: `src/components/business/__tests__/AiChatBox.spec.ts`
- Modify: `src/components/business/__tests__/DeviceCard.spec.ts`
- Modify: `src/components/business/__tests__/NotificationItem.spec.ts`
- Modify: `src/components/business/__tests__/OverdueAlert.spec.ts`
- Modify: `src/components/business/__tests__/PermissionTree.spec.ts`
- Modify: `src/components/business/__tests__/ReservationCard.spec.ts`
- Modify: `src/components/business/__tests__/ReservationTimeline.spec.ts`
- Modify: `src/components/business/__tests__/StatisticsCard.spec.ts`
- Modify: `src/components/business/__tests__/StatusTags.spec.ts`

- [ ] **Step 1: 先按组件职责给表单和业务组件补中文注释，并在每个触达的 SFC 顶部补 `<script setup>` 职责说明，解释为什么使用 tone 家族而不是页面局部颜色**

Expected: 注释能解释组件在暗色下的视觉语义，而不是简单复述“设置了背景色”。

- [ ] **Step 2: 清理表单容器、输入区、错误提示、消息气泡、状态标签、时间线节点和统计卡片中的散落硬编码颜色**

要求：

- 状态标签继续保留业务状态语义，不因主题改造而混淆业务颜色
- `DeviceStatusTag.vue` 和相关测试一起纳入，避免只改卡片不改状态标签
- 组件只消费 token 或集中枚举映射，不直接依赖页面私有色值

- [ ] **Step 3: 对已有测试只补最小必要断言，不为主题改造重写整套组件测试**

Expected: 重点断言“已改为 token / 已移除旧硬编码 / 关键结构不变”。

- [ ] **Step 4: 跑表单与业务组件回归测试**

Run: `npm run test:unit -- src/components/form/__tests__/CategoryForm.spec.ts src/components/form/__tests__/DeviceForm.spec.ts src/components/form/__tests__/ReservationForm.spec.ts src/components/form/__tests__/ResetPasswordForm.spec.ts src/components/business/__tests__/AiChatBox.spec.ts src/components/business/__tests__/DeviceCard.spec.ts src/components/business/__tests__/NotificationItem.spec.ts src/components/business/__tests__/OverdueAlert.spec.ts src/components/business/__tests__/PermissionTree.spec.ts src/components/business/__tests__/ReservationCard.spec.ts src/components/business/__tests__/ReservationTimeline.spec.ts src/components/business/__tests__/StatisticsCard.spec.ts src/components/business/__tests__/StatusTags.spec.ts`

Expected: PASS，表单与业务组件主题语义统一且行为未回退。

- [ ] **Step 5: 跑一次类型检查**

Run: `npm run type-check`

Expected: PASS。

**本 Task 完成判定（统一模板）**

- `范围`：表单组件、业务组件及其测试文件已按 `Files` 清单完成主题收口；`DeviceStatusTag.vue` 等关联文件未被遗漏。
- `注释`：所有触达组件都已补中文职责注释，能够解释 tone 家族、状态语义和主题样式之间的关系。
- `自动验证`：本 Task 指定组件测试命令与 `npm run type-check` 全部 PASS；若原有测试较弱，已至少补 1 条主题断言或 1 个最小 smoke case。
- `人工验证`：如本 Task 未单独跑组件级浏览器检查，则在 Task 9 中至少覆盖 1 个表单、1 个业务卡片和 1 个状态标签场景。
- `记录`：仍允许保留的业务状态语义色、不可替换的品牌视觉或暂缓项已写入缺口矩阵并附原因。

---

### Task 5: 覆盖认证域、AI 域与兜底页主题补漏

**Files:**

- Modify: `src/views/auth/Login.vue`
- Modify: `src/views/auth/Register.vue`
- Modify: `src/views/auth/ForgotPassword.vue`
- Modify: `src/views/auth/ResetPassword.vue`
- Modify: `src/views/auth/components/PasswordResetPanel.vue`
- Modify: `src/views/ai/Chat.vue`
- Modify: `src/views/ai/History.vue`
- Modify: `src/views/common/ViewPlaceholder.vue`
- Modify: `src/views/error/403.vue`
- Modify: `src/views/error/404.vue`
- Modify: `src/views/error/500.vue`
- Modify: `src/views/auth/__tests__/auth-pages.spec.ts`
- Modify: `src/views/ai/__tests__/Chat.spec.ts`
- Modify: `src/views/ai/__tests__/History.spec.ts`
- Modify: `src/views/common/__tests__/ViewPlaceholder.spec.ts`
- Modify: `src/views/error/__tests__/ErrorPages.spec.ts`
- Modify: `src/views/error/__tests__/500.spec.ts`

- [ ] **Step 1: 认证页继续复用 `_auth-pages.scss`，页面文件只处理局部例外样式，并为每个触达页面补 `<script setup>` 头部职责注释与必要模板注释**

Expected: 认证域不再复制同一套背景、描边和辅助文字逻辑。

- [ ] **Step 2: AI 聊天与历史页统一消息面板、输入区、空状态与时间线的主题语义**

Expected: 深色下聊天记录区与消息气泡层次清晰，不出现过亮面板。

- [ ] **Step 3: 占位页与 403/404/500 统一收口背景、文案和 CTA 色彩，确保异常页在暗色下不失焦**

Expected: 兜底页也遵守相同 token 体系。

- [ ] **Step 4: 跑认证、AI 与兜底页测试回归**

Run: `npm run test:unit -- src/views/auth/__tests__/auth-pages.spec.ts src/views/ai/__tests__/Chat.spec.ts src/views/ai/__tests__/History.spec.ts src/views/common/__tests__/ViewPlaceholder.spec.ts src/views/error/__tests__/ErrorPages.spec.ts src/views/error/__tests__/500.spec.ts`

Expected: PASS，主流程、提示文案与错误页结构保持正确。

- [ ] **Step 5: 跑一次类型检查**

Run: `npm run type-check`

Expected: PASS。

**本 Task 完成判定（统一模板）**

- `范围`：认证域、AI 域、占位页和错误页的现有文件已完成主题补漏；若某页不存在或当前未落地，已按缺口矩阵规则记录。
- `注释`：触达页面已补 `<script setup>` 头部职责注释，涉及认证提示、AI 消息区或异常页 CTA 的模板分支已有必要中文说明。
- `自动验证`：本 Task 指定页面测试命令与 `npm run type-check` 全部 PASS；若页面原先缺少主题断言，已按最低补测标准补足。
- `人工验证`：如本 Task 未单独开浏览器检查，则在 Task 9 中至少覆盖 1 个认证页、1 个 AI 页面和 1 个错误页的浅色 / 深色表现。
- `记录`：需要依赖后端数据、登录状态或权限条件才能进入的页面，若当前无法完全验证，已在验证证据中写明替代检查项。

---

### Task 6: 覆盖用户域、仪表盘与设备域页面主题补漏

**Files:**

- Modify: `src/views/user/Profile.vue`
- Modify: `src/views/user/List.vue`
- Modify: `src/views/user/Detail.vue`
- Modify: `src/views/user/Freeze.vue`
- Modify: `src/views/user/RoleAssign.vue`
- Modify: `src/views/dashboard/index.vue`
- Modify: `src/views/dashboard/UserDashboard.vue`
- Modify: `src/views/dashboard/AdminDashboard.vue`
- Modify: `src/views/device/List.vue`
- Modify: `src/views/device/Create.vue`
- Modify: `src/views/device/Edit.vue`
- Modify: `src/views/device/Detail.vue`
- Modify: `src/views/device/category/List.vue`
- Modify: `src/views/device/category/Manage.vue`
- Modify: `src/views/user/__tests__/Profile.spec.ts`
- Modify: `src/views/user/__tests__/List.spec.ts`
- Modify: `src/views/user/__tests__/Detail.spec.ts`
- Modify: `src/views/user/__tests__/Freeze.spec.ts`
- Modify: `src/views/user/__tests__/RoleAssign.spec.ts`
- Modify: `src/views/dashboard/__tests__/index.spec.ts`
- Modify: `src/views/dashboard/__tests__/UserDashboard.spec.ts`
- Modify: `src/views/dashboard/__tests__/AdminDashboard.spec.ts`
- Modify: `src/views/device/__tests__/List.spec.ts`
- Modify: `src/views/device/__tests__/FormPages.spec.ts`
- Modify: `src/views/device/__tests__/Detail.spec.ts`
- Modify: `src/views/device/category/__tests__/List.spec.ts`
- Modify: `src/views/device/category/__tests__/Manage.spec.ts`

- [ ] **Step 1: 先处理用户域页面，并补 `<script setup>` 头部职责注释与必要模板注释**

Expected: `Profile / List / Detail / Freeze / RoleAssign` 先完成一轮可单独验证的主题收口。

- [ ] **Step 2: 再处理仪表盘页面的 hero、统计卡片与概览面板主题语义**

Expected: `index / UserDashboard / AdminDashboard` 的强调区和概览面板改走 token 或集中映射。

- [ ] **Step 3: 最后处理设备域页面、详情页与分类树的浅色专用颜色**

要求：

- 用户冻结态、角色分配、分类管理等业务强调态继续保留领域语义
- 仪表盘 hero 渐变与信息卡强调态改走 token 或集中映射
- 设备创建 / 编辑页优先复用表单组件，不在页面层复制表单底色逻辑

- [ ] **Step 4: 为页面级复杂条件渲染补中文模板注释，说明权限或状态导致的主题块差异**

Expected: 评审时可直接看出为什么某些面板只在特定状态下展示。

- [ ] **Step 5: 先按域跑测试，定位回归时不要把三个域混成一锅**

Run: `npm run test:unit -- src/views/user/__tests__/Profile.spec.ts src/views/user/__tests__/List.spec.ts src/views/user/__tests__/Detail.spec.ts src/views/user/__tests__/Freeze.spec.ts src/views/user/__tests__/RoleAssign.spec.ts`

Expected: PASS，用户域回归通过。

再运行：`npm run test:unit -- src/views/dashboard/__tests__/index.spec.ts src/views/dashboard/__tests__/UserDashboard.spec.ts src/views/dashboard/__tests__/AdminDashboard.spec.ts`

Expected: PASS，仪表盘回归通过。

再运行：`npm run test:unit -- src/views/device/__tests__/List.spec.ts src/views/device/__tests__/FormPages.spec.ts src/views/device/__tests__/Detail.spec.ts src/views/device/category/__tests__/List.spec.ts src/views/device/category/__tests__/Manage.spec.ts`

Expected: PASS，设备域回归通过。

- [ ] **Step 6: 最后补一次合并回归，确认跨域修改没有互相污染**

Run: `npm run test:unit -- src/views/user/__tests__/Profile.spec.ts src/views/user/__tests__/List.spec.ts src/views/user/__tests__/Detail.spec.ts src/views/user/__tests__/Freeze.spec.ts src/views/user/__tests__/RoleAssign.spec.ts src/views/dashboard/__tests__/index.spec.ts src/views/dashboard/__tests__/UserDashboard.spec.ts src/views/dashboard/__tests__/AdminDashboard.spec.ts src/views/device/__tests__/List.spec.ts src/views/device/__tests__/FormPages.spec.ts src/views/device/__tests__/Detail.spec.ts src/views/device/category/__tests__/List.spec.ts src/views/device/category/__tests__/Manage.spec.ts`

Expected: PASS，页面结构、表单交互和角色分支渲染稳定。

- [ ] **Step 7: 跑一次类型检查**

Run: `npm run type-check`

Expected: PASS。

**本 Task 完成判定（统一模板）**

- `范围`：用户域、仪表盘与设备域页面已分别完成主题补漏，并通过分域测试验证；若某页未实现或不在当前工作树范围，已记录到缺口矩阵。
- `注释`：触达页面已补 `<script setup>` 头部职责注释，涉及权限、冻结状态、角色分支或分类管理等模板差异的地方已有中文说明。
- `自动验证`：用户域、仪表盘、设备域分域测试、合并回归测试与 `npm run type-check` 全部 PASS；测试补强满足最低主题断言标准。
- `人工验证`：如本 Task 未单独跑浏览器检查，则在 Task 9 中至少覆盖 1 个用户页、1 个仪表盘页和 1 个设备页场景。
- `记录`：页面级 hero、渐变、业务强调态或暂缓项若需保留，均已写入缺口矩阵并说明原因，避免后续误判为漏改。

---

### Task 7: 覆盖预约域、借还域、逾期域、通知页与管理页主题补漏

**Files:**

- Modify: `src/views/reservation/List.vue`
- Modify: `src/views/reservation/Create.vue`
- Modify: `src/views/reservation/Detail.vue`
- Modify: `src/views/reservation/CheckIn.vue`
- Modify: `src/views/reservation/manage/Pending.vue`
- Modify: `src/views/reservation/manage/History.vue`
- Modify: `src/views/borrow/List.vue`
- Modify: `src/views/borrow/Confirm.vue`
- Modify: `src/views/borrow/Return.vue`
- Modify: `src/views/borrow/Detail.vue`
- Modify: `src/views/overdue/List.vue`
- Modify: `src/views/overdue/Detail.vue`
- Modify: `src/views/overdue/Handle.vue`
- Modify: `src/views/notification/List.vue`
- Modify: `src/views/admin/RolePermission.vue`
- Modify: `src/views/admin/PromptTemplate.vue`
- Modify: `src/views/reservation/__tests__/List.spec.ts`
- Modify: `src/views/reservation/__tests__/Create.spec.ts`
- Modify: `src/views/reservation/__tests__/Detail.spec.ts`
- Modify: `src/views/reservation/__tests__/CheckIn.spec.ts`
- Modify: `src/views/reservation/manage/__tests__/Pending.spec.ts`
- Modify: `src/views/reservation/manage/__tests__/History.spec.ts`
- Modify: `src/views/borrow/__tests__/BorrowPages.spec.ts`
- Modify: `src/views/overdue/__tests__/OverduePages.spec.ts`
- Modify: `src/views/notification/__tests__/List.spec.ts`
- Modify: `src/views/admin/__tests__/RolePermission.spec.ts`
- Modify: `src/views/admin/__tests__/PromptTemplate.spec.ts`

- [ ] **Step 1: 先处理预约域页面，并为触达页面补 `<script setup>` 头部职责注释与必要模板注释**

Expected: 预约列表、创建、详情、签到、审核页先形成可单独回归的闭环。

- [ ] **Step 2: 再处理借还域与逾期域页面的表格壳层、状态面板与处理表单主题语义**

Expected: 借用确认、归还确认、逾期处理等管理场景在暗色下仍保持区分度。

- [ ] **Step 3: 最后处理通知页与管理页的编辑器面板、预览面板与树结构主题语义**

要求：

- 预约、借还、逾期状态提示继续保留业务域差异，不能因为共用主题 token 而把不同域状态文案做成同色同义
- 通知页已读 / 未读视觉差异继续保留
- Prompt 模板页和角色权限页的预览面板、树结构和状态卡片走同一套 tone 家族

- [ ] **Step 4: 对涉及权限或审批状态的模板分支补中文注释，说明为什么某块只对某角色或某状态显示**

Expected: 权限相关的主题块既可读，也满足仓库注释治理要求。

- [ ] **Step 5: 先按域跑测试，控制回归定位半径**

Run: `npm run test:unit -- src/views/reservation/__tests__/List.spec.ts src/views/reservation/__tests__/Create.spec.ts src/views/reservation/__tests__/Detail.spec.ts src/views/reservation/__tests__/CheckIn.spec.ts src/views/reservation/manage/__tests__/Pending.spec.ts src/views/reservation/manage/__tests__/History.spec.ts`

Expected: PASS，预约域回归通过。

再运行：`npm run test:unit -- src/views/borrow/__tests__/BorrowPages.spec.ts src/views/overdue/__tests__/OverduePages.spec.ts`

Expected: PASS，借还域与逾期域回归通过。

再运行：`npm run test:unit -- src/views/notification/__tests__/List.spec.ts src/views/admin/__tests__/RolePermission.spec.ts src/views/admin/__tests__/PromptTemplate.spec.ts`

Expected: PASS，通知页与管理页回归通过。

- [ ] **Step 6: 最后补一次合并回归，确认跨域修改没有互相污染**

Run: `npm run test:unit -- src/views/reservation/__tests__/List.spec.ts src/views/reservation/__tests__/Create.spec.ts src/views/reservation/__tests__/Detail.spec.ts src/views/reservation/__tests__/CheckIn.spec.ts src/views/reservation/manage/__tests__/Pending.spec.ts src/views/reservation/manage/__tests__/History.spec.ts src/views/borrow/__tests__/BorrowPages.spec.ts src/views/overdue/__tests__/OverduePages.spec.ts src/views/notification/__tests__/List.spec.ts src/views/admin/__tests__/RolePermission.spec.ts src/views/admin/__tests__/PromptTemplate.spec.ts`

Expected: PASS，预约链路、借还流程、逾期处理、通知交互和管理页结构均稳定。

- [ ] **Step 7: 跑一次类型检查**

Run: `npm run type-check`

Expected: PASS。

**本 Task 完成判定（统一模板）**

- `范围`：预约域、借还域、逾期域、通知页和管理页已按分域顺序完成主题补漏，并通过分域与合并回归；清单中不存在的页面或测试已按规则记录。
- `注释`：所有触达页面都已补中文职责注释；涉及权限、审批状态、已读 / 未读、处理动作差异的模板分支都有明确中文说明。
- `自动验证`：预约域、借还 / 逾期域、通知 / 管理页测试命令与 `npm run type-check` 全部 PASS；新增或补强的测试满足最低主题断言标准。
- `人工验证`：如本 Task 未单独跑浏览器检查，则在 Task 9 中至少覆盖 1 个预约页、1 个借还 / 逾期场景、1 个通知或管理页场景。
- `记录`：保留的业务状态色、审批语义差异、受后端数据影响的阻塞页和暂缓项已记录到缺口矩阵或最终验证证据。

---

### Task 8: 收口统计图表与统计页主题一致性

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

- [ ] **Step 1: 保留 `getChartThemeTokens()` 作为图表主题单一出口，不在各页面内继续写死图表颜色**

要求：

- 页面层只依赖 `appStore.resolvedTheme`
- 具体 palette、坐标轴、tooltip、visualMap 样式集中在 `chartOptions.ts`
- 如果需要新 token，优先先回到 `variables.scss` 或在 `chartOptions.ts` 内集中补齐，而不是分散到页面里

- [ ] **Step 2: 为图表主题工厂与统计页补中文注释，说明为何图表色板允许集中保留在 TS 文件中**

Expected: 评审时能看出这是“集中主题工厂”，不是新的散落硬编码来源。

- [ ] **Step 3: 确保所有统计页在主题切换时都会重算 option，而不是只在首次渲染读取主题**

Expected: 切换浅色 / 深色 / 跟随系统后，图表 palette、tooltip、legend、坐标轴和容器背景同步变化。

- [ ] **Step 4: 跑统计图表与统计页回归测试**

Run: `npm run test:unit -- src/views/statistics/__tests__/chartOptions.spec.ts src/views/statistics/__tests__/StatisticsPages.spec.ts`

Expected: PASS，图表主题工厂与页面联动正确。

- [ ] **Step 5: 跑一次类型检查**

Run: `npm run type-check`

Expected: PASS。

**本 Task 完成判定（统一模板）**

- `范围`：`chartOptions.ts`、统计页和相关测试文件已按 `Files` 清单完成主题收口；图表主题逻辑仍集中在单一出口，没有散回页面层。
- `注释`：图表主题工厂、统计页主题依赖和必要模板 / 脚本逻辑都已补中文注释，能解释为何允许集中保留图表色板。
- `自动验证`：统计图表测试命令与 `npm run type-check` 全部 PASS；至少有 1 组断言能证明主题切换后 option 会重算或 palette 会变化。
- `人工验证`：如本 Task 未单独跑浏览器检查，则在 Task 9 中至少覆盖 1 个统计图表容器和 1 组图表切换主题后的可见变化。
- `记录`：允许保留在 `chartOptions.ts` 内的集中图表色板、需要补充的视觉差异和未覆盖的统计场景已写入缺口矩阵或最终验证证据。

---

### Task 9: 全量验证、格式化与桌面端浏览器回归

**Files:**

- Verify: `index.html`
- Verify: `src/utils/themeMode.ts`
- Verify: `src/stores/modules/app.ts`
- Verify: `src/main.ts`
- Verify: `src/assets/styles/**/*.scss`
- Verify: `src/components/**/*.vue`
- Verify: `src/layouts/**/*.vue`
- Verify: `src/views/**/*.vue`
- Verify: `src/**/*.spec.ts`

- [ ] **Step 1: 跑完整单测，确认主题补漏没有破坏其他业务域**

Run: `npm run test:unit`

Expected: PASS，整个前端单测套件通过。

- [ ] **Step 2: 跑类型检查**

Run: `npm run type-check`

Expected: PASS。

- [ ] **Step 3: 先用项目标准命令格式化源码；若 `index.html` 有改动，再补一次单文件格式化**

Run: `npm run format`

Expected: `src/` 下主题相关文件格式化完成。

如果本次修改了 `index.html`，再执行：`npx prettier --write index.html`

- [ ] **Step 4: 格式化后回跑关键烟雾测试**

Run: `npm run test:unit -- src/stores/__tests__/app.spec.ts src/components/layout/__tests__/AppHeader.spec.ts src/layouts/__tests__/LayoutTheme.spec.ts src/views/statistics/__tests__/chartOptions.spec.ts`

Expected: PASS，确认格式化没有破坏主题状态、布局入口与图表工厂。

- [ ] **Step 5: 跑生产构建，确保最终交付态而不是格式化前的代码可构建**

Run: `npm run build`

Expected: PASS。

- [ ] **Step 6: 启动开发环境并做桌面端浏览器回归**

Run: `npm run dev`

Expected: 至少人工检查以下场景：

- 顶部主题入口可以在 `浅色 / 深色 / 跟随系统` 三态之间切换
- `system` 模式下切换操作系统主题后，页面壳层与统计图表同步变化
- 登录、AI、用户、仪表盘、设备、预约、借还、逾期、通知、管理页、占位页和错误页都不存在明显浅色残留
- 表格、卡片、对话框、dropdown、message、message box、loading mask 在暗色下可读
- 统计图表的 tooltip、legend、坐标轴、visualMap 与深色容器一致

最小角色回归矩阵：

- `USER`：认证页、AI、我的预约、借还记录、逾期记录、通知中心、个人中心
- `DEVICE_ADMIN`：设备列表 / 分类、待审核、借用确认、归还确认、逾期处理、通知中心
- `SYSTEM_ADMIN`：用户管理、统计分析、角色权限、Prompt 模板、通知中心

`system` 模式验证步骤：

- 先把顶部入口切到 `跟随系统`
- 再切换操作系统外观或浏览器模拟的 `prefers-color-scheme`
- 记录布局壳层与至少 1 个统计图表同步变化的证据

证据与失败分流：

- 每个角色至少保留 1 张浅色截图和 1 张深色截图，或等价的浏览器自动化截图证据
- 若当前环境没有 GUI，可改用浏览器自动化 / 截图工具完成；若仍无法覆盖，记录阻塞原因、未验证页面和替代验证范围
- 若某页因后端数据或权限前置条件无法进入，记录阻塞页面、入口条件、已验证的替代页面，不把“未进入页面”误报为“已通过”

- [ ] **Step 7: 汇总验证证据并等待用户决定是否提交 Git 变更**

Expected: 只汇报结果与关键截图/现象，不主动执行 commit。

**本 Task 完成判定（统一模板）**

- `范围`：本次主题改造触达的所有现有文件都已纳入最终验证；未验证或受阻塞的文件 / 页面已在最终证据中逐项说明，没有被静默忽略。
- `注释`：抽查确认本次改动触达的 TypeScript、Vue、SCSS、`index.html` 已补齐必要中文注释，不存在“逻辑已改但注释没跟上”的开环。
- `自动验证`：`npm run test:unit`、`npm run type-check`、格式化后关键烟雾测试、`npm run build` 全部 PASS，且验证对应的是最终交付态代码。
- `人工验证`：桌面端角色回归矩阵、`system` 模式切换、截图或浏览器自动化证据已补齐；若环境受限，已写明替代验证范围和剩余阻塞。
- `记录`：缺口矩阵、豁免项、阻塞项、人工回归证据与后续待用户决定的 Git 动作都已整理完毕，执行链路到此闭环。

---

## 完成定义

- 复用现有主题基础设施，没有新增第二套主题状态、持久化或系统监听实现
- `variables.scss`、`element-override.scss`、布局壳层、复用组件、页面层与统计图表都统一消费主题 token 或集中主题工厂
- 所有本次改动触达的 TypeScript、Vue、SCSS、`index.html` 都补齐了必要的中文注释
- 主题相关分域测试、整套单测、`npm run type-check`、`npm run build` 均通过
- 桌面端浏览器回归确认浅色 / 深色 / 跟随系统三态可用，且关键页面与图表无明显视觉割裂
