# AGENTS.md - 设备管理前端项目

本文档用于指导本仓库内的 Agentic Coding Agents 统一开展前端设计、开发、测试、联调与文档维护工作。

---

## 01 语言设置

- **回答语言**: 中文（简体）
- 所有 AI 文档、说明统一使用中文（简体）
- 项目中的代码、组件、配置与模板都必须纳入中文注释治理范围；对新增、修改、维护时触达的业务规则、接口调用、状态展示、权限控制、关键流程与复杂逻辑，必须补齐与复杂度匹配的中文（简体）注释，且必须根据代码内容选择匹配的注释格式
- **回答前缀**: 每次回答之前加 `喵`
- **回答后缀**: 回答完成之后加 `喵喵`

---

## 02 真相源与冲突仲裁

### 02-1 资料真相源

前端实现、计划与文档维护时，默认以下资料为真相源：

1. `系统功能设计/` 目录下的 13 份系统设计文档
2. `前端项目目录结构.md`
3. `后端项目目录结构.md`
4. `device_management.sql`
5. 后端仓库 `device-management-backend` 的实际 Controller、DTO、Entity、枚举代码（用于判断真实接口契约）
6. 当前仓库实际文件结构（仅用于判断已有实现、依赖现状与配置现状）

### 02-2 冲突处理规则

当资料之间出现不一致时，按以下顺序仲裁：

1. **不做项 / 范围边界**
2. **后端仓库实际代码**（接口路径、HTTP 方法、请求体字段名/类型、响应体结构、鉴权方式）
3. **`device_management.sql`**（角色、审批模型、表结构、字段、枚举、种子数据）
4. **API 文档与前端项目目录结构**（页面路由、组件划分、Store 设计、联调承载）
5. **其余系统设计文字说明与图示**

> 说明：前端以后端实际接口为最终联调依据。若发现后端实际接口与 API 文档不一致，以后端代码为准并记录差异。

### 02-3 SQL 优先仲裁项

以下内容若与旧文档冲突，统一以 `device_management.sql` 为准：

- 角色体系为 `USER` / `DEVICE_ADMIN` / `SYSTEM_ADMIN` 三角色，而非旧文档中的 `USER` / `ADMIN`
- 预约支持 `DEVICE_ONLY` 与 `DEVICE_THEN_SYSTEM` 两种审批模式
- 预约状态为 `PENDING_DEVICE_APPROVAL` / `PENDING_SYSTEM_APPROVAL` / `PENDING_MANUAL` / `APPROVED` / `REJECTED` / `CANCELLED` / `EXPIRED`
- 存在正式表 `reservation_batch`，批量预约不是临时扩展功能
- `notification_record` 已包含 `channel`、`read_flag`、`read_at`、`template_vars`、`retry_count`、`related_id`、`related_type`
- 通知渠道为 `IN_APP` / `EMAIL` / `SMS`，其中已读能力仅对 `IN_APP` 生效
- 统计模型使用 `stat_type` / `granularity` / `subject_type` / `subject_value`

### 02-4 接口与数据真相源

- **统一响应格式**: `{ code: 0|1, message: string, data: T }`，`code === 0` 表示成功
- **分页响应**: 由各模块 DTO 自行包含 `{ total: number, records: T[] }`，嵌套在 `data` 中
- **主键类型**: 统一 `string`（UUID），严禁在代码、类型定义或组件中使用 `number` 作为 ID 类型假设
- **认证方式**: `Authorization: Bearer <access_token>`
- **时间格式**: 后端 `LocalDateTime` 序列化为 ISO 格式 `2024-01-01T10:00:00`，前端发送时也必须使用此格式
- **分页参数**: `page`（从 1 开始）、`size`（默认 10），作为 query params
- **文件上传**: `multipart/form-data`，字段名 `file`
- **术语与状态**: 必须遵循分域状态集，禁止脱离业务域解释 `PENDING`、`BORROWED`、`FAILED` 等同码状态

### 02-5 文档同步要求

出现以下变更时，必须同步更新相关文档：

- 后端接口路径、HTTP 方法、请求体、响应体变更导致前端需要调整
- 前端路由、页面组件、Store 结构的重大调整
- 枚举值新增或变更
- 前后端联调过程中发现的接口差异与适配方案

