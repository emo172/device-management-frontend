# 江汉大学智能设备管理系统 - 前端实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于 Vue 3 + Element Plus + Pinia + TypeScript 技术栈，实现智能设备管理系统的完整前端，与 Spring Boot 后端 API 完成联调。

**Architecture:** 前端采用 Vue 3 Composition API + TypeScript，使用 Pinia 做状态管理，Element Plus 做 UI 组件库，Axios 封装 HTTP 请求层。项目按功能模块组织（api/views/stores/components），路由守卫实现权限控制，JWT Token 管理实现认证流程。

**Tech Stack:** Vue 3.5, TypeScript 5.9, Vite 7, Element Plus, Pinia, Vue Router 5, Axios, ECharts (统计图表), SCSS

---

## 项目概况

### 系统角色

| 角色       | 代码           | 核心职责                                          |
| ---------- | -------------- | ------------------------------------------------- |
| 普通用户   | `USER`         | 设备查询、预约、签到、AI 对话、查看本人记录       |
| 设备管理员 | `DEVICE_ADMIN` | 设备 CRUD、预约一审、借用/归还确认、逾期处理      |
| 系统管理员 | `SYSTEM_ADMIN` | 用户管理、预约二审、代预约、统计分析、Prompt 模板 |

### 后端 API 基础信息

- **基础路径:** `http://localhost:8080/api`
- **认证方式:** `Authorization: Bearer <access_token>`
- **统一响应格式:** `{ code: 0|1, message: string, data: T }`
- **分页响应:** `{ total: number, records: T[] }` (嵌套在 data 中)
- **分页参数:** `page` (从1开始), `size` (默认10)
- **ID 格式:** UUID 字符串
- **时间格式:** ISO 8601 (`2024-01-01T10:00:00`)

### 前端项目现状

项目已通过 `create-vue` 脚手架初始化，具备：

- Vue 3 + TypeScript + Vite 构建系统
- Pinia + Vue Router 已注册但无内容
- `@` 路径别名已配置
- 无任何业务代码、无 UI 库、无 HTTP 客户端

---

## Chunk 1: 基础设施搭建

> 安装依赖、配置构建工具、搭建项目骨架

### Task 1: 安装项目依赖

**Files:**

- Modify: `package.json`
- Create: `.env.development`
- Create: `.env.production`

- [ ] **Step 1: 安装核心依赖**

```bash
npm install
npm install element-plus @element-plus/icons-vue axios pinia-plugin-persistedstate nprogress
npm install sass -D
npm install @types/nprogress -D
```

- [ ] **Step 2: 创建环境变量文件**

`.env.development`:

```
VITE_API_BASE_URL=http://localhost:8080
VITE_APP_TITLE=智能设备管理系统
```

`.env.production`:

```
VITE_API_BASE_URL=/
VITE_APP_TITLE=智能设备管理系统
```

- [ ] **Step 3: 验证项目可启动**

```bash
npm run dev
```

Expected: Vite 开发服务器启动成功

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: 安装项目核心依赖及环境变量配置"
```

---

### Task 2: 配置 Vite 代理与 Element Plus

**Files:**

- Modify: `vite.config.ts`
- Modify: `src/main.ts`
- Create: `src/assets/styles/index.scss`
- Create: `src/assets/styles/variables.scss`
- Create: `src/assets/styles/reset.scss`
- Create: `src/assets/styles/element-override.scss`

- [ ] **Step 1: 配置 Vite 开发代理**

`vite.config.ts`:

```typescript
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/files': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 2: 配置全局样式**

`src/assets/styles/variables.scss` — 定义主题色、间距、字体等 CSS 变量。

`src/assets/styles/reset.scss` — 基础样式重置。

`src/assets/styles/element-override.scss` — Element Plus 组件样式覆盖。

`src/assets/styles/index.scss` — 统一导入所有样式文件。

- [ ] **Step 3: 配置 main.ts 集成 Element Plus**

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
import '@/assets/styles/index.scss'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })

// 注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount('#app')
```

- [ ] **Step 4: 验证 Element Plus 正常工作**

```bash
npm run dev
```

Expected: 无编译错误，页面可正常访问

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: 配置 Vite 代理、Element Plus 与全局样式"
```

---

### Task 3: TypeScript 类型基础与枚举定义

**Files:**

- Create: `src/types/global.d.ts`
- Create: `src/types/env.d.ts`
- Create: `src/enums/index.ts`
- Create: `src/enums/UserRole.ts`
- Create: `src/enums/DeviceStatus.ts`
- Create: `src/enums/ReservationStatus.ts`
- Create: `src/enums/CheckInStatus.ts`
- Create: `src/enums/BorrowStatus.ts`
- Create: `src/enums/OverdueStatus.ts`
- Create: `src/enums/FreezeStatus.ts`
- Create: `src/enums/NotificationType.ts`
- Create: `src/enums/ApprovalMode.ts`
- Create: `src/enums/AiIntentType.ts`

- [ ] **Step 1: 定义全局类型声明**

`src/types/global.d.ts`:

```typescript
/** 后端统一响应格式 */
interface ApiResponse<T = any> {
  code: number // 0=成功, 1=失败
  message: string
  data: T
}

/** 分页响应 */
interface PageData<T = any> {
  total: number
  records: T[]
}

/** 分页请求参数 */
interface PageParams {
  page: number
  size: number
}
```

`src/types/env.d.ts`:

```typescript
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_TITLE: string
}
```

- [ ] **Step 2: 定义所有枚举**

每个枚举文件导出枚举值和中文 label 映射。例如 `src/enums/DeviceStatus.ts`:

```typescript
export enum DeviceStatus {
  AVAILABLE = 'AVAILABLE',
  BORROWED = 'BORROWED',
  MAINTENANCE = 'MAINTENANCE',
  DISABLED = 'DISABLED',
  RETIRED = 'RETIRED',
  DELETED = 'DELETED',
}

export const DeviceStatusLabel: Record<DeviceStatus, string> = {
  [DeviceStatus.AVAILABLE]: '可用',
  [DeviceStatus.BORROWED]: '已借出',
  [DeviceStatus.MAINTENANCE]: '维修中',
  [DeviceStatus.DISABLED]: '已停用',
  [DeviceStatus.RETIRED]: '已报废',
  [DeviceStatus.DELETED]: '已删除',
}

export const DeviceStatusTagType: Record<DeviceStatus, string> = {
  [DeviceStatus.AVAILABLE]: 'success',
  [DeviceStatus.BORROWED]: 'warning',
  [DeviceStatus.MAINTENANCE]: 'info',
  [DeviceStatus.DISABLED]: 'danger',
  [DeviceStatus.RETIRED]: 'info',
  [DeviceStatus.DELETED]: 'info',
}
```

其余枚举文件按同模式定义：

- `UserRole`: USER / DEVICE_ADMIN / SYSTEM_ADMIN
- `ReservationStatus`: PENDING_DEVICE_APPROVAL / PENDING_SYSTEM_APPROVAL / PENDING_MANUAL / APPROVED / REJECTED / CANCELLED / EXPIRED / COMPLETED
- `CheckInStatus`: NOT_SIGNED / SIGNED_IN / TIMEOUT
- `BorrowStatus`: BORROWED / RETURNED / OVERDUE
- `OverdueStatus`: PENDING / PROCESSED
- `FreezeStatus`: NORMAL / RESTRICTED / FROZEN
- `NotificationType`: 17种通知类型
- `ApprovalMode`: AUTO_APPROVE / DEVICE_ONLY / DEVICE_AND_SYSTEM
- `AiIntentType`: RESERVE / QUERY / CANCEL / HELP / UNKNOWN

