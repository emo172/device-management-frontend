# Auth Pages Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 4 个公开认证路由重构为统一的去卡片化双栏布局，并完成登录、注册、忘记密码、重置密码页面的图标与文案更新，同时保持现有认证逻辑与测试约束不变。

**Architecture:** 保留现有 `auth` 布局与页面路由关系，不新增大的认证组件。`AuthLayout.vue` 改为基于当前路由渲染左侧 Hero 配置，右侧不再提供实体卡片壳层；具体页面继续负责右栏表单与动作区，公共排版收敛在 `src/assets/styles/_auth-pages.scss`。密码相关页面继续共用 `PasswordResetPanel.vue`，仅通过 props 调整场景文案。

**Tech Stack:** Vue 3 `<script setup>`、TypeScript、Vue Router、Element Plus、SCSS、Vitest、Vue Test Utils

---

## 文件结构与职责

- `src/layouts/AuthLayout.vue`
  - 认证公开布局母版
  - 根据当前路由名渲染左栏品牌标题、说明、图标列表与补充说明
  - 保留 `auth-layout`、`auth-layout__hero-panel`、`auth-layout__content-panel` 供现有测试继续识别
- `src/assets/styles/_auth-pages.scss`
  - 认证页共享排版、间距、输入框、动作区与去卡片化右栏样式基线
- `src/views/auth/Login.vue`
  - 登录页标题、说明、按钮文案与底部链接布局
- `src/views/auth/Register.vue`
  - 注册页标题、说明、双列表单区与底部登录入口
- `src/views/auth/components/PasswordResetPanel.vue`
  - 忘记密码 / 重置密码公共表单
  - 保留输入框 `name`、验证码按钮 `data-testid`、倒计时与提交逻辑
- `src/views/auth/ForgotPassword.vue`
  - 忘记密码页传入文案
- `src/views/auth/ResetPassword.vue`
  - 重置密码页传入文案
- `src/__tests__/App.spec.ts`
  - 锁定认证布局渲染契约与左栏新内容
- `src/views/auth/__tests__/auth-pages.spec.ts`
  - 锁定登录、注册、忘记密码、重置密码的新文案与页脚规则，同时回归原有认证行为

## 实施约束

- 不修改 `/login`、`/register`、`/forgot-password`、`/reset-password` 路由路径
- 不修改登录、注册、发送验证码、重置密码的调用逻辑
- 不移除现有测试依赖的类名：`.auth-panel__surface`、`.auth-panel__actions`、`.auth-layout__hero-panel`、`.auth-layout__content-panel`
- 不修改各输入框的 `name` 属性与验证码按钮的 `[data-testid="send-code-button"]`
- 所有新增或修改的关键布局、路由判断与复用逻辑补齐中文注释

---

### Task 1: 锁定共享认证布局契约并实现去卡片化母版

**Files:**

- Modify: `src/__tests__/App.spec.ts`
- Modify: `src/layouts/AuthLayout.vue`

- [ ] **Step 1: 先为新布局补充失败中的测试断言**

在 `src/__tests__/App.spec.ts` 里扩展 `routeState`，让它同时支持 `name` 与 `meta`，并在认证路由用例里先写出新左栏内容断言：

```ts
const routeState = {
  name: 'Login',
  meta: {} as Record<string, unknown>,
}

it('在认证路由下切换到 AuthLayout', () => {
  routeState.name = 'Login'
  routeState.meta = { layout: 'auth' }

  const wrapper = mount(App)

  expect(wrapper.find('.auth-layout').exists()).toBe(true)
  expect(wrapper.find('.auth-layout__hero-panel').exists()).toBe(true)
  expect(wrapper.find('.auth-layout__content-panel').exists()).toBe(true)
  expect(wrapper.text()).toContain('智能设备管理系统')
  expect(wrapper.text()).toContain('设备信息集中查看')
  expect(wrapper.text()).toContain('通知与状态同步')
})
```

- [ ] **Step 2: 运行测试，确认新断言先失败**

Run: `npm run test:unit -- src/__tests__/App.spec.ts`

Expected: FAIL，提示认证布局中缺少新增的左栏能力文案。

- [ ] **Step 3: 改造 `AuthLayout.vue` 为按路由切换的双栏画布**

