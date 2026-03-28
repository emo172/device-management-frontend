# 控制台导航布局重构设计

## 背景

当前默认业务布局已经具备“两列骨架 + 右侧头部/主内容”的基础能力，但仍属于过渡结构：

- `src/layouts/DefaultLayout.vue` 负责默认业务壳层
- `src/components/layout/AppSidebar.vue` 负责扁平导航菜单
- `src/components/layout/AppHeader.vue` 负责通知、个人信息与面包屑
- `src/components/layout/AppBreadcrumb.vue` 直接基于 `route.matched` 渲染页面路径

现状已经具备基础导航能力，但与本次确认的目标仍有明显差距：

1. 虽然当前已经有左侧侧栏与右侧内容区，但还没有形成参考图那种“左列整列通高，右列内部再分顶部导航与内容区”的控制台骨架
2. 左侧导航仍是扁平菜单，无法承载按业务域分组的一二级信息架构
3. 顶部区域虽然已有面包屑，但还不能明确表达“当前导航上下文 + 当前页面标题”的页面头语义
4. 页面纵向滚动边界不够明确，后续继续扩展页面时容易出现整页滚动与局部滚动混杂

本次改造目标不是修改业务路由、接口或权限规则，而是在保留现有业务域、角色边界、路由路径和页面主体实现的前提下，重构默认布局壳层与左侧导航体系，让控制台结构更接近用户确认的参考图。

## 实施前置条件

- 本次改造必须基于 `main` 创建独立功能分支与工作树实施
- 当前已落实的工作方式为：从 `main` 创建 `feature/navigation-layout-shell`，并在 `.worktrees/feature/navigation-layout-shell` 中开发
- 后续实现、验证与文档更新均在该独立工作树内完成，避免污染主工作区

## 已确认的设计结论

### 1. 布局骨架

- 默认布局对齐参考图，采用“左侧整列通高侧栏 + 右侧区域内部顶部导航栏 + 右侧主内容区”的结构
- 不照搬参考图的深色主题，继续沿用项目现有的浅色分层控制台视觉方向

### 2. 左侧导航方向

- 左侧导航改为多级菜单，支持一级业务分组与二级页面入口
- 左侧保留品牌区、菜单区、底部会话/角色区三段式结构
- 菜单过长时，仅左侧菜单区内部滚动，品牌区与底部信息区保持固定

### 3. 顶部导航方向

- 顶部导航位于右侧内容区域内部，而不是整页最上方横跨全宽
- 顶部左侧显示“面包屑 + 当前页面标题”
- 顶部右侧保留唯一的侧栏折叠入口、通知入口与用户会话操作

### 4. 滚动规则

- 默认布局外层锁定视口高度，避免 `body` 参与业务页纵向滚动
- 右侧主内容区作为默认业务页面的主要纵向滚动容器
- 左侧仅菜单区允许内部滚动

## 设计目标

1. 让默认控制台从“脚手架式布局”升级为稳定的产品级控制台骨架
2. 用多级导航取代当前扁平菜单，提升业务域分组与页面定位能力
3. 让顶部导航明确表达“当前在哪个业务域、当前在处理哪个页面”
4. 收口纵向滚动边界，减少布局层与页面层的滚动冲突
5. 在不改变角色权限、路由路径和业务功能的前提下完成结构升级

## 范围

### 本次包含

- 重构 `DefaultLayout` 为“左列整列通高 + 右列内部头部/内容”结构
- 将 `AppSidebar` 从扁平菜单改为分组式两级导航
- 调整 `AppHeader` 与 `AppBreadcrumb`，让顶部区域显示导航上下文与页面标题
- 抽离共享导航配置，避免左侧菜单、头部上下文与路由标题各维护一套口径
- 补齐与布局职责、导航分组、滚动边界相关的中文注释
- 更新布局与导航相关单元测试

### 本次不包含

- 路由路径调整
- 页面业务内容重写
- 接口、Store 业务行为修改
- 深色模式或主题切换
- 移动端适配
- 新增三级以上导航层级

## 信息架构

### DefaultLayout

`src/layouts/DefaultLayout.vue` 调整为两列总骨架：

- 左列固定宽度，整列承接 `AppSidebar`
- 右列内部再拆分为顶部导航区和主内容视口
- 主内容视口只负责承接业务页面内容，不再额外包一层会制造双滚动的壳层

该布局需要把“视口高度控制”和“滚动边界控制”都收口在布局层，而不是交给业务页各自决定。

### AppSidebar

`src/components/layout/AppSidebar.vue` 从扁平数组升级为树形导航：