若发现资料冲突且无法直接裁决，统一使用以下格式记录：

> [!question]+ 待业务确认（含位置与原因）
>
> - **冲突位置**: 章节或文件位置
> - **冲突原因**: 具体矛盾点
> - **相关条目**: 相关需求 / API / 页面
> - **建议方案**: 候选处理方案

---

## 03 Git 分支管理

### 03-1 核心原则

- 禁止直接在 `main` 分支开发，所有开发任务必须在功能分支完成
- 默认按功能闭环提交，避免"半个模块"长时间悬挂
- 未经用户明确要求，不主动执行提交、合并、推送等 Git 写操作
- 若目标文件已存在未提交本地修改，优先在现有修改基础上增量调整，不得直接覆盖用户内容

### 03-2 分支命名规范

```bash
# 功能开发
feature/模块名称
feature/device-management

# 缺陷修复
fix/问题描述
fix/login-token-expire

# 重构
refactor/模块名称
```

### 03-3 本地开发流程

```bash
# 1) 基于 main 创建新分支
git checkout main
git pull
git checkout -b feature/xxx

# 2) 开发并提交
git add .
git commit -m "feat(auth): 新增 xxx 功能"

# 3) 合并前必须通过类型检查和构建
npm run type-check
npm run build
```

### 03-4 提交信息规范

```text
<type>(<scope>): <subject>
```

常用类型：`feat`、`fix`、`refactor`、`test`、`docs`、`chore`、`style`。

常用 scope：`auth`、`device`、`reservation`、`borrow`、`overdue`、`ai`、`notification`、`statistics`、`admin`、`layout`、`router`、`store`、`api`、`common`。

---

## 04 项目定位与范围边界

### 04-1 项目目标

本项目是"智能设备管理系统"前端，核心覆盖以下功能模块：

- 用户认证（登录、注册、密码找回与重置）
- 用户与权限管理（系统管理员）
- 设备与设备分类管理
- 预约管理（创建、审核、签到、人工处理）
- 借还管理（借用确认、归还确认）
- 逾期管理（查看、处理）
- 智能 AI 对话
- 统计分析（图表展示）
- 通知中心（站内信）
- 角色权限配置与 Prompt 模板管理

### 04-2 本期不做项

以下内容默认不在本期范围内：

- 移动端适配 / 响应式布局（仅保证桌面端体验）
- 微信通知、日历同步、国际化多语言
- Excel / PDF 文件导出
- Safari / 移动端语音录音支持（v1 发布阻塞浏览器仅桌面 Chrome / Edge）
- SSE / WebSocket 实时消息推送（通知采用轮询方式）
- 深色模式 / 主题切换
- 离线缓存 / PWA 能力

### 04-3 AI 功能边界

- 本期 AI 已支持文本对话、语音输入转写与历史回复播报，语音 v1 仅以桌面 Chrome / Edge 作为发布阻塞浏览器范围
- 语音能力受后端 `speech.enabled` 开关控制，关闭或浏览器不支持时必须优雅回退到文字输入与历史查看
- 语音录音会交由第三方云语音服务处理，原始录音不做持久化存储；历史播放按需基于 `chat_history.aiResponse` 生成
- 第三方云语音的合规 / 隐私审批是上线前置条件，文档同步不代表审批已完成
- AI 对话仅对 `USER` 角色开放，`DEVICE_ADMIN` 和 `SYSTEM_ADMIN` 无法访问
- AI 意图固定为 `RESERVE` / `QUERY` / `CANCEL` / `HELP` / `UNKNOWN`

---

## 05 工程现状与目标基线

### 05-1 当前仓库现状

- 当前项目由 `create-vue` 脚手架生成，仅有初始化骨架代码
- 已配置 Vue 3 + TypeScript + Pinia + Vue Router + Vite + Vitest
- `src/router/index.ts` 路由表为空数组
- 无 Store、无 API 层、无页面组件、无 UI 库、无样式系统
- `@` 路径别名已配置
- Prettier 已配置（无分号、单引号、100 字符宽度）

### 05-2 目标工程基线