在 `src/layouts/AuthLayout.vue` 中移除 `ConsolePageHero` 依赖，直接写布局。用 `useRoute()` + 配置映射维护不同路由的左栏内容，并用 Element Plus 图标做克制的能力提示。

```ts
import { Bell, Connection, Monitor } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

interface AuthFeatureItem {
  title: string
  description: string
  icon: Component
  tone: 'blue' | 'teal' | 'amber'
}

interface AuthHeroContent {
  eyebrow: string
  title: string
  description: string
  note?: string
  features: AuthFeatureItem[]
}

const route = useRoute()

const authHeroMap: Record<string, AuthHeroContent> = {
  Login: { ... },
  Register: { ... },
  ForgotPassword: { ... },
  ResetPassword: { ... },
}

const heroContent = computed(() => authHeroMap[String(route.name)] ?? authHeroMap.Login)
```

模板保留测试类名，但改成去卡片化结构：

```vue
<main class="auth-layout">
  <section class="auth-layout__shell">
    <section class="auth-layout__hero-panel">
      <p class="auth-layout__eyebrow">{{ heroContent.eyebrow }}</p>
      <h1 class="auth-layout__title">{{ heroContent.title }}</h1>
      <p class="auth-layout__description">{{ heroContent.description }}</p>
      <ul class="auth-layout__feature-list">
        <li v-for="feature in heroContent.features" :key="feature.title">
          <component :is="feature.icon" />
          <div>
            <strong>{{ feature.title }}</strong>
            <span>{{ feature.description }}</span>
          </div>
        </li>
      </ul>
    </section>

    <div class="auth-layout__content-panel">
      <slot />
    </div>
  </section>
</main>
```

样式目标：

- 外层保留浅色渐变背景
- `auth-layout__content-panel` 不再使用 `console-solid-surface`
- 用左右留白、边线、分栏比例建立层次，而不是白色大卡片
- `<960px` 仍退化为单栏，保持现有桌面内缩兼容

- [ ] **Step 4: 运行测试确认共享布局通过**

Run: `npm run test:unit -- src/__tests__/App.spec.ts`

Expected: PASS，且认证布局用例能找到保留类名和新左栏文案。

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/App.spec.ts src/layouts/AuthLayout.vue
git commit -m "feat(layout): 重构认证页去卡片化双栏母版"
```

---

### Task 2: 锁定登录 / 注册页文案契约并实现右栏重排

**Files:**

- Modify: `src/views/auth/__tests__/auth-pages.spec.ts`
- Modify: `src/assets/styles/_auth-pages.scss`
- Modify: `src/views/auth/Login.vue`
- Modify: `src/views/auth/Register.vue`

- [ ] **Step 1: 先把登录 / 注册页的新文案写进测试**

在 `src/views/auth/__tests__/auth-pages.spec.ts` 中补充登录页与注册页的标题、说明、按钮文案断言，保留原有行为断言：

```ts
it('登录成功后优先跳转 redirect 参数', async () => {
  // ... existing setup
  expect(wrapper.text()).toContain('进入设备管理工作台')
  expect(wrapper.text()).toContain('登录并继续')
  expect(wrapper.text()).toContain('没有账号？去注册')
  expect(wrapper.text()).toContain('忘记密码？')
})

it('注册页会阻止无效表单提交', async () => {
  // ... existing setup
  expect(wrapper.text()).toContain('注册系统账号')
  expect(wrapper.text()).toContain('已有账号？去登录')
})
```

- [ ] **Step 2: 运行登录 / 注册页测试，确认断言先失败**

Run: `npm run test:unit -- src/views/auth/__tests__/auth-pages.spec.ts`

Expected: FAIL，登录页和注册页仍然是旧标题 / 旧描述。

- [ ] **Step 3: 先重写共享样式基线，去掉“表单卡片”假设**

在 `src/assets/styles/_auth-pages.scss` 中保留 `.auth-panel__surface`、`.auth-panel__actions` 等类名，但把它们变成右栏内的排版容器，而不是卡片壳层。

```scss
.auth-panel__surface {
  width: 100%;
  max-width: 420px;
  min-height: 100%;
  margin: 0 auto;
}