- 顶部品牌区：展示系统名称、品牌缩写与会话入口基调
- 中部菜单区：使用一级业务分组 + 二级页面入口的两级结构
- 底部状态区：继续承接当前角色提示与折叠态下的紧凑信息，不再放置第二个折叠按钮

导航树遵循以下规则：

- 一级分组表达业务域，例如“工作台”“预约业务”“设备与资产”“系统管理”
- 二级菜单项只承接真正需要作为导航入口的列表页/主页面
- 详情页、编辑页、确认页、处理页不直接出现在左侧导航中，只通过面包屑表达层级
- 当前路由命中某个子页面时，所属分组自动展开并高亮当前菜单项

#### 导航信息架构表

| 一级分组 | 二级菜单 | 路径 | 可见角色 | 默认展开规则 | 导航可见性 |
| --- | --- | --- | --- | --- | --- |
| 工作台 | 仪表盘 | `/dashboard` | 所有已登录角色 | 当前命中分组时展开 | 左侧可见 |
| 工作台 | 通知中心 | `/notifications` | 所有已登录角色 | 当前命中分组时展开 | 左侧可见 |
| 工作台 | 个人中心 | `/profile` | 所有已登录角色 | 当前命中分组时展开 | 左侧可见 |
| 预约业务 | 我的预约 | `/reservations` | `USER` | 当前命中分组时展开 | 左侧可见 |
| 预约业务 | 预约管理 | `/reservations` | `DEVICE_ADMIN` / `SYSTEM_ADMIN` | 当前命中分组时展开 | 左侧可见 |
| 预约业务 | 预约审核 | `/reservations/manage/pending` | `DEVICE_ADMIN` / `SYSTEM_ADMIN` | 当前命中分组时展开 | 左侧可见 |
| 预约业务 | 审批历史 | `/reservations/manage/history` | `DEVICE_ADMIN` / `SYSTEM_ADMIN` | 当前命中分组时展开 | 左侧可见 |
| 预约业务 | 创建预约 | `/reservations/create` | `USER` / `SYSTEM_ADMIN` | 跟随所属分组 | 仅面包屑 |
| 预约业务 | 预约详情 | `/reservations/:id` | 所有已登录角色 | 跟随所属分组 | 仅面包屑 |
| 预约业务 | 预约签到 | `/reservations/:id/check-in` | 所有已登录角色 | 跟随所属分组 | 仅面包屑 |
| 设备与资产 | 设备中心 | `/devices` | 所有已登录角色 | 当前命中分组时展开 | 左侧可见 |
| 设备与资产 | 分类管理 | `/devices/categories` | `DEVICE_ADMIN` | 当前命中分组时展开 | 左侧可见 |
| 设备与资产 | 新建设备 | `/devices/create` | `DEVICE_ADMIN` | 跟随所属分组 | 仅面包屑 |
| 设备与资产 | 编辑设备 | `/devices/:id/edit` | `DEVICE_ADMIN` | 跟随所属分组 | 仅面包屑 |
| 设备与资产 | 设备详情 | `/devices/:id` | 所有已登录角色 | 跟随所属分组 | 仅面包屑 |
| 设备与资产 | 借还记录 | `/borrows` | `USER` | 当前命中分组时展开 | 左侧可见 |
| 设备与资产 | 借还管理 | `/borrows` | `DEVICE_ADMIN` | 当前命中分组时展开 | 左侧可见 |
| 设备与资产 | 借用确认 | `/borrows/confirm` | `DEVICE_ADMIN` | 跟随所属分组 | 仅面包屑 |
| 设备与资产 | 归还确认 | `/borrows/return` | `DEVICE_ADMIN` | 跟随所属分组 | 仅面包屑 |
| 设备与资产 | 借还详情 | `/borrows/:id` | `USER` / `DEVICE_ADMIN` | 跟随所属分组 | 仅面包屑 |
| 设备与资产 | 逾期记录 | `/overdue` | `USER` | 当前命中分组时展开 | 左侧可见 |
| 设备与资产 | 逾期管理 | `/overdue` | `DEVICE_ADMIN` | 当前命中分组时展开 | 左侧可见 |
| 设备与资产 | 逾期详情 | `/overdue/:id` | `USER` / `DEVICE_ADMIN` | 跟随所属分组 | 仅面包屑 |
| 设备与资产 | 逾期处理 | `/overdue/:id/handle` | `DEVICE_ADMIN` | 跟随所属分组 | 仅面包屑 |
| 智能助手 | AI 对话 | `/ai` | `USER` | 当前命中分组时展开 | 左侧可见 |
| 智能助手 | AI 历史会话 | `/ai/history` | `USER` | 当前命中分组时展开 | 左侧可见 |
| 统计分析 | 统计分析 | `/statistics` | `SYSTEM_ADMIN` | 当前命中分组时展开 | 左侧可见 |
| 统计分析 | 设备利用率分析 | `/statistics/device-usage` | `SYSTEM_ADMIN` | 当前命中分组时展开 | 左侧可见 |
| 统计分析 | 借用统计分析 | `/statistics/borrow` | `SYSTEM_ADMIN` | 当前命中分组时展开 | 左侧可见 |
| 统计分析 | 逾期统计分析 | `/statistics/overdue` | `SYSTEM_ADMIN` | 当前命中分组时展开 | 左侧可见 |
| 统计分析 | 热门时段分析 | `/statistics/hot-time-slots` | `SYSTEM_ADMIN` | 当前命中分组时展开 | 左侧可见 |
| 系统管理 | 用户管理 | `/users` | `SYSTEM_ADMIN` | 当前命中分组时展开 | 左侧可见 |
| 系统管理 | 用户详情 | `/users/:id` | `SYSTEM_ADMIN` | 跟随所属分组 | 仅面包屑 |
| 系统管理 | 角色权限 | `/admin/roles` | `SYSTEM_ADMIN` | 当前命中分组时展开 | 左侧可见 |
| 系统管理 | Prompt 模板 | `/admin/prompt-templates` | `SYSTEM_ADMIN` | 当前命中分组时展开 | 左侧可见 |

