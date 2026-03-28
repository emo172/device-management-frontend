# 全站主题切换（浅色 / 深色 / 跟随系统）设计

## 背景

当前前端仓库已经完成控制台导航布局重构，但视觉体系仍然只有一套浅色主题：

- `src/assets/styles/variables.scss` 只有 `:root` 下的浅色 token，没有深色主题分层
- `src/stores/modules/app.ts` 只维护侧栏折叠、加载态和致命错误，没有主题偏好与最终解析态
- `src/components/layout/AppHeader.vue` 还没有主题入口
- `src/assets/styles/element-override.scss`、`src/layouts/*.vue`、`src/components/layout/*.vue`、`src/views/**/*.vue` 中仍存在大量浅色硬编码
- `src/views/statistics/chartOptions.ts` 里的 ECharts 配色全部写死，图表不会跟随主题切换

项目文档原本把“深色模式 / 主题切换”列为本期不做项，但本次需求已经明确扩大范围，因此后续实现统一以本设计为准，不再受旧边界约束。

## 目标

1. 提供三态主题能力：`light`、`dark`、`system`
2. 顶部导航提供主题入口，支持手动切换浅色 / 深色 / 跟随系统
3. 全站页面、表格、卡片、表单、图表与认证页统一随主题切换
4. 在 `system` 模式下跟随操作系统的 `prefers-color-scheme` 变化
5. 刷新后保留用户主题偏好，避免首屏先亮后暗的闪动
6. 把主题真相源收口为统一 token 与主题解析器，避免逐页打补丁

## 范围

### 本次包含

- 全局主题状态、解析逻辑与持久化
- 根节点主题标识挂载与系统主题监听
- 顶部主题入口与布局壳层主题适配
- 全局语义 token、Element Plus 主题变量与认证页共享样式
- 所有业务页面中的背景、卡片、文字、边框、阴影、渐变等硬编码颜色替换
- 统计图表的 ECharts palette、背景、坐标轴与 visualMap 的主题适配
- 主题相关的单元测试、类型检查、生产构建与浏览器回归

### 本次不包含

- 多品牌主题切换
- 移动端独立主题策略
- 用户自定义配色面板
- 高对比度无障碍主题

## 当前基线与问题点

### 1. 状态层缺少主题模型

`src/stores/modules/app.ts` 当前只有：

- `sidebarCollapsed`
- `loading`
- `fatalError`

没有主题偏好与最终主题结果，导致顶部按钮、根节点标识、系统主题监听都没有统一真相源。

### 2. 样式层仍是单主题结构

- `src/assets/styles/variables.scss` 只有一套浅色变量
- `src/assets/styles/element-override.scss` 只在浅色语境下覆写 Element Plus
- `src/assets/styles/_auth-pages.scss` 以及 `src/assets/styles/reset.scss` 仍写死浅色背景与强调色

### 3. 页面层存在大量硬编码颜色

本次已确认的热点文件包括但不限于：

- 布局与公共组件
  - `src/components/layout/AppHeader.vue`
  - `src/components/layout/AppSidebar.vue`
  - `src/components/layout/ConsoleFeedbackSurface.vue`
  - `src/layouts/DefaultLayout.vue`
  - `src/layouts/AuthLayout.vue`
  - `src/layouts/BlankLayout.vue`
- 认证页
  - `src/views/auth/Login.vue`
  - `src/views/auth/components/PasswordResetPanel.vue`
- AI 页面
  - `src/views/ai/Chat.vue`
  - `src/views/ai/History.vue`
- 用户域页面
  - `src/views/user/Profile.vue`
  - `src/views/user/List.vue`
  - `src/views/user/Detail.vue`
  - `src/views/user/Freeze.vue`
  - `src/views/user/RoleAssign.vue`
- 统计页面与图表容器
  - `src/views/statistics/Overview.vue`
  - `src/views/statistics/DeviceUsage.vue`
  - `src/views/statistics/BorrowStats.vue`
  - `src/views/statistics/OverdueStats.vue`
  - `src/views/statistics/HotTimeSlots.vue`
  - `src/views/statistics/SharedChartPanel.vue`
  - `src/views/statistics/chartOptions.ts`
- 仪表盘、通知、借还与管理页面代表文件
  - `src/views/dashboard/index.vue`
  - `src/views/dashboard/UserDashboard.vue`
  - `src/views/dashboard/AdminDashboard.vue`
  - `src/views/notification/List.vue`
  - `src/views/borrow/List.vue`
  - `src/views/borrow/Confirm.vue`
  - `src/views/borrow/Return.vue`
  - `src/views/borrow/Detail.vue`
  - `src/views/admin/RolePermission.vue`
  - `src/views/admin/PromptTemplate.vue`