`src/enums/index.ts` 统一导出所有枚举。

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: 定义全局 TypeScript 类型与业务枚举"
```

---

### Task 4: Axios 封装与请求拦截器

**Files:**

- Create: `src/api/request.ts`
- Create: `src/utils/token.ts`
- Create: `src/utils/storage.ts`
- Create: `src/constants/index.ts`
- Create: `src/constants/storage.ts`

- [ ] **Step 1: 定义存储键常量**

`src/constants/storage.ts`:

```typescript
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_INFO: 'user_info',
} as const
```

- [ ] **Step 2: 实现 Token 管理工具**

`src/utils/token.ts`:

```typescript
import { STORAGE_KEYS } from '@/constants/storage'

export function getAccessToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
}

export function setAccessToken(token: string): void {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token)
}

export function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
}

export function hasToken(): boolean {
  return !!getAccessToken()
}
```

- [ ] **Step 3: 封装 Axios 实例**

`src/api/request.ts`:

```typescript
import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { getAccessToken, clearTokens } from '@/utils/token'
import router from '@/router'

const service = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截器: 自动附加 Token
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截器: 统一处理错误
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { code, message, data } = response.data
    if (code === 0) {
      return response.data as any
    }
    // 业务错误
    ElMessage.error(message || '请求失败')
    return Promise.reject(new Error(message))
  },
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      clearTokens()
      router.push('/login')
      ElMessage.error('登录已过期，请重新登录')
    } else if (status === 403) {
      ElMessage.error('没有权限执行此操作')
    } else if (status === 400) {
      const msg = error.response?.data?.message || '请求参数错误'
      ElMessage.error(msg)
    } else {
      ElMessage.error('网络错误，请稍后重试')
    }
    return Promise.reject(error)
  },
)

export default service
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: 封装 Axios 请求层与 Token 管理"
```

---

### Task 5: 工具函数

**Files:**

- Create: `src/utils/index.ts`
- Create: `src/utils/date.ts`
- Create: `src/utils/format.ts`
- Create: `src/utils/validate.ts`

- [ ] **Step 1: 实现日期工具**

`src/utils/date.ts`:

```typescript
/** 格式化日期时间为 YYYY-MM-DD HH:mm:ss */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/** 格式化日期为 YYYY-MM-DD */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/** 将 Date 对象转为 ISO LocalDateTime 格式 (YYYY-MM-DDTHH:mm:ss) */
export function toLocalDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
```

- [ ] **Step 2: 实现表单验证工具**

`src/utils/validate.ts`:

```typescript
/** 邮箱格式验证 */
export function isEmail(value: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)
}

/** 密码复杂度验证: >=8位, 含数字+字母 */
export function isValidPassword(value: string): boolean {
  return value.length >= 8 && /[a-zA-Z]/.test(value) && /[0-9]/.test(value)
}

/** 手机号验证 */
export function isPhone(value: string): boolean {
  return /^1[3-9]\d{9}$/.test(value)
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: 实现日期、格式化、验证等工具函数"
```

---

## Chunk 2: API 层与状态管理

> 定义所有 API 模块的类型和接口函数，以及 Pinia Store

### Task 6: 认证模块 API

**Files:**

- Create: `src/api/auth/types.ts`
- Create: `src/api/auth/index.ts`

- [ ] **Step 1: 定义认证类型**

`src/api/auth/types.ts`:

```typescript
/** 登录请求 */
export interface LoginRequest {
  account: string // 用户名或邮箱
  password: string
}

/** 注册请求 */
export interface RegisterRequest {
  username: string
  password: string
  email: string
  realName: string
  phone?: string
}

/** 登录/注册响应 */
export interface LoginResponse {
  userId: string
  username: string
  role: string
  accessToken: string
  refreshToken: string
}

/** 当前用户信息响应 */
export interface CurrentUserResponse {
  userId: string
  username: string
  email: string
  realName: string
  phone: string
  role: string
}

/** 修改个人信息请求 */
export interface UpdateProfileRequest {
  realName?: string
  phone?: string
}

/** 修改密码请求 */
export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
}

/** 发送重置验证码请求 */
export interface SendResetCodeRequest {
  email: string
}

/** 重置密码请求 */
export interface ResetPasswordRequest {
  email: string
  verificationCode: string
  newPassword: string
}
```

- [ ] **Step 2: 实现认证 API 函数**

`src/api/auth/index.ts`:

```typescript
import request from '@/api/request'
import type {
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  CurrentUserResponse,
  UpdateProfileRequest,
  ChangePasswordRequest,
  SendResetCodeRequest,
  ResetPasswordRequest,
} from './types'

/** 用户登录 */
export function login(data: LoginRequest) {
  return request.post<any, ApiResponse<LoginResponse>>('/auth/login', data)
}

/** 用户注册 */
export function register(data: RegisterRequest) {
  return request.post<any, ApiResponse<LoginResponse>>('/auth/register', data)
}

/** 获取当前用户信息 */
export function getCurrentUser() {
  return request.get<any, ApiResponse<CurrentUserResponse>>('/auth/me')
}

/** 修改个人信息 */
export function updateProfile(data: UpdateProfileRequest) {
  return request.put<any, ApiResponse<CurrentUserResponse>>('/auth/profile', data)
}

/** 修改密码 */
export function changePassword(data: ChangePasswordRequest) {
  return request.post<any, ApiResponse<null>>('/auth/change-password', data)
}

/** 发送重置验证码 */
export function sendVerificationCode(data: SendResetCodeRequest) {
  return request.post<any, ApiResponse<null>>('/auth/verification-code', data)
}

/** 重置密码 */
export function resetPassword(data: ResetPasswordRequest) {
  return request.post<any, ApiResponse<null>>('/auth/reset-password', data)
}