### AppHeader

`src/components/layout/AppHeader.vue` 的左侧改为页面上下文区：

- 第一行展示面包屑
- 第二行展示当前页面标题
- 右侧保留通知、用户菜单和唯一的侧栏折叠入口

顶部不再只是工具条，而是承担“当前导航上下文说明”的页面头职责。

### AppBreadcrumb

`src/components/layout/AppBreadcrumb.vue` 调整为纯展示组件，面包屑上下文拼装收口到 `src/components/layout/navigation.ts` 与 `src/components/layout/AppHeader.vue`：

- 导航配置负责补充一级分组标题与可见二级菜单标题
- `route.matched` 继续提供详情页、编辑页、处理页等非导航页标题
- `AppHeader.vue` 负责组装最终面包屑项并传给 `AppBreadcrumb.vue`
- `AppBreadcrumb.vue` 只负责渲染传入的面包屑项，避免在展示组件内重复维护路由解析逻辑

顶部标题与面包屑需要遵循统一的文案优先级，避免同一路径在不同角色下出现“左侧菜单名、顶部标题、路由标题”三套口径：

1. `pageTitle`
   - 当前路由命中左侧可见菜单时，优先使用当前导航项标题
   - 对 `/reservations`、`/borrows`、`/overdue` 这类同一路径但角色文案不同的页面，顶部标题以当前角色可见的导航项标题为准
   - 当前路由为仅面包屑页时，使用 `route.meta.title`
2. `breadcrumb`
   - 第一层为一级业务分组标题
   - 第二层优先为当前激活的左侧菜单标题
   - 若当前页不是左侧菜单项，则追加 `route.meta.title` 作为最后一级

## 导航数据模型

为了避免 `AppSidebar`、`AppHeader`、`AppBreadcrumb` 重复维护标题与分组口径，本次引入一份共享导航配置。

建议的配置职责如下：

- 定义业务分组标题
- 定义每个分组下的二级菜单项标题、路径、图标、角色可见性
- 提供“由当前路由反查所属分组和当前导航项”的能力
- 提供隐藏页回溯到所属菜单的匹配规则

该共享配置不替代路由 `meta.roles` 和 `meta.title`：

- 路由 `meta.roles` 仍是真正的访问控制依据
- 路由 `meta.title` 仍是页面级标题真相源
- 导航配置负责“哪些页面出现在左侧导航里、它属于哪个业务分组，以及菜单级标题文案”

这样可以保证：

1. 权限控制继续由路由守卫负责
2. 左侧导航与顶部上下文共享同一套业务分组口径
3. 详情页不强行进入左侧导航，但顶部仍能显示完整上下文

建议配置字段包含：

- `groupTitle`：一级分组标题
- `items[].title`：二级菜单标题，允许按角色呈现不同文案
- `items[].path`：左侧点击后跳转的主路径
- `items[].roles`：可见角色
- `items[].matchRouteNames`：用于详情/编辑/处理页回溯到所属菜单
- `items[].matchPathPatterns`：兜底处理需要按路径前缀或动态段匹配的页面
- `items[].icon`：导航图标

可参考的匹配示例：