- 业务组件热点
  - `src/components/business/StatisticsCard.vue`
  - `src/components/business/OverdueAlert.vue`
  - `src/components/business/DeviceCard.vue`
  - `src/components/business/ReservationCard.vue`
  - `src/components/business/NotificationItem.vue`
  - `src/components/business/PermissionTree.vue`
  - `src/components/business/AiChatBox.vue`
  - `src/components/business/AiMessage.vue`

### 4. 图表主题完全独立于应用主题

`src/views/statistics/chartOptions.ts` 当前直接写死：

- 柱状图颜色
- 折线图颜色
- 热力图渐变色
- visualMap 色板

这会导致页面进入深色后，图表仍保留浅色视觉语义，与壳层割裂。

## 已确认的设计结论

### 1. 主题模型

应用层使用两层状态：

- `themePreference: 'light' | 'dark' | 'system'`
- `resolvedTheme: 'light' | 'dark'`
- `themeStorageKey = 'theme_preference'`

其中：

- `themePreference` 表示用户显式选择
- `resolvedTheme` 表示结合系统环境后实际渲染到页面上的主题

### 2. 主题优先级

优先级固定为：

1. 用户手动选择 `light`
2. 用户手动选择 `dark`
3. 用户选择 `system` 时跟随系统 `prefers-color-scheme`

也就是说：

- 只有 `themePreference === 'system'` 才监听系统主题变化
- 用户手动切换后，系统主题变化不再覆盖用户意图

### 3. 顶部入口策略

顶部导航不是简单的二元按钮，而是承载三态主题入口：

- 浅色
- 深色
- 跟随系统

入口位于 `src/components/layout/AppHeader.vue` 右侧工具区，与通知和用户菜单同级。

### 4. 真相源策略

本次统一采用“Token 真相源 + 主题解析器”的方案：

- 主题状态由 `App Store` 管理
- 主题解析与系统监听由独立工具模块管理
- 样式消费统一走语义 token
- 图表 palette 不再写死颜色，而是通过主题 palette 生成

## 架构设计

### 一、主题状态与解析器

#### 目标文件

- `src/stores/modules/app.ts`
- `src/utils/themeMode.ts`（新增）
- `src/main.ts`

#### 职责划分

`App Store` 负责：

- 保存 `themePreference`
- 保存 `resolvedTheme`
- 提供设置偏好、刷新解析态、初始化主题的 action
- 在 `resetState()` 中保留主题相关字段，不让会话重置误伤持久化偏好

`themeMode.ts` 负责：

- 定义主题枚举与类型
- 解析 `themePreference` 对应的最终主题
- 监听 `prefers-color-scheme: dark`
- 将最终主题写入 `document.documentElement.dataset.theme`
- 必要时同步 `color-scheme`，让原生滚动条与浏览器控件语义一致

`main.ts` 负责：

- 在应用 mount 前尽早执行主题初始化
- 让首屏直接以最终主题渲染，避免出现浅色闪屏

#### 首屏预注入协议

只在 `src/main.ts` 中初始化还不够，因为浏览器会先渲染 `index.html`，再执行 `src/main.ts`。为了真正避免“先亮后暗”闪动，需要补一条首屏预注入协议：

- 在 `index.html` 中加入极小的内联脚本
- 脚本只负责：
  1. 读取 `localStorage['theme_preference']`
  2. 当偏好为 `system` 或不存在时，读取 `matchMedia('(prefers-color-scheme: dark)')`
  3. 立即把解析结果写入 `document.documentElement.dataset.theme`
- `src/main.ts` 启动后再由 Store 与 `themeMode.ts` 正式接管状态、监听器和 DOM 同步

这样可以确保：

- 首屏静态 HTML 直接按最终主题渲染
- 应用 mount 后不会再闪一次
- 401、登出、刷新都不会让主题偏好丢失

### 二、根节点主题标识

根节点使用：

- `document.documentElement.dataset.theme = 'light' | 'dark'`

不直接把 `system` 写到 DOM 上，而是只写解析后的结果。这样 CSS 层永远只面对两种实际主题，避免样式分支膨胀。

### 三、语义 token 体系

#### 目标文件

- `src/assets/styles/variables.scss`

#### 改造原则

把当前浅色专用变量扩展为一套完整语义 token：

- 页面背景
- 壳层背景
- 实体卡片背景
- 浮层背景
- 主文字 / 次文字 / 占位文字
- 软边框 / 强边框
- 玻璃阴影 / 实体阴影
- 焦点环
- 强调色
- 图表主色板