/** 登出 */
export function logout() {
  return request.post<any, ApiResponse<null>>('/auth/logout')
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: 实现认证模块 API 层"
```

---

### Task 7: 设备模块 API

**Files:**

- Create: `src/api/devices/types.ts`
- Create: `src/api/devices/index.ts`
- Create: `src/api/categories/types.ts`
- Create: `src/api/categories/index.ts`

- [ ] **Step 1: 定义设备与分类类型**

`src/api/devices/types.ts`:

```typescript
export interface CreateDeviceRequest {
  name: string
  deviceNumber: string
  categoryName: string
  status: string
  description?: string
  location?: string
}

export interface UpdateDeviceRequest {
  name?: string
  categoryName?: string
  status?: string
  description?: string
  location?: string
}

export interface UpdateDeviceStatusRequest {
  status: string
  reason?: string
}

export interface DeviceResponse {
  id: string
  name: string
  deviceNumber: string
  categoryId: string
  categoryName: string
  status: string
  description: string
  location: string
}

export interface DeviceStatusLogResponse {
  oldStatus: string
  newStatus: string
  reason: string
}

export interface DeviceDetailResponse extends DeviceResponse {
  imageUrl: string
  statusLogs: DeviceStatusLogResponse[]
}

export interface DevicePageResponse {
  total: number
  records: DeviceResponse[]
}

export interface DeviceQueryParams extends Partial<PageParams> {
  categoryName?: string
}
```

`src/api/categories/types.ts`:

```typescript
export interface CreateCategoryRequest {
  name: string
  parentName?: string
  sortOrder?: number
  description?: string
  defaultApprovalMode?: string
}

export interface CategoryTreeResponse {
  id: string
  name: string
  parentId: string | null
  sortOrder: number
  description: string
  defaultApprovalMode: string
  children: CategoryTreeResponse[]
}
```

- [ ] **Step 2: 实现设备与分类 API**

`src/api/devices/index.ts`:

```typescript
import request from '@/api/request'
import type {
  CreateDeviceRequest,
  UpdateDeviceRequest,
  UpdateDeviceStatusRequest,
  DeviceResponse,
  DeviceDetailResponse,
  DevicePageResponse,
  DeviceQueryParams,
} from './types'

export function getDeviceList(params: DeviceQueryParams) {
  return request.get<any, ApiResponse<DevicePageResponse>>('/devices', { params })
}

export function getDeviceDetail(id: string) {
  return request.get<any, ApiResponse<DeviceDetailResponse>>(`/devices/${id}`)
}

export function createDevice(data: CreateDeviceRequest) {
  return request.post<any, ApiResponse<DeviceResponse>>('/devices', data)
}

export function updateDevice(id: string, data: UpdateDeviceRequest) {
  return request.put<any, ApiResponse<DeviceResponse>>(`/devices/${id}`, data)
}

export function deleteDevice(id: string) {
  return request.delete<any, ApiResponse<DeviceResponse>>(`/devices/${id}`)
}

export function updateDeviceStatus(id: string, data: UpdateDeviceStatusRequest) {
  return request.put<any, ApiResponse<DeviceResponse>>(`/devices/${id}/status`, data)
}

export function uploadDeviceImage(id: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<any, ApiResponse<DeviceDetailResponse>>(`/devices/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
```

`src/api/categories/index.ts`:

```typescript
import request from '@/api/request'
import type { CreateCategoryRequest, CategoryTreeResponse } from './types'

export function getCategoryTree() {
  return request.get<any, ApiResponse<CategoryTreeResponse[]>>('/device-categories/tree')
}

export function createCategory(data: CreateCategoryRequest) {
  return request.post<any, ApiResponse<CategoryTreeResponse>>('/device-categories', data)
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: 实现设备与分类模块 API 层"
```

---

### Task 8: 预约模块 API

**Files:**

- Create: `src/api/reservations/types.ts`
- Create: `src/api/reservations/index.ts`

- [ ] **Step 1: 定义预约类型**

`src/api/reservations/types.ts`:

```typescript
export interface CreateReservationRequest {
  deviceId: string
  startTime: string // ISO LocalDateTime
  endTime: string
  purpose: string
  remark?: string
}

export interface ProxyReservationRequest extends CreateReservationRequest {
  targetUserId: string
}

export interface AuditReservationRequest {
  approved: boolean
  remark?: string
}

export interface CheckInRequest {
  checkInTime?: string
}

export interface ManualProcessRequest {
  approved: boolean
  remark?: string
}

export interface ReservationResponse {
  id: string
  batchId: string | null
  userId: string
  createdBy: string
  reservationMode: string
  deviceId: string
  status: string
  signStatus: string
  approvalModeSnapshot: string
  deviceApproverId: string | null
  systemApproverId: string | null
}

/** 批量预约 */
export interface BatchReservationItem {
  deviceId: string
  startTime: string
  endTime: string
  purpose: string
  remark?: string
}

export interface CreateReservationBatchRequest {
  targetUserId?: string
  items: BatchReservationItem[]
}

export interface ReservationBatchResponse {
  id: string
  batchNo: string
  createdBy: string
  reservationCount: number
  successCount: number
  failedCount: number
  status: string
}
```

- [ ] **Step 2: 实现预约 API**

`src/api/reservations/index.ts`:

```typescript
import request from '@/api/request'
import type {
  CreateReservationRequest,
  ProxyReservationRequest,
  AuditReservationRequest,
  CheckInRequest,
  ManualProcessRequest,
  ReservationResponse,
  CreateReservationBatchRequest,
  ReservationBatchResponse,
} from './types'

export function createReservation(data: CreateReservationRequest) {
  return request.post<any, ApiResponse<ReservationResponse>>('/reservations', data)
}

export function createProxyReservation(data: ProxyReservationRequest) {
  return request.post<any, ApiResponse<ReservationResponse>>('/reservations/proxy', data)
}

export function auditReservation(id: string, data: AuditReservationRequest) {
  return request.post<any, ApiResponse<ReservationResponse>>(`/reservations/${id}/audit`, data)
}

export function systemAuditReservation(id: string, data: AuditReservationRequest) {
  return request.post<any, ApiResponse<ReservationResponse>>(
    `/reservations/${id}/system-audit`,
    data,
  )
}

export function checkIn(id: string, data?: CheckInRequest) {
  return request.post<any, ApiResponse<ReservationResponse>>(
    `/reservations/${id}/check-in`,
    data || {},
  )
}

export function manualProcess(id: string, data: ManualProcessRequest) {
  return request.put<any, ApiResponse<ReservationResponse>>(
    `/reservations/${id}/manual-process`,
    data,
  )
}

export function createBatchReservation(data: CreateReservationBatchRequest) {
  return request.post<any, ApiResponse<ReservationBatchResponse>>('/reservation-batches', data)
}

export function getBatchDetail(id: string) {
  return request.get<any, ApiResponse<ReservationBatchResponse>>(`/reservation-batches/${id}`)
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: 实现预约模块 API 层"
```

---

### Task 9: 借还、逾期、通知、统计、AI、用户管理 API

**Files:**

- Create: `src/api/borrow-records/types.ts`
- Create: `src/api/borrow-records/index.ts`
- Create: `src/api/overdue/types.ts`
- Create: `src/api/overdue/index.ts`
- Create: `src/api/notifications/types.ts`
- Create: `src/api/notifications/index.ts`
- Create: `src/api/statistics/types.ts`
- Create: `src/api/statistics/index.ts`
- Create: `src/api/ai/types.ts`
- Create: `src/api/ai/index.ts`
- Create: `src/api/prompt-templates/types.ts`
- Create: `src/api/prompt-templates/index.ts`
- Create: `src/api/users/types.ts`
- Create: `src/api/users/index.ts`
- Create: `src/api/roles/types.ts`
- Create: `src/api/roles/index.ts`
- Create: `src/api/index.ts`

- [ ] **Step 1: 借还模块 API**

`src/api/borrow-records/types.ts`:

```typescript
export interface ConfirmBorrowRequest {
  borrowTime?: string
  borrowCheckStatus?: string
  remark?: string
}

export interface ConfirmReturnRequest {
  returnTime?: string
  returnCheckStatus?: string
  remark?: string
}

export interface BorrowRecordResponse {
  id: string
  reservationId: string
  deviceId: string
  userId: string
  borrowTime: string | null
  returnTime: string | null
  expectedReturnTime: string | null
  status: string
  borrowCheckStatus: string | null
  returnCheckStatus: string | null
  remark: string | null
  operatorId: string | null
  returnOperatorId: string | null
}

export interface BorrowRecordPageResponse {
  total: number
  records: BorrowRecordResponse[]
}

export interface BorrowQueryParams extends Partial<PageParams> {
  status?: string
}
```

`src/api/borrow-records/index.ts`:

```typescript
import request from '@/api/request'
import type {
  ConfirmBorrowRequest,
  ConfirmReturnRequest,
  BorrowRecordResponse,
  BorrowRecordPageResponse,
  BorrowQueryParams,
} from './types'

export function getBorrowList(params: BorrowQueryParams) {
  return request.get<any, ApiResponse<BorrowRecordPageResponse>>('/borrow-records', { params })
}

export function getBorrowDetail(id: string) {
  return request.get<any, ApiResponse<BorrowRecordResponse>>(`/borrow-records/${id}`)
}

export function confirmBorrow(reservationId: string, data?: ConfirmBorrowRequest) {
  return request.post<any, ApiResponse<BorrowRecordResponse>>(
    `/borrow-records/${reservationId}/confirm-borrow`,
    data,
  )
}

export function confirmReturn(borrowRecordId: string, data?: ConfirmReturnRequest) {
  return request.post<any, ApiResponse<BorrowRecordResponse>>(
    `/borrow-records/${borrowRecordId}/confirm-return`,
    data,
  )
}
```

- [ ] **Step 2: 逾期模块 API**

`src/api/overdue/types.ts` 与 `src/api/overdue/index.ts` — 逾期记录查询与处理。

- [ ] **Step 3: 通知模块 API**

`src/api/notifications/types.ts`:

```typescript
export interface NotificationResponse {
  id: string
  notificationType: string
  channel: string
  title: string
  content: string
  readFlag: number // 0=未读, 1=已读
}

export interface UnreadCountResponse {
  unreadCount: number
}
```

`src/api/notifications/index.ts` — 通知列表、未读数、标记已读、全部已读。

- [ ] **Step 4: 统计模块 API**

`src/api/statistics/types.ts` 与 `src/api/statistics/index.ts` — 8个统计接口（overview, device-utilization, category-utilization, borrow, overdue, hot-time-slots, device-ranking, user-ranking）。

- [ ] **Step 5: AI 对话与 Prompt 模板 API**

`src/api/ai/types.ts` 与 `src/api/ai/index.ts` — AI 对话、历史查询。
`src/api/prompt-templates/types.ts` 与 `src/api/prompt-templates/index.ts` — Prompt 模板 CRUD。

- [ ] **Step 6: 用户管理与角色管理 API**

`src/api/users/types.ts` 与 `src/api/users/index.ts` — 用户状态管理、角色分配、冻结/解冻。
`src/api/roles/types.ts` 与 `src/api/roles/index.ts` — 角色列表、权限配置。

- [ ] **Step 7: API 统一导出**

`src/api/index.ts` 重新导出所有模块。

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: 实现全部业务模块 API 层（借还/逾期/通知/统计/AI/用户管理）"
```

---

### Task 10: Pinia Store 定义

**Files:**

- Create: `src/stores/index.ts`
- Create: `src/stores/modules/auth.ts`
- Create: `src/stores/modules/user.ts`
- Create: `src/stores/modules/device.ts`
- Create: `src/stores/modules/reservation.ts`
- Create: `src/stores/modules/borrow.ts`
- Create: `src/stores/modules/overdue.ts`
- Create: `src/stores/modules/ai.ts`
- Create: `src/stores/modules/notification.ts`
- Create: `src/stores/modules/statistics.ts`
- Create: `src/stores/modules/app.ts`

- [ ] **Step 1: 实现 Auth Store**

`src/stores/modules/auth.ts`:

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  login as loginApi,
  register as registerApi,
  getCurrentUser,
  logout as logoutApi,
} from '@/api/auth'
import type { LoginRequest, RegisterRequest, CurrentUserResponse } from '@/api/auth/types'
import { setAccessToken, setRefreshToken, clearTokens, hasToken } from '@/utils/token'
import { UserRole } from '@/enums/UserRole'
import router from '@/router'

export const useAuthStore = defineStore(
  'auth',
  () => {
    const userInfo = ref<CurrentUserResponse | null>(null)
    const isAuthenticated = computed(() => hasToken() && !!userInfo.value)
    const currentRole = computed(() => userInfo.value?.role || '')

    const isUser = computed(() => currentRole.value === UserRole.USER)
    const isDeviceAdmin = computed(() => currentRole.value === UserRole.DEVICE_ADMIN)
    const isSystemAdmin = computed(() => currentRole.value === UserRole.SYSTEM_ADMIN)
    const isAdmin = computed(() => isDeviceAdmin.value || isSystemAdmin.value)

    async function loginAction(data: LoginRequest) {
      const res = await loginApi(data)
      setAccessToken(res.data.accessToken)
      setRefreshToken(res.data.refreshToken)
      await fetchUserInfo()
    }

    async function registerAction(data: RegisterRequest) {
      const res = await registerApi(data)
      setAccessToken(res.data.accessToken)
      setRefreshToken(res.data.refreshToken)
      await fetchUserInfo()
    }

    async function fetchUserInfo() {
      const res = await getCurrentUser()
      userInfo.value = res.data
    }

    async function logoutAction() {
      try {
        await logoutApi()
      } catch {
        /* ignore */
      }
      clearTokens()
      userInfo.value = null
      router.push('/login')
    }

    function resetState() {
      clearTokens()
      userInfo.value = null
    }

    return {
      userInfo,
      isAuthenticated,
      currentRole,
      isUser,
      isDeviceAdmin,
      isSystemAdmin,
      isAdmin,
      loginAction,
      registerAction,
      fetchUserInfo,
      logoutAction,
      resetState,
    }
  },
  {
    persist: {
      pick: ['userInfo'],
    },
  },
)
```

- [ ] **Step 2: 实现 App Store (全局状态)**

`src/stores/modules/app.ts`:

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore(
  'app',
  () => {
    const sidebarCollapsed = ref(false)
    const loading = ref(false)

    function toggleSidebar() {
      sidebarCollapsed.value = !sidebarCollapsed.value
    }

    return { sidebarCollapsed, loading, toggleSidebar }
  },
  {
    persist: {
      pick: ['sidebarCollapsed'],
    },
  },
)
```

- [ ] **Step 3: 实现 Notification Store**

`src/stores/modules/notification.ts` — 管理通知未读数、通知列表、轮询机制。

- [ ] **Step 4: 实现其余 Store（device, reservation, borrow, overdue, statistics, ai, user）**

每个 Store 负责调用对应 API 模块，管理列表数据、分页状态、当前详情等状态。

- [ ] **Step 5: Store 统一导出**

`src/stores/index.ts` 重新导出所有 Store。

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: 实现全部 Pinia Store 模块"
```

---

## Chunk 3: 路由与布局

> 搭建路由系统、权限守卫、页面布局框架

### Task 11: 路由系统

**Files:**

- Create: `src/router/routes.ts`
- Create: `src/router/modules/auth.routes.ts`
- Create: `src/router/modules/device.routes.ts`
- Create: `src/router/modules/reservation.routes.ts`
- Create: `src/router/modules/borrow.routes.ts`
- Create: `src/router/modules/overdue.routes.ts`
- Create: `src/router/modules/ai.routes.ts`
- Create: `src/router/modules/admin.routes.ts`
- Create: `src/router/modules/notification.routes.ts`
- Create: `src/router/modules/statistics.routes.ts`
- Create: `src/router/modules/error.routes.ts`
- Create: `src/router/guards.ts`
- Modify: `src/router/index.ts`

- [ ] **Step 1: 定义路由模块**

每个路由模块文件导出 `RouteRecordRaw[]`。示例 `src/router/modules/auth.routes.ts`:

```typescript
import type { RouteRecordRaw } from 'vue-router'

const authRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { title: '登录', requiresAuth: false, layout: 'auth' },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/Register.vue'),
    meta: { title: '注册', requiresAuth: false, layout: 'auth' },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/auth/ForgotPassword.vue'),
    meta: { title: '忘记密码', requiresAuth: false, layout: 'auth' },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/views/auth/ResetPassword.vue'),
    meta: { title: '重置密码', requiresAuth: false, layout: 'auth' },
  },
]

export default authRoutes
```

关键路由 meta 字段:

- `requiresAuth`: 是否需要登录
- `roles`: 允许访问的角色数组（不设则所有登录用户可访问）
- `title`: 页面标题
- `layout`: 使用的布局组件 (`default` | `auth` | `blank`)

- [ ] **Step 2: 汇总路由表**

`src/router/routes.ts` 汇总所有路由模块，设置默认重定向 `/` → `/dashboard`。

- [ ] **Step 3: 实现路由守卫**

`src/router/guards.ts`:

```typescript
import type { Router } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { hasToken } from '@/utils/token'
import { useAuthStore } from '@/stores/modules/auth'

NProgress.configure({ showSpinner: false })

const whiteList = ['/login', '/register', '/forgot-password', '/reset-password']

export function setupRouterGuards(router: Router) {
  router.beforeEach(async (to, _from, next) => {
    NProgress.start()
    document.title = `${to.meta.title || ''} - 智能设备管理系统`

    if (hasToken()) {
      if (to.path === '/login') {
        next({ path: '/dashboard' })
        return
      }
      const authStore = useAuthStore()
      if (!authStore.userInfo) {
        try {
          await authStore.fetchUserInfo()
        } catch {
          authStore.resetState()
          next({ path: '/login', query: { redirect: to.fullPath } })
          return
        }
      }
      // 角色权限校验
      const requiredRoles = to.meta.roles as string[] | undefined
      if (requiredRoles && !requiredRoles.includes(authStore.currentRole)) {
        next({ path: '/403' })
        return
      }
      next()
    } else {
      if (whiteList.includes(to.path)) {
        next()
      } else {
        next({ path: '/login', query: { redirect: to.fullPath } })
      }
    }
  })

  router.afterEach(() => {
    NProgress.done()
  })
}
```

- [ ] **Step 4: 更新 router/index.ts**

```typescript
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { setupRouterGuards } from './guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

setupRouterGuards(router)

export default router
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: 实现完整路由系统与权限守卫"
```

---

### Task 12: 页面布局组件

**Files:**

- Create: `src/layouts/DefaultLayout.vue`
- Create: `src/layouts/AuthLayout.vue`
- Create: `src/layouts/BlankLayout.vue`
- Create: `src/components/layout/AppHeader.vue`
- Create: `src/components/layout/AppSidebar.vue`
- Create: `src/components/layout/AppBreadcrumb.vue`
- Modify: `src/App.vue`

- [ ] **Step 1: 实现 AppSidebar 侧边栏菜单**

`src/components/layout/AppSidebar.vue`:

- 使用 `el-menu` 组件
- 根据当前用户角色动态渲染菜单项
- 普通用户菜单: 首页、设备查询、我的预约、借还记录、逾期记录、AI 对话、通知中心
- 设备管理员菜单: 首页、设备管理、分类管理、预约审核、借还管理、逾期管理、通知中心
- 系统管理员菜单: 首页、用户管理、角色权限、设备管理、分类管理、预约管理、统计分析、Prompt 模板、通知中心
- 支持折叠/展开

- [ ] **Step 2: 实现 AppHeader 顶部导航**

`src/components/layout/AppHeader.vue`:

- 左侧: 折叠按钮 + 面包屑
- 右侧: 通知铃铛（显示未读数 Badge）+ 用户头像下拉菜单（个人中心、修改密码、退出登录）

- [ ] **Step 3: 实现 DefaultLayout 默认布局**

`src/layouts/DefaultLayout.vue`:

```vue
<template>
  <el-container class="layout-container">
    <AppSidebar />
    <el-container>
      <el-header><AppHeader /></el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>
```

- [ ] **Step 4: 实现 AuthLayout 认证页布局**

`src/layouts/AuthLayout.vue`:

- 居中卡片式布局，用于登录/注册/密码重置页面
- 顶部展示系统 Logo 和名称

- [ ] **Step 5: 更新 App.vue**

```vue
<template>
  <component :is="currentLayout">
    <router-view />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import BlankLayout from '@/layouts/BlankLayout.vue'

const route = useRoute()
const layoutMap = { default: DefaultLayout, auth: AuthLayout, blank: BlankLayout }
const currentLayout = computed(
  () => layoutMap[route.meta.layout as keyof typeof layoutMap] || DefaultLayout,
)
</script>
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: 实现页面布局组件（Header/Sidebar/Layouts）"
```

---

## Chunk 4: 认证与用户模块页面

> 登录、注册、密码找回/重置、个人中心

### Task 13: 登录页面

**Files:**

- Create: `src/views/auth/Login.vue`

- [ ] **Step 1: 实现登录页面**

`src/views/auth/Login.vue`:

- 表单字段: 账号（用户名或邮箱）、密码
- 表单验证: 必填校验
- 登录成功后跳转到 redirect 参数指定的页面或 /dashboard
- 底部链接: "没有账号？去注册" / "忘记密码？"
- 使用 Element Plus 的 `el-form` + `el-input` + `el-button`

- [ ] **Step 2: 验证登录流程**

启动前后端，手动测试登录流程。

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: 实现登录页面"
```

---

### Task 14: 注册页面

**Files:**

- Create: `src/views/auth/Register.vue`

- [ ] **Step 1: 实现注册页面**

- 表单字段: 用户名、邮箱、密码、确认密码、姓名、手机号（选填）
- 表单验证: 用户名必填、邮箱格式、密码复杂度(>=8位含数字+字母)、确认密码一致
- 注册成功自动登录（后端返回 Token）

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: 实现注册页面"
```

---

### Task 15: 忘记密码与重置密码页面

**Files:**

- Create: `src/views/auth/ForgotPassword.vue`
- Create: `src/views/auth/ResetPassword.vue`

- [ ] **Step 1: 实现忘记密码页面**

`src/views/auth/ForgotPassword.vue`:

- 输入邮箱 → 发送验证码
- 倒计时 60 秒防重复发送
- 输入验证码 + 新密码 + 确认密码
- 成功后跳转登录页

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: 实现忘记密码与重置密码页面"
```

---

### Task 16: 个人中心与修改密码

**Files:**

- Create: `src/views/user/Profile.vue`
- Create: `src/components/form/ResetPasswordForm.vue`

- [ ] **Step 1: 实现个人中心页面**

`src/views/user/Profile.vue`:

- 展示当前用户信息（用户名、邮箱、姓名、手机号、角色）
- 编辑个人信息（姓名、手机号）
- 修改密码功能（弹窗表单: 旧密码 + 新密码 + 确认密码）

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: 实现个人中心与修改密码功能"
```

---

### Task 17: 仪表盘页面

**Files:**

- Create: `src/views/dashboard/index.vue`
- Create: `src/views/dashboard/UserDashboard.vue`
- Create: `src/views/dashboard/AdminDashboard.vue`

- [ ] **Step 1: 实现仪表盘入口（角色分流）**

`src/views/dashboard/index.vue`:

- 根据当前用户角色渲染对应的仪表盘组件

- [ ] **Step 2: 实现用户仪表盘**

`src/views/dashboard/UserDashboard.vue`:

- 欢迎信息卡片
- 我的近期预约列表（最近5条）
- 待签到提醒
- AI 对话入口快捷按钮

- [ ] **Step 3: 实现管理员仪表盘**

`src/views/dashboard/AdminDashboard.vue`:

- 统计概览卡片组（设备总数、今日预约、今日借用、逾期待处理）
- 待审核预约数量提醒
- 快捷操作入口

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: 实现仪表盘页面（用户/管理员）"
```

---

## Chunk 5: 设备管理模块页面

### Task 18: 通用业务组件

**Files:**

- Create: `src/components/common/Pagination.vue`
- Create: `src/components/common/SearchBar.vue`
- Create: `src/components/common/ConfirmDialog.vue`
- Create: `src/components/common/EmptyState.vue`
- Create: `src/components/business/DeviceStatusTag.vue`
- Create: `src/components/business/FreezeStatusTag.vue`

- [ ] **Step 1: 实现通用分页组件**

`src/components/common/Pagination.vue`:

```vue
<template>
  <div class="pagination-wrapper">
    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :total="total"
      :page-sizes="[10, 20, 50, 100]"
      layout="total, sizes, prev, pager, next, jumper"
      @size-change="emit('change')"
      @current-change="emit('change')"
    />
  </div>
</template>
```

- [ ] **Step 2: 实现状态标签组件**

`src/components/business/DeviceStatusTag.vue`:

```vue
<template>
  <el-tag :type="tagType">{{ label }}</el-tag>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { DeviceStatusLabel, DeviceStatusTagType, type DeviceStatus } from '@/enums/DeviceStatus'
const props = defineProps<{ status: DeviceStatus }>()
const label = computed(() => DeviceStatusLabel[props.status] || props.status)
const tagType = computed(() => DeviceStatusTagType[props.status] || 'info')
</script>
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: 实现通用组件与业务状态标签组件"
```

---

### Task 19: 设备列表页面

**Files:**

- Create: `src/views/device/List.vue`
- Create: `src/components/business/DeviceCard.vue`

- [ ] **Step 1: 实现设备列表页面**

`src/views/device/List.vue`:

- 搜索筛选区: 按分类名称筛选
- 数据表格: 设备名称、编号、分类、状态、位置、操作
- 操作列: 查看详情、编辑（管理员）、删除（管理员）、状态变更（管理员）
- 分页组件
- 新增设备按钮（管理员可见）

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: 实现设备列表页面"
```

---

### Task 20: 设备创建/编辑/详情页面

**Files:**

- Create: `src/views/device/Create.vue`
- Create: `src/views/device/Edit.vue`
- Create: `src/views/device/Detail.vue`
- Create: `src/components/form/DeviceForm.vue`

- [ ] **Step 1: 实现设备表单组件**

`src/components/form/DeviceForm.vue`:

- 字段: 设备名称、设备编号(仅创建时可编辑)、分类（从分类树选择）、状态、位置、描述
- 表单验证: 名称必填、编号必填
- 支持创建模式和编辑模式

- [ ] **Step 2: 实现设备详情页面**

`src/views/device/Detail.vue`:

- 展示设备完整信息 + 设备图片
- 设备状态变更记录时间线
- 图片上传功能（管理员可见）

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: 实现设备创建/编辑/详情页面"
```

---

### Task 21: 设备分类管理页面

**Files:**

- Create: `src/views/device/category/List.vue`
- Create: `src/views/device/category/Manage.vue`
- Create: `src/components/form/CategoryForm.vue`

- [ ] **Step 1: 实现分类列表（树形展示）**

`src/views/device/category/List.vue`:

- 使用 `el-tree` 或 `el-table` tree 模式展示分类层级
- 显示分类名称、描述、默认审批模式、排序

- [ ] **Step 2: 实现分类管理**

`src/views/device/category/Manage.vue`:

- 新增分类弹窗表单
- 字段: 名称、父分类、排序、描述、默认审批模式

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: 实现设备分类管理页面"
```

---

## Chunk 6: 预约管理模块页面

### Task 22: 预约列表页面

**Files:**

- Create: `src/views/reservation/List.vue`
- Create: `src/components/business/ReservationCard.vue`

- [ ] **Step 1: 实现预约列表页面**

`src/views/reservation/List.vue`:

- 普通用户: 仅显示本人预约
- 管理员: 显示所有预约
- 列表展示: 设备名称、预约时间段、状态、签到状态、操作
- 操作按钮: 查看详情、签到（条件可见）、取消（条件可见）

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: 实现预约列表页面"
```

---

### Task 23: 创建预约页面

**Files:**

- Create: `src/views/reservation/Create.vue`
- Create: `src/components/form/ReservationForm.vue`
- Create: `src/components/business/TimeRangePicker.vue`
- Create: `src/components/business/ConflictWarning.vue`

- [ ] **Step 1: 实现预约表单组件**

`src/components/form/ReservationForm.vue`:

- 选择设备（从可用设备列表）
- 选择时间范围（开始时间 + 结束时间）
- 预约用途（必填）
- 备注（选填）
- 实时冲突检测提示

- [ ] **Step 2: 实现创建预约页面**

`src/views/reservation/Create.vue`:

- 集成预约表单
- 提交前确认弹窗
- 系统管理员可选择代预约模式（选择目标用户）

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: 实现创建预约页面"
```

---

### Task 24: 预约详情与签到页面

**Files:**

- Create: `src/views/reservation/Detail.vue`
- Create: `src/views/reservation/CheckIn.vue`
- Create: `src/components/business/ReservationTimeline.vue`

- [ ] **Step 1: 实现预约详情页面**

`src/views/reservation/Detail.vue`:

- 预约基本信息展示
- 预约状态流转时间线
- 审批信息展示

- [ ] **Step 2: 实现签到页面**

`src/views/reservation/CheckIn.vue`:

- 显示预约信息
- 一键签到按钮
- 签到状态反馈（正常签到 / 超时签到）

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: 实现预约详情与签到页面"
```

---

### Task 25: 预约审核管理页面（管理员）

**Files:**

- Create: `src/views/reservation/manage/Pending.vue`
- Create: `src/views/reservation/manage/History.vue`
- Create: `src/components/business/ManualProcessDialog.vue`

- [ ] **Step 1: 实现待审核列表页面**

`src/views/reservation/manage/Pending.vue`:

- 设备管理员: 显示待一审 (`PENDING_DEVICE_APPROVAL`) + 待人工处理 (`PENDING_MANUAL`)
- 系统管理员: 显示待二审 (`PENDING_SYSTEM_APPROVAL`)
- 操作: 通过、拒绝（带原因）
- 人工处理弹窗: 确认借用 / 取消预约

- [ ] **Step 2: 实现审批历史页面**

`src/views/reservation/manage/History.vue`:

- 已审批/已处理的预约历史

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: 实现预约审核管理页面"
```

---

## Chunk 7: 借还与逾期管理页面

### Task 26: 借还管理页面

**Files:**

- Create: `src/views/borrow/List.vue`
- Create: `src/views/borrow/Detail.vue`
- Create: `src/views/borrow/Confirm.vue`
- Create: `src/views/borrow/Return.vue`

- [ ] **Step 1: 实现借还记录列表**

`src/views/borrow/List.vue`:

- 数据表格: 设备信息、借用人、借用时间、预计归还时间、状态、操作
- 普通用户: 仅看本人记录
- 设备管理员: 可看全部记录 + 操作按钮

- [ ] **Step 2: 实现借用确认页面（设备管理员）**

`src/views/borrow/Confirm.vue`:

- 选择待确认借用的预约（状态为 APPROVED + 已签到的）
- 确认借用 → 生成借用记录

- [ ] **Step 3: 实现归还确认页面（设备管理员）**

`src/views/borrow/Return.vue`:

- 选择待归还的借用记录（状态为 BORROWED）
- 确认归还 → 设备恢复可用

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: 实现借还管理页面"
```

---

### Task 27: 逾期管理页面

**Files:**

- Create: `src/views/overdue/List.vue`
- Create: `src/views/overdue/Detail.vue`
- Create: `src/views/overdue/Handle.vue`
- Create: `src/components/business/OverdueAlert.vue`

- [ ] **Step 1: 实现逾期列表与详情**

`src/views/overdue/List.vue`:

- 数据表格: 设备信息、借用人、逾期时长、处理状态、操作
- 状态筛选: 待处理 / 已处理

- [ ] **Step 2: 实现逾期处理页面（设备管理员）**

`src/views/overdue/Handle.vue`:

- 处理方式选择: 警告 / 赔偿 / 继续使用
- 处理备注
- 赔偿金额（赔偿模式时）

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: 实现逾期管理页面"
```

---

## Chunk 8: 通知、AI 对话、统计分析页面

### Task 28: 通知中心页面

**Files:**

- Create: `src/views/notification/List.vue`
- Create: `src/components/business/NotificationItem.vue`

- [ ] **Step 1: 实现通知列表页面**

`src/views/notification/List.vue`:

- 通知列表: 类型图标、标题、内容摘要、时间、已读状态
- 操作: 标记单条已读、全部已读
- 通知类型筛选
- 通知未读数 Badge 在 Header 中同步更新

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: 实现通知中心页面"
```

---

### Task 29: AI 对话页面

**Files:**

- Create: `src/views/ai/Chat.vue`
- Create: `src/views/ai/History.vue`
- Create: `src/components/business/AiChatBox.vue`
- Create: `src/components/business/AiMessage.vue`
- Create: `src/composables/useAiChat.ts`

- [ ] **Step 1: 实现 AI 对话组合式函数**

`src/composables/useAiChat.ts`:

- 管理消息列表 (用户消息 + AI 回复)
- 维护 sessionId
- 发送消息 → 调用 API → 追加回复
- 加载状态管理

- [ ] **Step 2: 实现 AI 对话页面**

`src/views/ai/Chat.vue`:

- 类 IM 聊天界面布局
- 消息列表区域（自动滚动到底部）
- 输入框 + 发送按钮
- 展示 AI 意图识别结果

- [ ] **Step 3: 实现对话历史页面**

`src/views/ai/History.vue`:

- 历史会话列表
- 点击查看对话详情

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: 实现 AI 对话页面与对话历史"
```

---

### Task 30: 统计分析页面

**Files:**

- Create: `src/views/statistics/Overview.vue`
- Create: `src/views/statistics/DeviceUsage.vue`
- Create: `src/views/statistics/BorrowStats.vue`
- Create: `src/views/statistics/OverdueStats.vue`
- Create: `src/views/statistics/HotTimeSlots.vue`
- Create: `src/components/business/StatisticsCard.vue`

> 注意: 图表展示需要安装 ECharts

- [ ] **Step 1: 安装 ECharts**

```bash
npm install echarts vue-echarts
```

- [ ] **Step 2: 实现统计总览页面**

`src/views/statistics/Overview.vue`:

- 顶部统计卡片组（今日预约数、借用数、归还数、逾期数、利用率）
- 日期选择器
- 调用 `GET /api/statistics/overview`

- [ ] **Step 3: 实现设备利用率页面**

`src/views/statistics/DeviceUsage.vue`:

- 设备利用率排行表格
- 设备/分类利用率柱状图

- [ ] **Step 4: 实现借用统计页面**

`src/views/statistics/BorrowStats.vue`:

- 借用趋势折线图
- 设备排名 TOP10
- 用户排名 TOP10

- [ ] **Step 5: 实现热门时段页面**

`src/views/statistics/HotTimeSlots.vue`:

- 热力图展示各时段预约量

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: 实现统计分析页面（ECharts 图表）"
```

---

## Chunk 9: 系统管理页面

### Task 31: 用户管理页面（系统管理员）

**Files:**

- Create: `src/views/user/List.vue`
- Create: `src/views/user/Detail.vue`
- Create: `src/views/user/Freeze.vue`
- Create: `src/views/user/RoleAssign.vue`

- [ ] **Step 1: 实现用户列表页面**

`src/views/user/List.vue`:

- 用户列表: 用户名、邮箱、姓名、角色、状态、冻结状态
- 操作: 查看详情、修改状态、分配角色、冻结/解冻

- [ ] **Step 2: 实现用户详情页面**

`src/views/user/Detail.vue`:

- 用户详细信息展示

- [ ] **Step 3: 实现冻结管理与角色分配**

- `Freeze.vue`: 冻结/解冻操作弹窗，填写原因
- `RoleAssign.vue`: 选择角色下拉框

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: 实现用户管理页面（系统管理员）"
```

---

### Task 32: 角色权限管理页面

**Files:**

- Create: `src/views/admin/RolePermission.vue`
- Create: `src/components/business/PermissionTree.vue`

- [ ] **Step 1: 实现角色权限配置页面**

`src/views/admin/RolePermission.vue`:

- 角色列表（3个固定角色）
- 选中角色后展示权限树
- 权限树勾选 + 保存

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: 实现角色权限管理页面"
```

---

### Task 33: Prompt 模板管理页面

**Files:**

- Create: `src/views/admin/PromptTemplate.vue`

- [ ] **Step 1: 实现 Prompt 模板管理页面**

`src/views/admin/PromptTemplate.vue`:

- 模板列表: 名称、编码、类型、版本、启用状态
- 新增/编辑弹窗表单
- 字段: 名称、编码、类型（下拉选择）、内容（文本域）、变量（JSON 编辑）、版本号、启用状态

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: 实现 Prompt 模板管理页面"
```

---

## Chunk 10: 错误页面、权限指令与联调收尾

### Task 34: 错误页面

**Files:**

- Create: `src/views/error/404.vue`
- Create: `src/views/error/403.vue`
- Create: `src/views/error/500.vue`

- [ ] **Step 1: 实现 404/403/500 错误页面**

每个错误页面包含:

- 错误码大字展示
- 错误描述文字
- 返回首页按钮

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: 实现错误页面（404/403/500）"
```

---

### Task 35: 权限指令

**Files:**

- Create: `src/directives/index.ts`
- Create: `src/directives/permission.ts`
- Modify: `src/main.ts` (注册指令)

- [ ] **Step 1: 实现权限指令**

`src/directives/permission.ts`:

```typescript
import type { Directive } from 'vue'
import { useAuthStore } from '@/stores/modules/auth'

/** v-permission="['SYSTEM_ADMIN']" 或 v-permission="'DEVICE_ADMIN'" */
export const permission: Directive = {
  mounted(el: HTMLElement, binding) {
    const authStore = useAuthStore()
    const roles = Array.isArray(binding.value) ? binding.value : [binding.value]
    if (!roles.includes(authStore.currentRole)) {
      el.parentNode?.removeChild(el)
    }
  },
}
```

- [ ] **Step 2: 在 main.ts 注册指令**

```typescript
import { permission } from '@/directives/permission'
app.directive('permission', permission)
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: 实现权限指令 v-permission"
```

---

### Task 36: 前后端联调验证

**Files:**

- 无新文件，验证已有功能

- [ ] **Step 1: 启动后端服务**

```bash
# 在后端项目目录执行
cd /mnt/d/WorkSpace/device-management-backend
mvn spring-boot:run
```

Expected: Spring Boot 启动在 8080 端口

- [ ] **Step 2: 启动前端开发服务**

```bash
npm run dev
```

Expected: Vite 启动在 5173 端口

- [ ] **Step 3: 验证认证流程**

1. 访问 `http://localhost:5173/login`
2. 注册新用户 → 验证自动登录 → 验证用户信息展示
3. 登出 → 重新登录 → 验证 Token 存储
4. 验证路由守卫（未登录访问 /dashboard 应跳转 /login）

- [ ] **Step 4: 验证 API 代理**

1. 验证设备列表 GET 请求通过代理转发到后端
2. 验证请求头携带 Authorization
3. 验证错误响应处理（如 401、403）

- [ ] **Step 5: 验证核心业务流程**

1. 普通用户: 查看设备 → 创建预约 → 签到
2. 设备管理员: 审核预约 → 借用确认 → 归还确认
3. 系统管理员: 用户管理 → 统计分析

- [ ] **Step 6: 修复联调问题**

根据联调测试发现的问题进行修复。

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "fix: 修复前后端联调问题"
```

---

### Task 37: TypeScript 类型检查与构建验证

- [ ] **Step 1: 运行类型检查**

```bash
npm run type-check
```

Expected: 无 TypeScript 类型错误

- [ ] **Step 2: 运行构建**

```bash
npm run build
```

Expected: 构建成功，产出 dist/ 目录

- [ ] **Step 3: 修复类型错误和构建问题**

如有错误，逐一修复。

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "fix: 修复 TypeScript 类型检查与构建问题"
```

---

## 文件清单总览

### 需要创建的文件（约 100+ 文件）

```
src/
├── api/                         (24 文件: 12 模块 × 2 文件)
│   ├── request.ts
│   ├── index.ts
│   ├── auth/                    { index.ts, types.ts }
│   ├── devices/                 { index.ts, types.ts }
│   ├── categories/              { index.ts, types.ts }
│   ├── reservations/            { index.ts, types.ts }
│   ├── borrow-records/          { index.ts, types.ts }
│   ├── overdue/                 { index.ts, types.ts }
│   ├── notifications/           { index.ts, types.ts }
│   ├── statistics/              { index.ts, types.ts }
│   ├── ai/                      { index.ts, types.ts }
│   ├── prompt-templates/        { index.ts, types.ts }
│   ├── users/                   { index.ts, types.ts }
│   └── roles/                   { index.ts, types.ts }
│
├── assets/styles/               (4 文件)
│   ├── index.scss
│   ├── variables.scss
│   ├── reset.scss
│   └── element-override.scss
│
├── components/                  (20+ 文件)
│   ├── common/                  { Pagination, SearchBar, ConfirmDialog, EmptyState }
│   ├── layout/                  { AppHeader, AppSidebar, AppBreadcrumb }
│   ├── business/                { DeviceStatusTag, FreezeStatusTag, DeviceCard,
│   │                              ReservationCard, ReservationTimeline, TimeRangePicker,
│   │                              ConflictWarning, OverdueAlert, AiChatBox, AiMessage,
│   │                              StatisticsCard, NotificationItem, PermissionTree,
│   │                              ManualProcessDialog, PermissionButton }
│   └── form/                    { DeviceForm, ReservationForm, CategoryForm,
│                                  UserForm, ResetPasswordForm }
│
├── composables/                 (1+ 文件)
│   └── useAiChat.ts
│
├── constants/                   (2 文件)
│   ├── index.ts
│   └── storage.ts
│
├── directives/                  (2 文件)
│   ├── index.ts
│   └── permission.ts
│
├── enums/                       (11 文件)
│   ├── index.ts
│   ├── UserRole.ts, DeviceStatus.ts, ReservationStatus.ts
│   ├── CheckInStatus.ts, BorrowStatus.ts, OverdueStatus.ts
│   ├── FreezeStatus.ts, NotificationType.ts, ApprovalMode.ts
│   └── AiIntentType.ts
│
├── layouts/                     (3 文件)
│   ├── DefaultLayout.vue
│   ├── AuthLayout.vue
│   └── BlankLayout.vue
│
├── router/                      (13 文件)
│   ├── index.ts, routes.ts, guards.ts
│   └── modules/                 { auth, device, reservation, borrow,
│                                  overdue, ai, admin, notification,
│                                  statistics, error }
│
├── stores/                      (12 文件)
│   ├── index.ts
│   └── modules/                 { auth, user, device, reservation,
│                                  borrow, overdue, ai, notification,
│                                  statistics, app }
│
├── types/                       (2 文件)
│   ├── global.d.ts
│   └── env.d.ts
│
├── utils/                       (5 文件)
│   ├── index.ts, token.ts, storage.ts
│   ├── date.ts, format.ts, validate.ts
│
├── views/                       (35+ 文件)
│   ├── auth/                    { Login, Register, ForgotPassword, ResetPassword }
│   ├── dashboard/               { index, UserDashboard, AdminDashboard }
│   ├── user/                    { Profile, List, Detail, Freeze, RoleAssign }
│   ├── admin/                   { PromptTemplate, RolePermission }
│   ├── notification/            { List }
│   ├── device/                  { List, Detail, Create, Edit }
│   │   └── category/            { List, Manage }
│   ├── reservation/             { List, Detail, Create, CheckIn }
│   │   └── manage/              { Pending, History }
│   ├── borrow/                  { List, Detail, Confirm, Return }
│   ├── overdue/                 { List, Detail, Handle }
│   ├── ai/                      { Chat, History }
│   ├── statistics/              { Overview, DeviceUsage, BorrowStats,
│   │                              OverdueStats, HotTimeSlots }
│   └── error/                   { 404, 403, 500 }
│
├── App.vue (修改)
├── main.ts (修改)
│
.env.development (创建)
.env.production (创建)
vite.config.ts (修改)
```

---

## 实施优先级与里程碑

| 里程碑           | 对应 Chunk | 核心交付物                          | 预估工时 |
| ---------------- | ---------- | ----------------------------------- | -------- |
| M1: 项目骨架     | Chunk 1    | 依赖安装、构建配置、枚举/类型/工具  | 1-2h     |
| M2: API 与状态   | Chunk 2    | 全部 API 层 + Pinia Store           | 2-3h     |
| M3: 路由与布局   | Chunk 3    | 路由守卫、布局组件、导航菜单        | 1-2h     |
| M4: 认证模块     | Chunk 4    | 登录/注册/密码重置/个人中心/仪表盘  | 2-3h     |
| M5: 设备模块     | Chunk 5    | 设备 CRUD + 分类管理                | 2-3h     |
| M6: 预约模块     | Chunk 6    | 预约创建/审核/签到/人工处理         | 3-4h     |
| M7: 借还与逾期   | Chunk 7    | 借还管理 + 逾期管理                 | 2-3h     |
| M8: 通知/AI/统计 | Chunk 8    | 通知中心 + AI 对话 + 统计图表       | 3-4h     |
| M9: 系统管理     | Chunk 9    | 用户管理 + 角色权限 + Prompt 管理   | 2-3h     |
| M10: 联调收尾    | Chunk 10   | 错误页 + 权限指令 + 联调验证 + 构建 | 2-3h     |

**总预估工时: 20-30 小时**

---

## 关键约束与注意事项

1. **后端 CORS 未完全配置**: application.yml 声明了 allowed-origins 但代码中无对应实现。通过 Vite `server.proxy` 绕过此问题，但生产部署需要 Nginx 反向代理或后端补充 CORS 配置。

2. **ID 均为 UUID 字符串**: 所有实体 ID 为 `VARCHAR(36)` UUID，前端需使用 `string` 类型。

3. **时间格式**: 后端使用 `LocalDateTime`，JSON 序列化为 ISO 格式 `2024-01-01T10:00:00`。前端发送时也需使用此格式。

4. **分页约定**: `page` 从 1 开始，`size` 默认 10。

5. **Token 管理**: Access Token 24h 有效，Refresh Token 7 天有效。当前后端无刷新 Token 接口，401 时直接跳转登录页。

6. **角色互斥**:
   - `DEVICE_ADMIN` 不能创建预约
   - `SYSTEM_ADMIN` 不参与借还确认和逾期处理
   - 同一用户不能同时完成一审和二审

7. **AI 模块仅对 USER 角色开放**: DEVICE_ADMIN 和 SYSTEM_ADMIN 无法访问 AI 对话。

8. **文件上传**: 使用 `multipart/form-data`，字段名 `file`，最大 10MB。