.auth-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.auth-form :is(.el-input__wrapper, .el-select__wrapper) {
  background: rgba(255, 255, 255, 0.92);
  border-radius: var(--app-radius-sm);
}
```

样式实现时补充中文注释，说明为什么保留实体输入框、为什么 actions 区继续集中到底部。

- [ ] **Step 4: 更新 `Login.vue` 的标题、说明与提交文案**

目标：

- 标题改为“进入设备管理工作台”
- 说明改为“使用账号或注册邮箱登录，继续处理你的设备查询、预约与审批相关工作。”
- 提交按钮改为“登录并继续”
- 保留输入框 `name="account"`、`name="password"`、提交逻辑与双链接

示例：

```vue
<p class="auth-panel__eyebrow">Auth / Login</p>
<h1 class="auth-panel__title">进入设备管理工作台</h1>
<p class="auth-panel__description">
  使用账号或注册邮箱登录，继续处理你的设备查询、预约与审批相关工作。
</p>
```

- [ ] **Step 5: 更新 `Register.vue` 的标题、说明与表单节奏**

目标：

- 标题改为“注册系统账号”
- 说明改为“填写基础资料后即可完成注册，进入系统继续进行设备预约与个人操作。”
- 保留双列表单字段与 `注册并进入系统` 按钮
- 让 `.auth-form__grid` 继续在宽度不足时退化为单列

示例：

```vue
<p class="auth-panel__eyebrow">Auth / Register</p>
<h1 class="auth-panel__title">注册系统账号</h1>
<p class="auth-panel__description">
  填写基础资料后即可完成注册，进入系统继续进行设备预约与个人操作。
</p>
```

- [ ] **Step 6: 运行认证页测试确认登录 / 注册回归通过**

Run: `npm run test:unit -- src/views/auth/__tests__/auth-pages.spec.ts`

Expected: PASS，登录 / 注册相关用例保留原行为，并匹配新文案。

- [ ] **Step 7: Commit**

```bash
git add src/assets/styles/_auth-pages.scss src/views/auth/Login.vue src/views/auth/Register.vue src/views/auth/__tests__/auth-pages.spec.ts
git commit -m "feat(auth): 更新登录注册页布局与文案"
```

---

### Task 3: 锁定密码相关页契约并更新共享面板

**Files:**

- Modify: `src/views/auth/__tests__/auth-pages.spec.ts`
- Modify: `src/views/auth/components/PasswordResetPanel.vue`
- Modify: `src/views/auth/ForgotPassword.vue`
- Modify: `src/views/auth/ResetPassword.vue`

- [ ] **Step 1: 先补密码页的新文案和页脚规则测试**

在 `src/views/auth/__tests__/auth-pages.spec.ts` 中为忘记密码页与重置密码页补充断言：

```ts
it('忘记密码页发送验证码后会进入 60 秒倒计时', async () => {
  // ... existing setup
  expect(wrapper.text()).toContain('重置登录密码')
  expect(wrapper.text()).toContain('返回登录')
  expect(wrapper.text()).not.toContain('注册新账号')
})

it('重置密码页提交成功后会调用重置接口并返回登录页', async () => {
  // ... existing setup
  expect(wrapper.text()).toContain('重置登录密码')
  expect(wrapper.text()).toContain('返回登录')
  expect(wrapper.text()).not.toContain('注册新账号')
})
```

- [ ] **Step 2: 运行密码页测试，确认新规则先失败**

Run: `npm run test:unit -- src/views/auth/__tests__/auth-pages.spec.ts`

Expected: FAIL，当前密码页仍展示旧标题和“注册新账号”。

- [ ] **Step 3: 更新 `PasswordResetPanel.vue`，但不动业务逻辑**

在共享密码面板中只做结构和文案层改动：

- 保留 `email`、`verificationCode`、`password`、`confirmPassword`、`countdown`、`handleSendCode`、`handleSubmit`
- 保留输入框 `name` 与 `data-testid="send-code-button"`
- 将底部链接改为只渲染“返回登录”
- 调整 `helperText` 区域排版，让它更像轻说明而不是卡片附注

示例：

```vue
<div class="auth-panel__actions">
  <div class="auth-panel__footer auth-panel__footer--stacked">
    <p class="auth-panel__helper">{{ props.helperText }}</p>
    <RouterLink class="auth-panel__link" to="/login">返回登录</RouterLink>
  </div>