同时补齐 tone 家族，承接当前仓库已经存在的多语义配色：

- `brand`
- `info`
- `success`
- `warning`
- `danger`

每个 tone 至少提供：

- `text`
- `text-strong`
- `surface`
- `surface-strong`
- `border`
- `solid`

结构建议：

- `:root`：浅色 token
- `[data-theme='dark']`：深色 token

这样页面 hero、badge、提示卡片、统计卡片、告警面板、图表强调色都可以共享同一套真相源。

### 四、Element Plus 主题适配

#### 目标文件

- `src/assets/styles/element-override.scss`

#### 改造原则

以下组件清单已按 `src/plugins/elementPlus.ts` 的注册项与 `src/**/*.vue` 中实际使用的 `el-*` 标签交叉校对到当前仓库粒度。

让 Element Plus 组件库直接消费语义 token，至少覆盖：

- `el-aside`
- `el-avatar`
- `el-button`
- `el-alert`
- `el-card`
- `el-date-picker`
- `el-descriptions`
- `el-empty`
- `el-form`
- `el-form-item`
- `el-image`
- `el-input`
- `el-input-number`
- `el-icon`
- `el-select`
- `el-option`
- `el-radio-group`
- `el-radio-button`
- `el-table`
- `el-table-column`
- `el-dialog`
- `el-dropdown`
- `el-badge`
- `el-tag`
- `el-menu`
- `el-tooltip`
- `el-scrollbar`
- `el-breadcrumb`
- `el-breadcrumb-item`
- `el-pagination`
- `el-tree`
- `el-tree-select`
- `el-timeline`
- `el-timeline-item`
- `el-upload`
- `el-menu-item`
- `el-dropdown-menu`
- `el-dropdown-item`
- `el-descriptions-item`

以及程序化 / 浮层能力：

- `ElMessage`
- `ElMessageBox`
- `ElLoadingDirective`

校对基线以两类真相源为准：

- `src/plugins/elementPlus.ts` 中实际注册的组件与能力
- `src/**/*.vue` 中实际使用的 `el-*` 标签

要求：

- 夜间模式下控件背景、边框、文字、hover 与 focus 一致
- disabled、popper、空状态与日期面板也必须同步走 token
- message、message box、loading mask、image viewer、dropdown/popper 等程序化浮层也必须同步走 token
- 不出现“页面已暗、组件仍亮”的视觉割裂

### 五、布局与页面壳层适配

#### 布局与公共组件

- `src/components/layout/AppHeader.vue`
- `src/components/layout/AppSidebar.vue`
- `src/components/layout/AppBreadcrumb.vue`
- `src/components/layout/ConsoleFeedbackSurface.vue`
- `src/layouts/DefaultLayout.vue`
- `src/layouts/AuthLayout.vue`
- `src/layouts/BlankLayout.vue`

要求：

- 清除硬编码浅色背景与边框
- 所有壳层背景、玻璃面板、强调块、图标按钮都改走 token
- 主题切换时壳层颜色和阴影同步切换

#### 页面层策略

业务页面不允许继续写死：

- `#fff`
- 浅色专用 `rgba(255, 255, 255, ...)`
- 只适合浅色底的品牌色文字

改造方式：

- 把页面背景、卡片背景、标签、提示面板、辅助色统一切到 token
- 颜色热点文件按业务域分批清理，但必须一次性覆盖所有用户可见页面

为了保证“全站一期”不是只覆盖示例热点，本次执行范围统一按目录收口：

- `src/views/**/*.vue`
- `src/components/common/**/*.vue`
- `src/components/form/**/*.vue`
- `src/components/business/**/*.vue`
- `src/components/layout/**/*.vue`
- `src/layouts/**/*.vue`
- `src/assets/styles/**/*.scss`

同时把 `index.html` 纳入首屏主题预注入的一期范围。

执行前必须先做一轮硬编码颜色扫描，再把扫描结果并入实施计划清单，避免漏掉真实可见页面。

### 六、图表主题适配

#### 目标文件

- `src/views/statistics/chartOptions.ts`
- `src/views/statistics/SharedChartPanel.vue`

#### 设计原则

图表颜色由主题 palette 生成，而不是分散在各个 option 函数里写死。

建议在 `chartOptions.ts` 内抽出：

- `getChartThemeTokens(theme: 'light' | 'dark')`

由它统一返回：

- 文本色
- 坐标轴色
- grid 分隔线色
- tooltip 背景 / 边框 / 文字色
- legend 文字色
- 柱状图色板
- 折线图色板
- 热力图 visualMap 色板

统计页页面层必须显式依赖 `resolvedTheme` 重新生成 option：