| 技术         | 版本基线 | 说明                           |
| ------------ | -------- | ------------------------------ |
| Vue          | 3.5.x    | 前端框架，使用 Composition API |
| TypeScript   | 5.9.x    | 类型系统                       |
| Vite         | 7.x      | 构建工具                       |
| Element Plus | Latest   | UI 组件库                      |
| Pinia        | 3.x      | 状态管理                       |
| Vue Router   | 5.x      | 路由管理                       |
| Axios        | Latest   | HTTP 请求库                    |
| ECharts      | Latest   | 统计图表                       |
| SCSS         | Latest   | CSS 预处理器                   |
| NProgress    | Latest   | 路由加载进度条                 |

> 强约束：除非用户明确要求，不主动变更脚手架已有配置（tsconfig、prettier、vitest 等）。

### 05-3 分层与目录约定

项目按以下结构组织：

```text
src/
├── api/              # API 接口模块（按业务域分目录，每目录含 index.ts + types.ts）
├── assets/           # 静态资源（images/、styles/、fonts/）
├── components/       # 公共组件（common/、layout/、business/、form/）
├── composables/      # 组合式函数
├── constants/        # 常量定义
├── directives/       # 自定义指令
├── enums/            # 枚举定义（与后端保持一致）
├── layouts/          # 页面布局组件
├── router/           # 路由配置（按业务域拆分 modules/）
├── stores/           # Pinia 状态管理（按业务域拆分 modules/）
├── types/            # 全局类型定义
├── utils/            # 工具函数
└── views/            # 页面视图（按业务域分目录）
```

核心约定：

- 采用分层架构：`View -> Store -> API -> 后端`
- API 层按业务域分目录，每个目录包含 `index.ts`（接口函数）和 `types.ts`（类型定义）
- 使用 DTO 类型定义隔离接口输入输出，不在组件中直接构造裸对象
- 组件分四类：`common/`（通用组件）、`layout/`（布局组件）、`business/`（业务组件）、`form/`（表单组件）
- 路由按业务域拆分到 `router/modules/` 下
- Store 按业务域拆分到 `stores/modules/` 下
- 枚举必须与后端保持完全一致，同时维护中文 label 映射
- 页面视图按业务域分目录，管理员专用页面集中在 `views/admin/`

---

## 06 角色、权限控制与模块边界

### 06-1 固定角色边界

系统固定且互斥 3 类角色：

| 角色           | 说明       | 前端可访问功能                                                                              |
| -------------- | ---------- | ------------------------------------------------------------------------------------------- |
| `USER`         | 普通用户   | 设备查询、本人预约（含批量）、签到、借还记录查看、逾期记录查看、AI 对话、通知中心、个人中心 |
| `DEVICE_ADMIN` | 设备管理员 | 设备 CRUD、分类管理、预约一审、待人工处理、借用确认、归还确认、逾期处理、通知中心           |
| `SYSTEM_ADMIN` | 系统管理员 | 用户管理、角色权限、预约二审、代预约、管理型批量预约、统计分析、Prompt 模板管理、通知中心   |

强约束：

- 注册用户默认绑定 `USER`
- 菜单、路由、按钮必须按角色严格控制可见性
- `DEVICE_ADMIN` 不得看到"创建预约"入口
- `SYSTEM_ADMIN` 不得看到"借用确认""归还确认""逾期处理"入口
- AI 对话入口仅对 `USER` 可见
- 统计分析仅对 `SYSTEM_ADMIN` 可见

### 06-2 权限控制机制

前端权限控制分三个层面：

1. **路由层**: 路由 `meta.roles` 定义允许访问的角色数组，路由守卫拦截非授权访问
2. **菜单层**: 侧边栏菜单根据当前用户角色动态渲染
3. **元素层**: `v-permission` 指令控制按钮/操作入口的显示隐藏

### 06-3 审批与预约模型（前端展示）