</div>
```

同时补充中文注释，说明两条公开密码路由为什么继续共用同一套重置表单。

- [ ] **Step 4: 更新忘记密码页与重置密码页的传入文案**

`src/views/auth/ForgotPassword.vue`：

```vue
<PasswordResetPanel
  eyebrow="Auth / Forgot Password"
  title="重置登录密码"
  description="通过注册邮箱完成身份校验后设置新密码，再返回登录页继续访问系统。"
  helper-text="如果验证码未收到，请检查垃圾邮件或等待冷却结束后重新发送。"
/>
```

`src/views/auth/ResetPassword.vue`：

```vue
<PasswordResetPanel
  eyebrow="Auth / Reset Password"
  title="重置登录密码"
  description="如果你已经拿到验证码，可以直接完成密码重置，再返回登录页继续访问系统。"
  helper-text="新密码提交成功后不会自动登录，请使用新密码重新进入系统。"
/>
```

- [ ] **Step 5: 运行密码页测试确认回归通过**

Run: `npm run test:unit -- src/views/auth/__tests__/auth-pages.spec.ts`

Expected: PASS，验证码倒计时、重置跳转与“仅保留返回登录”同时成立。

- [ ] **Step 6: Commit**

```bash
git add src/views/auth/components/PasswordResetPanel.vue src/views/auth/ForgotPassword.vue src/views/auth/ResetPassword.vue src/views/auth/__tests__/auth-pages.spec.ts
git commit -m "feat(auth): 更新密码页布局与文案"
```

---

### Task 4: 全量验证、格式整理与交付检查

**Files:**

- Verify: `src/layouts/AuthLayout.vue`
- Verify: `src/assets/styles/_auth-pages.scss`
- Verify: `src/views/auth/Login.vue`
- Verify: `src/views/auth/Register.vue`
- Verify: `src/views/auth/components/PasswordResetPanel.vue`
- Verify: `src/views/auth/ForgotPassword.vue`
- Verify: `src/views/auth/ResetPassword.vue`
- Verify: `src/__tests__/App.spec.ts`
- Verify: `src/views/auth/__tests__/auth-pages.spec.ts`

- [ ] **Step 1: 运行认证相关单测，确认重构未破坏原行为**

Run: `npm run test:unit -- src/__tests__/App.spec.ts src/views/auth/__tests__/auth-pages.spec.ts`

Expected: PASS，布局契约与公开认证行为全部通过。

- [ ] **Step 2: 运行类型检查**

Run: `npm run type-check`

Expected: PASS，无新的 TypeScript / Vue 类型错误。

- [ ] **Step 3: 运行生产构建**

Run: `npm run build`

Expected: PASS，Vite 生产构建成功。

- [ ] **Step 4: 整理格式（仅在前面步骤通过后）**

Run: `npx prettier --write src/layouts/AuthLayout.vue src/assets/styles/_auth-pages.scss src/views/auth/Login.vue src/views/auth/Register.vue src/views/auth/components/PasswordResetPanel.vue src/views/auth/ForgotPassword.vue src/views/auth/ResetPassword.vue src/__tests__/App.spec.ts src/views/auth/__tests__/auth-pages.spec.ts`

Expected: 所有修改文件格式化完成，未引入额外逻辑变更。

- [ ] **Step 5: 再跑一次认证相关单测做格式化后回归**

Run: `npm run test:unit -- src/__tests__/App.spec.ts src/views/auth/__tests__/auth-pages.spec.ts`

Expected: PASS，确认格式化未影响模板与测试选择器。

- [ ] **Step 6: Commit**

```bash
git add src/layouts/AuthLayout.vue src/assets/styles/_auth-pages.scss src/views/auth/Login.vue src/views/auth/Register.vue src/views/auth/components/PasswordResetPanel.vue src/views/auth/ForgotPassword.vue src/views/auth/ResetPassword.vue src/__tests__/App.spec.ts src/views/auth/__tests__/auth-pages.spec.ts
git commit -m "feat(auth): 完成认证页去卡片化重构"
```

---

## 完成定义

- `AuthLayout` 成为按路由切换左栏内容的去卡片化双栏布局
- 登录 / 注册 / 忘记密码 / 重置密码页全部换成确认后的新文案
- 密码相关页只保留“返回登录”链接
- 现有公开认证行为、输入框选择器、验证码倒计时与回跳规则保持不变
- 认证相关单测、类型检查、生产构建全部通过