- `computed` 中的 option 生成逻辑必须读取最终主题
- `SharedChartPanel.vue` 的面板背景与图表 option 同步切换
- 不能只换容器背景，不换 tooltip、legend、坐标轴与 visualMap

这样浅色 / 深色切换时，只需要替换 palette，而不必逐张图重写逻辑。

### 七、跟随系统行为

当 `themePreference === 'system'` 时：

- 首次进入按系统主题解析 `resolvedTheme`
- 注册 `matchMedia('(prefers-color-scheme: dark)')` 监听
- 系统主题变化后实时刷新 `resolvedTheme` 与根节点主题标识

当 `themePreference !== 'system'` 时：

- 不再响应系统变化
- 只保留用户手动选择的最终主题

## 文件边界建议

### 新增文件

- `src/utils/themeMode.ts`

### 核心修改文件

以下列表是当前已确认的首批热点与高风险文件，不代表全量边界；真正执行范围仍以前文的目录级范围与硬编码颜色扫描结果为准。

- `index.html`
- `src/stores/modules/app.ts`
- `src/main.ts`
- `src/assets/styles/variables.scss`
- `src/assets/styles/element-override.scss`
- `src/assets/styles/reset.scss`
- `src/assets/styles/_auth-pages.scss`
- `src/components/common/EmptyState.vue`
- `src/components/common/SearchBar.vue`
- `src/components/form/DeviceForm.vue`
- `src/components/form/ReservationForm.vue`
- `src/components/layout/AppHeader.vue`
- `src/components/layout/AppSidebar.vue`
- `src/components/layout/AppBreadcrumb.vue`
- `src/components/layout/ConsoleFeedbackSurface.vue`
- `src/layouts/DefaultLayout.vue`
- `src/layouts/AuthLayout.vue`
- `src/layouts/BlankLayout.vue`
- `src/views/ai/Chat.vue`
- `src/views/ai/History.vue`
- `src/views/user/Profile.vue`
- `src/views/user/List.vue`
- `src/views/user/Detail.vue`
- `src/views/user/Freeze.vue`
- `src/views/user/RoleAssign.vue`
- `src/views/statistics/SharedChartPanel.vue`
- `src/views/statistics/chartOptions.ts`
- `src/views/statistics/Overview.vue`
- `src/views/statistics/DeviceUsage.vue`
- `src/views/statistics/BorrowStats.vue`
- `src/views/statistics/OverdueStats.vue`
- `src/views/statistics/HotTimeSlots.vue`
- `src/views/auth/Login.vue`
- `src/views/auth/components/PasswordResetPanel.vue`

除以上热点外，`src/views/reservation/**/*.vue`、`src/views/device/**/*.vue`、`src/views/overdue/**/*.vue`、`src/views/notification/**/*.vue` 等用户可见目录也都在本次全站覆盖范围内，执行时必须根据扫描结果一并纳入清单。

## 测试策略

### 单元测试

至少补齐：

- `src/stores/__tests__/app.spec.ts`
  - 三态主题偏好
  - `resolvedTheme` 解析规则
  - `system` 模式下的系统变化响应
- `src/components/layout/__tests__/AppHeader.spec.ts`
  - 顶部主题入口展示
  - 三态切换行为
- `src/views/statistics/__tests__/chartOptions.spec.ts`
  - 图表 palette 在浅色 / 深色下的输出差异

必要时补：

- 布局壳层主题标识相关测试
- 关键页面（AI / 用户域）最小主题回归测试

### 构建与浏览器验证

必须执行：

- `npm run type-check`
- `npm run build`

浏览器级回归至少覆盖：

- 浅色 / 深色 / 跟随系统三态
- 顶部导航与侧栏
- 认证页
- 用户域页面
- AI 页面
- 统计图表页面
- 表格、卡片、对话框、下拉菜单

## 风险与注意事项

1. 页面层硬编码颜色较多，若不先统一 token，再逐页改色会快速失控
2. 图表 palette 是全站主题体验的高风险点，不能只改卡片背景不改图表色
3. `system` 模式必须处理监听注册与注销，否则容易造成重复监听或状态漂移
4. 主题初始化必须足够早，否则刷新时会出现明显闪色

## 验收标准

1. 顶部入口支持 `浅色 / 深色 / 跟随系统` 三态
2. 用户偏好可持久化，刷新后保持一致
3. `system` 模式下能正确跟随系统主题变化
4. 所有页面、表格、卡片、图表与认证页都能切换到深色语义
5. 不再残留明显的浅色硬编码破坏夜间模式体验
6. 主题相关单元测试、类型检查与生产构建通过