- 审批模式固定为 `DEVICE_ONLY` / `DEVICE_THEN_SYSTEM`
- 预约详情页必须展示 `approval_mode_snapshot`
- 待审核列表需区分一审（`PENDING_DEVICE_APPROVAL`）和二审（`PENDING_SYSTEM_APPROVAL`）
- 人工处理列表展示 `PENDING_MANUAL` 状态预约
- 预约模式展示需区分 `SELF`（本人预约）和 `ON_BEHALF`（代预约）
- 批量预约结果需展示批次信息（成功数 / 失败数）

### 06-4 必备页面模块与路由前缀

| 模块        | 路由前缀                                                     | 对应后端接口                        | 可见角色                    |
| ----------- | ------------------------------------------------------------ | ----------------------------------- | --------------------------- |
| 认证        | `/login`、`/register`、`/forgot-password`、`/reset-password` | `/api/auth/*`                       | 公开                        |
| 仪表盘      | `/dashboard`                                                 | 多接口聚合                          | 所有已登录角色              |
| 个人中心    | `/profile`                                                   | `/api/auth/me`、`/api/auth/profile` | 所有已登录角色              |
| 设备管理    | `/devices`                                                   | `/api/devices/*`                    | 所有（CRUD 仅管理员）       |
| 分类管理    | `/devices/categories`                                        | `/api/device-categories/*`          | 所有（管理仅管理员）        |
| 预约管理    | `/reservations`                                              | `/api/reservations/*`               | 所有（审核仅管理员）        |
| 借还管理    | `/borrows`                                                   | `/api/borrow-records/*`             | 所有（确认仅 DEVICE_ADMIN） |
| 逾期管理    | `/overdue`                                                   | `/api/overdue-records/*`            | 所有（处理仅 DEVICE_ADMIN） |
| AI 对话     | `/ai`                                                        | `/api/ai/*`                         | 仅 USER                     |
| 通知中心    | `/notifications`                                             | `/api/notifications/*`              | 所有已登录角色              |
| 统计分析    | `/statistics`                                                | `/api/statistics/*`                 | 仅 SYSTEM_ADMIN             |
| 用户管理    | `/users`                                                     | `/api/admin/users/*`                | 仅 SYSTEM_ADMIN             |
| 角色权限    | `/admin/roles`                                               | `/api/admin/roles/*`                | 仅 SYSTEM_ADMIN             |
| Prompt 模板 | `/admin/prompt-templates`                                    | `/api/ai/prompts*`                  | 仅 SYSTEM_ADMIN             |

---

## 07 核心数据模型与枚举契约

### 07-1 必备枚举集合

前端必须维护以下枚举，且与后端保持完全一致：

- `UserRole`: `USER` / `DEVICE_ADMIN` / `SYSTEM_ADMIN`
- `DeviceStatus`: `AVAILABLE` / `BORROWED` / `MAINTENANCE` / `DISABLED` / `RETIRED` / `DELETED`
- `ApprovalMode`: `DEVICE_ONLY` / `DEVICE_THEN_SYSTEM`（后端实际使用 `DEVICE_AND_SYSTEM`，联调时以后端为准）
- `ReservationMode`: `SELF` / `ON_BEHALF`（后端实际使用 `PROXY`，联调时以后端为准）
- `ReservationStatus`: `PENDING_DEVICE_APPROVAL` / `PENDING_SYSTEM_APPROVAL` / `PENDING_MANUAL` / `APPROVED` / `REJECTED` / `CANCELLED` / `EXPIRED`
- `CheckInStatus`: `NOT_CHECKED_IN` / `CHECKED_IN` / `CHECKED_IN_TIMEOUT`（后端实际使用 `NOT_SIGNED` / `SIGNED_IN` / `TIMEOUT`，联调时以后端为准）
- `BorrowStatus`: `BORROWED` / `RETURNED` / `OVERDUE`
- `OverdueProcessingStatus`: `PENDING` / `PROCESSED`
- `OverdueHandleType`: `WARNING` / `COMPENSATION` / `CONTINUE`
- `FreezeStatus`: `NORMAL` / `RESTRICTED` / `FROZEN`
- `NotificationType`: 17 种通知类型（详见后端枚举）
- `NotificationChannel`: `IN_APP` / `EMAIL` / `SMS`
- `AiIntentType`: `RESERVE` / `QUERY` / `CANCEL` / `HELP` / `UNKNOWN`
- `PromptTemplateType`: `INTENT_RECOGNITION` / `INFO_EXTRACTION` / `RESULT_FEEDBACK` / `CONFLICT_RECOMMENDATION`