- `预约管理` 菜单项使用 `matchRouteNames: ['ReservationCreate', 'ReservationDetail', 'ReservationCheckIn']`
- `设备中心` 菜单项使用 `matchPathPatterns: ['/devices/:id', '/devices/:id/edit', '/devices/create']`

## 滚动与容器规则

### 默认规则

- `DefaultLayout` 外层壳层使用视口高度约束，默认业务页不再依赖浏览器页面纵向滚动
- `AppSidebar` 只有菜单区允许 `overflow-y: auto`
- 右侧主内容视口使用 `overflow-y: auto`

### 页面级约束

- 业务页默认不再自行创建新的“整页级纵向滚动容器”
- 表格横向滚动、图表局部容器或聊天消息列表等确有必要的局部容器可保留局部滚动，但不能与布局层抢占整页滚动职责
- 实施时需要重点复核 `src/views/borrow/List.vue`、`src/views/overdue/List.vue`、`src/views/ai/Chat.vue` 等已存在局部滚动样式的页面，避免产生嵌套滚动体验

## 组件与文件边界

### 计划修改文件

- `src/layouts/DefaultLayout.vue`
  - 改造默认业务壳层骨架与主滚动视口
- `src/components/layout/AppSidebar.vue`
  - 改造为多级导航、分组结构和新视觉样式
- `src/components/layout/AppHeader.vue`
  - 重构顶部上下文区，显示面包屑与页面标题
- `src/components/layout/AppBreadcrumb.vue`
  - 调整为纯展示组件，接收 `AppHeader.vue` 传入的共享导航上下文
- `src/stores/modules/app.ts`
  - 继续复用并验证侧栏折叠状态，不新增无必要的全局 UI 状态
- `src/__tests__/App.spec.ts`
  - 更新默认布局结构断言
- `src/components/layout/__tests__/AppSidebar.spec.ts`
  - 增加分组渲染、展开态与当前路由高亮断言
- `src/components/layout/__tests__/AppHeader.spec.ts`
  - 增加页面标题与面包屑上下文断言，并覆盖同路径不同角色标题场景
- `src/components/layout/__tests__/AppBreadcrumb.spec.ts`
  - 校验纯展示组件对传入面包屑项的渲染逻辑

### 计划新增文件

- `src/components/layout/navigation.ts`（命名可在实施阶段微调）
  - 承接共享导航树配置、角色可见性过滤与当前路由反查能力

## 视觉规则

### 左侧侧栏

- 延续浅色控制台基调，使用比主内容更稳定的浅面板承接导航
- 一级分组强调层次但不过度抢戏，避免接近后台模板的僵硬目录感
- 当前激活菜单使用胶囊态或浅琥珀色高亮，与当前品牌色体系保持一致
- 折叠态下仅保留图标与悬浮提示，一级分组标题改为收起，不保留第二个折叠按钮

### 顶部导航区

- 顶部保持轻实体感和高可读性，不走深色悬浮栏路线
- 面包屑作为辅助导航信息，标题作为主视觉焦点
- 工具按钮与用户区延续现有交互习惯，降低改版后的学习成本

### 右侧内容区

- 右侧主内容区延续现有卡片、图表、列表的浅色实体面板方向
- 布局重构只改变壳层和页面头，不强制重写各业务页内部视觉语言

## 测试与影响面

本次改造不改变以下行为：

- 路由访问权限仍由 `meta.roles` 与路由守卫控制
- 通知未读数轮询、个人信息下拉、退出登录等头部行为保持不变
- 侧栏折叠状态仍由 `useAppStore` 持久化维护

需要同步关注的测试与验证点：

- `src/__tests__/App.spec.ts` 依赖默认布局骨架类名
- `src/components/layout/__tests__/AppSidebar.spec.ts` 需要从扁平菜单断言升级为分组式导航断言
- `src/components/layout/__tests__/AppHeader.spec.ts` 需要覆盖面包屑与页面标题同时存在的结构
- `src/components/layout/__tests__/AppBreadcrumb.spec.ts` 需要覆盖传入面包屑项的展示差异
- 实现完成后至少运行 `npm run test:unit`、`npm run type-check`、`npm run build`

## 验收标准

1. 默认业务布局改为“左侧整列通高侧栏 + 右侧内部顶部导航栏 + 右侧主内容区”结构
2. 左侧导航支持一级业务分组与二级页面入口，且按角色严格裁剪可见项
3. 顶部导航明确显示面包屑与当前页面标题
4. 详情页、编辑页、处理页等非导航页不进入左侧菜单，但顶部上下文仍完整
5. 左侧仅菜单区内部滚动，右侧主内容区承担默认业务页的主要纵向滚动职责
6. 布局、导航与测试修改范围内补齐必要中文注释