### 07-2 枚举文件规范

每个枚举文件必须导出三项内容：

1. **枚举值**（`enum` 或 `const` 对象）
2. **中文 label 映射**（`Record<EnumType, string>`）
3. **Tag 类型映射**（`Record<EnumType, string>`，用于 `el-tag` 的 `type` 属性）

示例格式：

```typescript
export enum DeviceStatus {
  AVAILABLE = 'AVAILABLE',
  BORROWED = 'BORROWED',
  // ...
}

export const DeviceStatusLabel: Record<DeviceStatus, string> = {
  [DeviceStatus.AVAILABLE]: '可用',
  [DeviceStatus.BORROWED]: '已借出',
  // ...
}

export const DeviceStatusTagType: Record<DeviceStatus, string> = {
  [DeviceStatus.AVAILABLE]: 'success',
  [DeviceStatus.BORROWED]: 'warning',
  // ...
}
```

### 07-3 分域状态解释

前端展示状态时，必须使用"状态集名 + 状态码"对应的中文：

- `reservation_status.PENDING_DEVICE_APPROVAL` → "待设备审批"
- `reservation_status.PENDING_SYSTEM_APPROVAL` → "待系统审批"
- `reservation_status.PENDING_MANUAL` → "待人工处理"
- `borrow_status.BORROWED` → "借用中"（借还域）
- `device_status.BORROWED` → "已借出"（设备域）

### 07-4 历史口径警告

以下旧口径不得出现在新代码、新组件和新类型定义中：

- `ADMIN` 单一管理员角色
- 预约状态 `PENDING`
- 通知渠道仅 `EMAIL` / `SMS`
- 通知状态 `SENT`
- 省略 `reservation_batch` 相关类型

---

## 08 关键业务规则（前端展示与交互）

### 08-1 预约相关交互规则

- 预约时间范围选择器必须限制在 `08:00-22:00`
- 最短预约时长 30 分钟，最长 7 天
- 创建预约时必须实时做冲突检测并提示用户
- `USER` 可本人预约与本人批量预约
- `SYSTEM_ADMIN` 可代 `USER` 预约（需选择目标用户）
- `DEVICE_ADMIN` 不得创建预约，不展示创建入口
- 开始前超过 24 小时，显示"取消"按钮
- 开始前 24 小时内，取消按钮不可见或置灰并提示联系管理员
- 开始后不可取消

### 08-2 签到交互规则

- 签到按钮仅在签到窗口内（开始前 30 分钟至开始后 60 分钟）可见
- 正常签到（开始前 30 分钟至开始后 30 分钟）与超时签到（30~60 分钟）需区分展示
- 超过 60 分钟未签到，显示"已过期"

### 08-3 借还管理交互规则

- 借用确认入口仅对 `DEVICE_ADMIN` 可见
- 归还确认入口仅对 `DEVICE_ADMIN` 可见
- `SYSTEM_ADMIN` 不参与借用确认和归还确认，不展示操作入口

### 08-4 逾期与冻结展示规则

- 冻结状态标签需区分颜色：`NORMAL`（绿色）、`RESTRICTED`（橙色）、`FROZEN`（红色）
- 用户在 `FROZEN` 状态下，预约入口应禁用并提示"账户已冻结"
- `RESTRICTED` 状态需提示受限原因和预计解除时间

### 08-5 通知交互规则

- Header 通知铃铛显示未读数 Badge
- 通知列表支持单条标记已读和全部已读
- 通知中心采用轮询方式定时刷新未读数（建议间隔 30 秒）

---

## 09 与后端联动约定

### 09-1 重点接口承载

前端实现必须主动对齐后端以下接口路径：

| 前端 API 模块              | 后端 Controller            | 接口路径前缀               |
| -------------------------- | -------------------------- | -------------------------- |
| `api/auth`                 | AuthController             | `/api/auth`                |
| `api/users`                | UserController             | `/api/admin/users`         |
| `api/roles`                | RoleController             | `/api/admin/roles`         |
| `api/devices`              | DeviceController           | `/api/devices`             |
| `api/categories`           | CategoryController         | `/api/device-categories`   |
| `api/reservations`         | ReservationController      | `/api/reservations`        |
| `api/reservations`（批次） | ReservationBatchController | `/api/reservation-batches` |
| `api/borrow-records`       | BorrowController           | `/api/borrow-records`      |
| `api/overdue`              | OverdueController          | `/api/overdue-records`     |
| `api/notifications`        | NotificationController     | `/api/notifications`       |
| `api/ai`                   | AiController               | `/api/ai`                  |
| `api/prompt-templates`     | AiController               | `/api/ai/prompts`          |
| `api/statistics`           | StatisticsController       | `/api/statistics`          |

### 09-2 跨域与代理配置

- 后端 CORS 配置不完整，开发环境通过 Vite `server.proxy` 代理解决
- `vite.config.ts` 必须配置 `/api` 和 `/files` 路径代理到 `http://localhost:8080`
- 生产部署通过 Nginx 反向代理处理

### 09-3 认证联调要点

- 登录接口 `POST /api/auth/login` 请求体为 `{ account, password }`，`account` 支持用户名或邮箱
- 登录成功返回 `{ userId, username, role, accessToken, refreshToken }`
- 注册成功也返回完整 Token，无需二次登录
- Access Token 24 小时有效，Refresh Token 7 天有效
- Token 存储在 `localStorage`
- 401 响应时清除 Token 并跳转登录页
- 连续登录失败 5 次锁定 30 分钟

### 09-4 已知接口差异记录

> 联调时发现的后端实际接口与设计文档的差异，记录在此以避免重复踩坑。

| 差异项                | 设计文档                                               | 后端实际                                | 前端处理            |
| --------------------- | ------------------------------------------------------ | --------------------------------------- | ------------------- |
| 预约模式              | `SELF` / `ON_BEHALF`                                   | `SELF` / `PROXY`                        | 以后端 `PROXY` 为准 |
| 签到状态              | `NOT_CHECKED_IN` / `CHECKED_IN` / `CHECKED_IN_TIMEOUT` | `NOT_SIGNED` / `SIGNED_IN` / `TIMEOUT`  | 以后端实际为准      |
| 设备状态              | 含 `DISABLED`                                          | 含 `RETIRED`                            | 以后端实际为准      |
| 审批模式              | `DEVICE_ONLY` / `DEVICE_THEN_SYSTEM`                   | `DEVICE_ONLY` / `DEVICE_AND_SYSTEM`     | 以后端实际为准      |
| 借用确认路径          | `POST /{reservationId}/borrow`                         | `POST /{reservationId}/confirm-borrow`  | 以后端实际为准      |
| 归还确认路径          | `POST /{id}/return`                                    | `POST /{borrowRecordId}/confirm-return` | 以后端实际为准      |
| 借用/归还 RequestBody | 必填                                                   | `required = false`（可选）              | 按可选处理          |
| 用户状态              | 枚举字符串                                             | `Integer`（1=正常, 0=禁用）             | 用数字类型          |

---

## 10 构建、测试与质量门禁

### 10-1 NPM 常用命令

| 命令                 | 说明                   |
| -------------------- | ---------------------- |
| `npm install`        | 安装依赖               |
| `npm run dev`        | 启动开发服务器         |
| `npm run build`      | 类型检查 + 生产构建    |
| `npm run build-only` | 仅构建（跳过类型检查） |
| `npm run type-check` | TypeScript 类型检查    |
| `npm run test:unit`  | 运行单元测试           |
| `npm run preview`    | 预览生产构建结果       |
| `npm run format`     | Prettier 代码格式化    |

### 10-2 质量门禁

- 每完成一个功能模块，必须执行 `npm run type-check` 确认无类型错误
- 准备宣称"完成"前，必须执行 `npm run build` 确认构建成功
- 新增组件应包含基础 Props 类型定义，不得使用 `any` 类型绕过检查
- API 层的请求/响应类型必须与后端 DTO 保持一致

### 10-3 代码格式规范

项目已配置 Prettier，规则如下：

- 不使用分号 (`semi: false`)
- 使用单引号 (`singleQuote: true`)
- 行宽 100 字符 (`printWidth: 100`)

所有代码提交前应执行 `npm run format` 确保格式一致。

---

## 11 代码注释规范

### 11-1 总体要求

- **适用范围**: 项目中的 TypeScript、Vue SFC、SCSS、配置文件都必须纳入中文注释治理范围
- **强制覆盖要求**: 对本次新增或修改范围内的组件、API 函数、Store、枚举、工具函数、路由配置、复杂模板逻辑，必须补齐与复杂度匹配的中文注释
- **语言要求**: 所有新增注释统一使用中文（简体），术语必须与后端代码、`device_management.sql`、系统设计文档保持一致
- **目标要求**: 注释必须解释"为什么这样写、对应什么业务规则、权限约束是什么"，禁止把代码字面意思机械翻译成注释
- **同步要求**: 修改代码逻辑时，必须同步修改对应注释
- **真相源要求**: 注释内容不得与真相源冲突

### 11-2 注释格式选择规则

| 场景                     | 优先格式             | 说明                                             |
| ------------------------ | -------------------- | ------------------------------------------------ |
| TypeScript 类型/接口定义 | `/** ... */` JSDoc   | 说明类型用途、字段含义、取值约束                 |
| API 函数                 | `/** ... */` JSDoc   | 说明接口用途、对应后端路径、参数约束、返回值语义 |
| Vue 组件 `<script>`      | `/** ... */` 或 `//` | 组件头部说明职责；Props、Emits、关键逻辑需注释   |
| Vue 模板 `<template>`    | `<!-- ... -->`       | 说明条件渲染的业务原因、权限控制逻辑             |
| Store 模块               | `/** ... */`         | 说明状态管理职责、关键 Action 的业务含义         |
| 路由配置                 | `//` 或 `/** ... */` | 说明路由权限要求、meta 字段含义                  |
| 枚举定义                 | `/** ... */`         | 说明枚举值的业务含义、适用业务域                 |
| 工具函数                 | `/** ... */` JSDoc   | 说明函数用途、参数、返回值                       |
| SCSS 样式                | `//` 或 `/* ... */`  | 说明样式覆盖原因或特殊处理                       |
| 配置文件                 | `//`                 | 说明关键配置项的用途和影响                       |

### 11-3 TypeScript 与 API 层注释规范

- **类型/接口注释**: 必须说明类型的业务用途；与后端交互的 DTO 类型必须标注对应后端类名
- **API 函数注释**: 必须说明接口用途、HTTP 方法与路径、角色要求、请求参数约束
- **枚举注释**: 必须说明每个枚举值的业务含义、所属业务域、前端展示方式
- **工具函数注释**: 必须说明函数用途、参数含义、返回值、使用场景

### 11-4 Vue 组件注释规范

- **组件职责注释**: 在 `<script setup>` 顶部说明组件的业务职责、所属页面、使用场景
- **Props 注释**: 说明每个 Prop 的业务含义、取值来源
- **模板权限注释**: 涉及 `v-permission`、`v-if` 角色判断的模板块，必须用 `<!-- -->` 说明权限规则
- **事件处理注释**: 复杂的事件处理逻辑（如预约创建、审核操作）必须说明业务流程
- **表单验证注释**: 说明验证规则的业务依据

### 11-5 Store 与路由注释规范

- **Store 注释**: 说明状态管理的业务域、关键状态的含义、Action 的业务副作用
- **路由注释**: 说明 `meta.roles` 的权限含义、布局选择原因

### 11-6 注释禁止事项

- 禁止编写纯粹复述代码表面的机械注释
- 禁止使用与当前真相源冲突的旧术语
- 禁止代码逻辑已变更但注释未同步更新
- 禁止在注释中写入未经确认的业务假设
- 禁止为了追求"注释覆盖率"而堆砌无意义注释
- 禁止在注释中泄露真实密钥、Token 等安全信息

### 11-7 评审与验收要求

- **完成标准**: 新增或修改代码时，若涉及的业务规则、权限控制、接口调用缺少匹配的中文注释，视为任务未完成
- **评审重点**: 审查注释是否解释了"为什么"而非仅仅"是什么"
- **Agent 执行要求**: Agent 在实施开发时，必须把补充中文注释作为交付内容的一部分

---

## 12 命名规范

### 12-1 文件命名

| 类型            | 命名规范                      | 示例                                      |
| --------------- | ----------------------------- | ----------------------------------------- |
| Vue 页面组件    | PascalCase                    | `Login.vue`、`DeviceList.vue`             |
| Vue 通用组件    | PascalCase                    | `Pagination.vue`、`DeviceStatusTag.vue`   |
| TypeScript 模块 | camelCase                     | `useAuth.ts`、`request.ts`                |
| 类型定义文件    | `types.ts` 或 `.d.ts`         | `types.ts`、`global.d.ts`                 |
| 枚举文件        | PascalCase                    | `DeviceStatus.ts`、`UserRole.ts`          |
| 样式文件        | kebab-case                    | `variables.scss`、`element-override.scss` |
| 路由模块        | kebab-case + `.routes.ts`     | `auth.routes.ts`、`device.routes.ts`      |
| API 目录        | kebab-case（复数/单数按语义） | `devices/`、`auth/`、`borrow-records/`    |

### 12-2 API 目录命名规范

| 类型       | 命名规则   | 示例                                                    |
| ---------- | ---------- | ------------------------------------------------------- |
| 资源集合   | 复数形式   | `devices/`、`users/`、`reservations/`、`notifications/` |
| 抽象概念   | 单数形式   | `auth/`、`ai/`、`overdue/`、`statistics/`               |
| 连字符分隔 | kebab-case | `borrow-records/`、`prompt-templates/`                  |

### 12-3 变量与函数命名

| 类型       | 命名规范                     | 示例                                 |
| ---------- | ---------------------------- | ------------------------------------ |
| 组合式函数 | `use` + PascalCase           | `useAuth`、`usePagination`           |
| Store      | `use` + PascalCase + `Store` | `useAuthStore`、`useDeviceStore`     |
| API 函数   | camelCase 动词开头           | `getDeviceList`、`createReservation` |
| 事件处理   | `handle` + 动作              | `handleSubmit`、`handleApprove`      |
| 计算属性   | camelCase 名词/形容词        | `isAdmin`、`filteredList`            |
| 常量       | UPPER_SNAKE_CASE             | `STORAGE_KEYS`、`DEFAULT_PAGE_SIZE`  |

### 12-4 组件 Props 与 Emits 命名

| 类型    | 命名规范                           | 示例                             |
| ------- | ---------------------------------- | -------------------------------- |
| Props   | camelCase                          | `deviceId`、`showActions`        |
| Emits   | kebab-case 事件名                  | `@update:modelValue`、`@confirm` |
| v-model | `modelValue` / `update:modelValue` | 标准 Vue 3 约定                  |

---

## 13 Agent 执行提醒

- 开发前优先核对后端实际接口（Controller 代码），不要只根据设计文档推断接口路径和参数
- 发现枚举值、接口路径、请求体字段与设计文档不一致时，以后端实际代码为准，并在 09-4 差异记录表中补充记录
- 对于 `string` UUID 主键、固定三角色、审批模式、预约状态、通知类型，不要擅自改口径
- 若旧文档仍出现 `ADMIN`、`PENDING`、`SENT` 等历史口径，默认视为待同步旧内容，不作为新实现基线
- 每个页面组件开发完成后，先运行 `npm run type-check` 确认无类型错误
- API 层类型定义必须与后端 DTO 字段名完全对应，包括大小写
- Vite 代理配置必须覆盖 `/api` 和 `/files` 路径
- 组件中涉及角色判断的 `v-if` / `v-permission` 必须加注释说明权限规则
- 所有表单验证规则必须与后端校验保持一致（如密码复杂度 >= 8 位含数字+字母）
- 任何新增或修改的代码都必须按第 11 章同步补齐本次改动范围内所需的中文注释；未补齐前不得宣称完成
- 若开始实际编码，优先先把依赖安装、Vite 代理、Element Plus 集成、Axios 封装和路由骨架搭好，再进入业务模块开发
