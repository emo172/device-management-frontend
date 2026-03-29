# 下拉按钮与下拉菜单统一包装 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为当前仓库所有真实使用中的下拉入口建立统一包装层，收口 `dropdown / select / tree-select` 的触发器、菜单面板、菜单项语义和浅深主题样式，同时保证现有业务交互与测试不回退。

**Architecture:** 新增 `src/components/common/dropdown/` 目录，分别实现 `AppDropdown`、`AppSelect`、`AppTreeSelect` 和共享类型契约。按钮型下拉的交互与菜单项语义由 `AppDropdown` 负责，表单型 `select / tree-select` 继续依赖 Element Plus 运行时面板类，但统一通过包装组件收口 attrs、前缀图标、clearable 语义和样式入口；全局视觉契约继续集中在 `src/assets/styles/element-override.scss`，并用源码级回归测试锁住迁移完整性。

**Tech Stack:** Vue 3 `<script setup>`、TypeScript、SCSS、Element Plus、Vitest、Vue Test Utils

---

## 文件结构与职责

- `src/components/common/dropdown/types.ts`
  - 新增统一菜单项与包装组件共用类型，承接 `danger / active / disabled / icon / meta` 语义
- `src/components/common/dropdown/AppDropdown.vue`
  - 封装按钮型下拉，统一原生 `button` 触发器、箭头、aria、危险项和菜单项结构
- `src/components/common/dropdown/AppSelect.vue`
  - 封装 `el-select`，统一前置图标、attrs 分流、clearable 原始空值透传和私有 `popper-class` 拦截
- `src/components/common/dropdown/AppTreeSelect.vue`
  - 封装 `el-tree-select`，统一前置图标、attrs 分流、单选 clearable 归一为 `null` 和私有 `popper-class` 拦截
- `src/components/common/dropdown/__tests__/AppDropdown.spec.ts`
  - 锁定 `AppDropdown` 的触发器语义、菜单项 class、danger / active 语义和 attrs 分流
- `src/components/common/dropdown/__tests__/AppSelect.spec.ts`
  - 锁定 `AppSelect` 的前置图标、attrs 分流、原始空值透传和 `popper-class` 拦截
- `src/components/common/dropdown/__tests__/AppTreeSelect.spec.ts`
  - 锁定 `AppTreeSelect` 的前置图标、attrs 分流、单选 clearable 归一为 `null` 和 `popper-class` 拦截
- `src/components/common/dropdown/__tests__/dropdownMigrationContracts.spec.ts`
  - 锁定 `AppHeader` 与 8 个热点文件都已完成包装迁移，不再直接使用原生下拉标签或局部 `:deep(.el-select__wrapper)` 补丁
- `src/assets/styles/element-override.scss`
  - 扩展全局菜单型契约，移除 `.app-header__theme-option--active` 依赖，改为统一 dropdown active / danger 语义
- `src/plugins/__tests__/elementPlus.spec.ts`
  - 锁定全局面板契约、active / danger 语义和“不回退到私有 `popper-class` / 头部私有 class”
- `src/components/layout/AppHeader.vue`
  - 主题切换与用户菜单改接 `AppDropdown`，移除头部自带的下拉结构样式
- `src/components/layout/__tests__/AppHeader.spec.ts`
  - 锁定头部主题菜单和用户菜单迁移到 `AppDropdown` 后的交互与箭头规则
- `src/components/form/DeviceForm.vue`
- `src/components/form/ReservationForm.vue`
- `src/components/form/CategoryForm.vue`
  - 改接 `AppSelect / AppTreeSelect`，删除局部下拉补丁，保留原有表单提交语义
- `src/components/form/__tests__/DeviceForm.spec.ts`
- `src/components/form/__tests__/ReservationForm.spec.ts`
- `src/components/form/__tests__/CategoryForm.spec.ts`
  - 锁定表单迁移后提交与字段语义不变
- `src/views/user/RoleAssign.vue`
- `src/views/user/Freeze.vue`
- `src/views/notification/List.vue`
- `src/views/reservation/Create.vue`
  - 把页面直接使用的 `el-select` 迁移到包装组件，并保留业务交互与主题 token 契约
- `src/views/user/__tests__/RoleAssign.spec.ts`
- `src/views/user/__tests__/Freeze.spec.ts`
- `src/views/notification/__tests__/List.spec.ts`
- `src/views/reservation/__tests__/Create.spec.ts`
  - 从 stub 原生 `ElSelect` 改为 stub `AppSelect / AppTreeSelect`，但保留业务行为与主题 token 断言

## 实施约束

- `AppDropdown` 的统一触发器壳层必须是原生 `<button type="button">`
- `AppDropdown` 的 `#trigger` 插槽只承接非交互内容，不能再输出新的 `<button>` / `<a>` 根节点
- `AppDropdown` 的 `app-dropdown__item`、`app-dropdown__item--active`、`app-dropdown__item--danger` 必须挂在 `el-dropdown-item` 对应的外层菜单项节点上
- `AppSelect` 的单选 `clearable` 继续保持原始空值透传，不做 `null` 归一
- `AppTreeSelect` 的当前单选 `clearable` 场景必须把 `undefined` / `''` 统一归一为 `null`
- `AppSelect / AppTreeSelect` 必须显式拦截 `popper-class / popperClass` 等面板私有化入口
- `AppSelect / AppTreeSelect` 的 option / tree node 不新增私有 class，面板项样式只依赖 Element Plus 运行时类
- 迁移完成后，`AppHeader` 与 8 个热点文件不再直接出现原生 `<el-dropdown>`、`<el-select>`、`<el-tree-select>` 与局部 `:deep(.el-select__wrapper)` 补丁
- 所有实现步骤遵循 TDD：先写失败测试，再写最小实现，再跑通过

---

### Task 1: 新增 `AppDropdown` 类型与行为测试

**Files:**

- Create: `src/components/common/dropdown/types.ts`
- Create: `src/components/common/dropdown/__tests__/AppDropdown.spec.ts`

- [ ] **Step 1: 先写 `AppDropdown` 的失败测试**

```ts
it('maps active and danger state onto outer dropdown items', async () => {
  const wrapper = mount(AppDropdown, {
    props: {
      teleported: false,
      items: [
        { key: 'system', label: '跟随系统', active: true },
        { key: 'logout', label: '退出登录', danger: true },
      ],
    },
    global: {
      stubs: {
        ElDropdown: { template: '<div><slot /><slot name="dropdown" /></div>' },
        ElDropdownMenu: { template: '<div><slot /></div>' },
        ElDropdownItem: { template: '<button><slot /></button>' },
      },
    },
  })

  expect(wrapper.find('.app-dropdown__item--active').exists()).toBe(true)
  expect(wrapper.find('.app-dropdown__item--danger').exists()).toBe(true)
})

it('lets danger state win when an item is marked as both active and danger', async () => {
  const wrapper = mount(AppDropdown, {
    props: {
      teleported: false,
      items: [{ key: 'logout', label: '退出登录', active: true, danger: true }],
    },
    global: {
      stubs: {
        ElDropdown: { template: '<div><slot /><slot name="dropdown" /></div>' },
        ElDropdownMenu: { template: '<div><slot /></div>' },
        ElDropdownItem: { template: '<button><slot /></button>' },
      },
    },
  })

  expect(wrapper.find('.app-dropdown__item--danger').exists()).toBe(true)
  expect(wrapper.find('.app-dropdown__item--active').exists()).toBe(false)
})
```

- [ ] **Step 2: 运行测试，确认它先失败**

Run:

```bash
npm run test:unit -- run src/components/common/dropdown/__tests__/AppDropdown.spec.ts
```

Expected: FAIL，提示 `AppDropdown.vue` 或 `types.ts` 缺失。

- [ ] **Step 3: 写 `types.ts` 的最小契约**

```ts
import type { Component } from 'vue'

export interface AppDropdownItem {
  key: string
  label: string
  icon?: Component
  meta?: string
  testId?: string
  active?: boolean
  disabled?: boolean
  danger?: boolean
  divided?: boolean
}
```

- [ ] **Step 4: 继续补 `AppDropdown.spec.ts`，锁定触发器语义与 attrs 分流**

```ts
it('uses a button trigger and forwards DOM attrs onto the trigger shell', async () => {
  const wrapper = mount(AppDropdown, {
    attrs: {
      class: 'header-layout-slot',
      style: 'width: 160px;',
      'data-testid': 'theme-trigger',
      'aria-label': '主题切换',
    },
    props: { items: [{ key: 'light', label: '浅色' }] },
  })

  expect(wrapper.classes()).toContain('header-layout-slot')
  expect(wrapper.attributes('style')).toContain('width: 160px')
  const trigger = wrapper.get('.app-dropdown__trigger')
  expect(trigger.element.tagName).toBe('BUTTON')
  expect(trigger.attributes('data-testid')).toBe('theme-trigger')
  expect(trigger.attributes('aria-haspopup')).toBe('menu')
})

it('forwards visible-change, ignores disabled clicks, and supports icon/meta/showArrow', async () => {
  const onVisibleChange = vi.fn()
  const wrapper = mount(AppDropdown, {
    attrs: { onVisibleChange },
    props: {
      teleported: false,
      showArrow: false,
      items: [
        {
          key: 'theme',
          label: '主题切换',
          meta: '当前',
          icon: Bell,
          testId: 'theme-option-system',
        },
        { key: 'logout', label: '退出登录', disabled: true },
      ],
    },
    global: {
      stubs: {
        ElDropdown: {
          emits: ['visible-change'],
          template: '<div><slot /><slot name="dropdown" /></div>',
        },
        ElDropdownMenu: { template: '<div><slot /></div>' },
        ElDropdownItem: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  })

  expect(wrapper.find('.app-dropdown__arrow').exists()).toBe(false)
  expect(wrapper.find('.app-dropdown__meta').text()).toBe('当前')
  expect(wrapper.find('.app-dropdown__icon').exists()).toBe(true)
  wrapper.getComponent({ name: 'ElDropdown' }).vm.$emit('visible-change', true)
})
```

- [ ] **Step 5: 再跑一次失败测试**

Run:

```bash
npm run test:unit -- run src/components/common/dropdown/__tests__/AppDropdown.spec.ts
```

Expected: FAIL，提示 `AppDropdown.vue` 尚未实现或类名 / 事件不匹配。

---

### Task 2: 实现 `AppDropdown.vue`

**Files:**

- Create: `src/components/common/dropdown/AppDropdown.vue`
- Modify: `src/components/common/dropdown/__tests__/AppDropdown.spec.ts`

- [ ] **Step 1: 先实现最小的 `AppDropdown.vue` 壳层**

```vue
<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue'
import type { AppDropdownItem } from './types'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    items: AppDropdownItem[]
    disabled?: boolean
    trigger?: 'click' | 'hover' | 'contextmenu'
    placement?: string
    teleported?: boolean
    showArrow?: boolean
  }>(),
  { trigger: 'click', placement: 'bottom-end', teleported: true, showArrow: true },
)

const emit = defineEmits<{
  select: [item: AppDropdownItem]
  'visible-change': [visible: boolean]
}>()

const visible = ref(false)
const attrs = useAttrs()
const rootAttrs = computed(() => ({ class: attrs.class, style: attrs.style }))
const DOM_LISTENER_KEYS = ['onClick', 'onKeydown', 'onFocus', 'onBlur']
const triggerAttrs = computed(() => ({
  ...Object.fromEntries(
    Object.entries(attrs).filter(
      ([key]) => key.startsWith('data-') || key.startsWith('aria-') || DOM_LISTENER_KEYS.includes(key),
    ),
  ),
}))
```

- [ ] **Step 2: 补齐模板中的统一触发器与菜单项外层 class**

```vue
<div class="app-dropdown" v-bind="rootAttrs">
  <el-dropdown
    :disabled="disabled"
    :trigger="trigger"
    :placement="placement"
    :teleported="teleported"
    @visible-change="
      (nextVisible) => {
        visible = nextVisible
        emit('visible-change', nextVisible)
      }
    "
  >
    <button
      type="button"
      class="app-dropdown__trigger"
      :disabled="disabled"
      aria-haspopup="menu"
      :aria-expanded="String(visible)"
      v-bind="triggerAttrs"
    >
      <slot name="trigger" />
      <span v-if="showArrow" class="app-dropdown__arrow" />
    </button>

    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="item in items"
          :key="item.key"
          :data-testid="item.testId"
          :disabled="item.disabled"
          :divided="item.divided"
          :class="[
            'app-dropdown__item',
            item.active && !item.danger && 'app-dropdown__item--active',
            item.danger && 'app-dropdown__item--danger',
          ]"
          @click="!item.disabled && emit('select', item)"
        >
          <slot name="item" :item="item">
            <component :is="item.icon" v-if="item.icon" class="app-dropdown__icon" />
            <span class="app-dropdown__label">{{ item.label }}</span>
            <span v-if="item.meta" class="app-dropdown__meta">{{ item.meta }}</span>
          </slot>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</div>
```

- [ ] **Step 3: 为 `#trigger` 和 `#item` 补中文组件注释，明确插槽边界**

```ts
/**
 * 按钮型下拉统一使用原生 button 作为唯一交互节点，
 * trigger/item 插槽只承接内部内容，不接管外层交互语义。
 */
```

- [ ] **Step 4: 在 `AppDropdown.vue` 内补最小触发器样式，收口按钮壳层、箭头和菜单项内部布局**

```scss
.app-dropdown {
  display: inline-flex;
}

.app-dropdown__trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid var(--app-border-soft);
  border-radius: 999px;
  background: var(--app-surface-glass-strong);
  box-shadow: var(--app-shadow-solid);
}

.app-dropdown__trigger:hover {
  border-color: var(--app-border-strong);
}

.app-dropdown__trigger:focus-visible {
  box-shadow: var(--app-focus-ring);
}

.app-dropdown__trigger:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.app-dropdown__arrow,
.app-dropdown__icon,
.app-dropdown__label,
.app-dropdown__meta {
  display: inline-flex;
  align-items: center;
}
```

- [ ] **Step 5: 补齐 `AppDropdown.spec.ts` 的通过断言，覆盖 `select`、禁用项、`visible-change` 和箭头开关**

```ts
await wrapper.get('.app-dropdown__item').trigger('click')
expect(wrapper.emitted('select')).toEqual([
  [
    expect.objectContaining({
      key: 'theme',
      label: '主题切换',
      meta: '当前',
      testId: 'theme-option-system',
    }),
  ],
])
expect(onVisibleChange).toHaveBeenCalled()
expect(wrapper.get('[data-testid="theme-option-system"]').exists()).toBe(true)

const source = readFileSync(
  resolve(process.cwd(), 'src/components/common/dropdown/AppDropdown.vue'),
  'utf-8',
)
expect(source).toContain('.app-dropdown__trigger:hover')
expect(source).toContain('.app-dropdown__trigger:focus-visible')
expect(source).toContain('.app-dropdown__trigger:disabled')
```

- [ ] **Step 6: 运行组件测试，确认 `AppDropdown` 通过**

Run:

```bash
npm run test:unit -- run src/components/common/dropdown/__tests__/AppDropdown.spec.ts
```

Expected: PASS

- [ ] **Step 7: 记录一个实现检查点（仅在允许提交时执行）**

```bash
git add src/components/common/dropdown/types.ts src/components/common/dropdown/AppDropdown.vue src/components/common/dropdown/__tests__/AppDropdown.spec.ts
git commit -m "feat(common): 新增统一按钮型下拉包装"
```

---

### Task 3: 新增 `AppSelect` 的失败测试并实现包装层

**Files:**

- Create: `src/components/common/dropdown/AppSelect.vue`
- Create: `src/components/common/dropdown/__tests__/AppSelect.spec.ts`

- [ ] **Step 1: 先写 `AppSelect` 的失败测试**

```ts
const selectTestStubs = {
  ElSelect: {
    name: 'ElSelect',
    props: ['modelValue'],
    emits: ['update:modelValue', 'change', 'visible-change'],
    template: '<div class="el-select-stub" v-bind="$attrs"><slot name="prefix" /><slot /></div>',
  },
}

it('keeps single clearable empty value untouched', async () => {
  const wrapper = mount(AppSelect, {
    props: { modelValue: 'OVERDUE_WARNING', clearable: true },
    global: { stubs: selectTestStubs },
  })

  wrapper.getComponent({ name: 'ElSelect' }).vm.$emit('update:modelValue', '')
  expect(wrapper.emitted('update:modelValue')).toEqual([['']])
})

it('keeps layout attrs on the root and ignores private popper overrides', async () => {
  const wrapper = mount(AppSelect, {
    attrs: {
      class: 'filter-layout',
      style: 'width: 240px;',
      'data-testid': 'notification-filter',
      'popper-class': 'private-popper',
    },
    props: { modelValue: 'OVERDUE_WARNING' },
    global: { stubs: selectTestStubs },
  })

  expect(wrapper.classes()).toContain('filter-layout')
  expect(wrapper.attributes('style')).toContain('width: 240px')
  const select = wrapper.getComponent({ name: 'ElSelect' })
  expect(select.attributes('data-testid')).toBe('notification-filter')
  expect(select.attributes('popper-class')).toBeUndefined()
})

it('forwards change and visible-change events, and does not reserve prefix space without an icon', async () => {
  const handleChange = vi.fn()
  const handleVisibleChange = vi.fn()
  const wrapper = mount(AppSelect, {
    attrs: {
      onChange: handleChange,
      onVisibleChange: handleVisibleChange,
    },
    props: { modelValue: '' },
    global: { stubs: selectTestStubs },
  })

  expect(wrapper.find('.app-select__prefix').exists()).toBe(false)
})

it('passes multi-value model payloads through unchanged', async () => {
  const wrapper = mount(AppSelect, {
    props: { modelValue: ['DEVICE_ONLY', 'DEVICE_AND_SYSTEM'] },
    global: { stubs: selectTestStubs },
  })

  wrapper.getComponent({ name: 'ElSelect' }).vm.$emit('update:modelValue', ['DEVICE_ONLY'])
  expect(wrapper.emitted('update:modelValue')).toEqual([[['DEVICE_ONLY']]])
})

it('renders a leading icon or prefix slot when provided', async () => {
  const wrapper = mount(AppSelect, {
    props: { modelValue: '', leadingIcon: Bell },
    global: { stubs: selectTestStubs },
  })

  expect(wrapper.find('.app-select__prefix').exists()).toBe(true)
})
```

- [ ] **Step 2: 跑测试，确认当前先失败**

Run:

```bash
npm run test:unit -- run src/components/common/dropdown/__tests__/AppSelect.spec.ts
```

Expected: FAIL，提示 `AppSelect.vue` 缺失。

- [ ] **Step 3: 先写 `AppSelect.vue` 的最小骨架与 attrs 分流**

```vue
<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import type { Component } from 'vue'

defineOptions({ inheritAttrs: false })

const incomingProps = defineProps<{
  modelValue?: unknown
  leadingIcon?: Component
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'change', 'visible-change'])
const attrs = useAttrs()

const rootAttrs = computed(() => ({ class: attrs.class, style: attrs.style }))
const selectAttrs = computed(() => {
  const nextAttrs = { ...attrs }
  delete nextAttrs.class
  delete nextAttrs.style
  delete nextAttrs['popper-class']
  delete nextAttrs.popperClass
  return nextAttrs
})
</script>
```

- [ ] **Step 4: 补模板并转发事件**

```vue
<div class="app-select" v-bind="rootAttrs">
  <el-select
    class="app-select__control"
    :model-value="incomingProps.modelValue"
    :placeholder="incomingProps.placeholder"
    :disabled="incomingProps.disabled"
    v-bind="selectAttrs"
    @update:model-value="(value) => emit('update:modelValue', value)"
    @change="(value) => emit('change', value)"
    @visible-change="(visible) => emit('visible-change', visible)"
  >
    <template v-if="incomingProps.leadingIcon || $slots.prefix" #prefix>
      <slot name="prefix">
        <component :is="incomingProps.leadingIcon" class="app-select__prefix" />
      </slot>
    </template>
    <slot />
  </el-select>
</div>
```

- [ ] **Step 5: 为 `AppSelect.vue` 补中文注释，说明 attrs 分流、前置图标和空值透传边界**

```ts
/**
 * AppSelect 只收口表单型选择器的触发器与 attrs 边界，
 * clearable 的原始空值继续透传给业务页，不在包装层强行改口径。
 */
```

- [ ] **Step 6: 在 `AppSelect.vue` 内补最小触发器样式，收口前置图标和输入区布局**

```scss
.app-select {
  display: block;
}

.app-select :deep(.el-select__wrapper) {
  align-items: center;
  padding-inline-start: 12px;
}

.app-select :deep(.el-select__placeholder),
.app-select :deep(.el-select__selected-item),
.app-select :deep(.el-select__tags) {
  margin-inline-start: 0;
}

.app-select__control {
  width: 100%;
}

.app-select__prefix {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 16px;
  margin-right: 6px;
  color: var(--app-text-secondary);
}
```

- [ ] **Step 7: 再补一条失败测试，锁定 `aria-*` / 事件透传行为**

```ts
it('forwards aria and component events to el-select', async () => {
  const wrapper = mount(AppSelect, {
    attrs: {
      'aria-label': '通知类型筛选',
      onVisibleChange: vi.fn(),
    },
    props: { modelValue: '' },
  })

  const select = wrapper.getComponent({ name: 'ElSelect' })
  expect(select.attributes('aria-label')).toBe('通知类型筛选')
})

it('keeps option styling on element-plus runtime classes only', async () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/components/common/dropdown/AppSelect.vue'),
    'utf-8',
  )
  expect(source).not.toContain('app-select__option')
  expect(source).toContain('.app-select :deep(.el-select__wrapper)')
  expect(source).toContain('.app-select :deep(.el-select__placeholder)')
  expect(source).toContain('.app-select :deep(.el-select__selected-item)')
  expect(source).toContain('.app-select :deep(.el-select__tags)')
  expect(source).toContain('.app-select__prefix')
  expect(source).toContain('padding-inline-start: 12px')
  expect(source).toContain('min-width: 16px')
  expect(source).toContain('margin-right: 6px')
})
```

- [ ] **Step 8: 在 `AppSelect.spec.ts` 中补通过断言，确认 `change` / `visible-change` 转发和统一 class 契约都成立**

```ts
const select = wrapper.getComponent({ name: 'ElSelect' })
select.vm.$emit('change', 'OVERDUE_WARNING')
select.vm.$emit('visible-change', true)
expect(handleChange).toHaveBeenCalled()
expect(handleVisibleChange).toHaveBeenCalledWith(true)
expect(wrapper.get('.app-select').classes()).toContain('filter-layout')
```

- [ ] **Step 9: 跑测试，确认 `AppSelect` 通过**

Run:

```bash
npm run test:unit -- run src/components/common/dropdown/__tests__/AppSelect.spec.ts
```

Expected: PASS

---

### Task 4: 新增 `AppTreeSelect` 的失败测试并实现包装层

**Files:**

- Create: `src/components/common/dropdown/AppTreeSelect.vue`
- Create: `src/components/common/dropdown/__tests__/AppTreeSelect.spec.ts`

- [ ] **Step 1: 先写 `AppTreeSelect` 的失败测试**

```ts
const treeSelectTestStubs = {
  ElTreeSelect: {
    name: 'ElTreeSelect',
    props: [
      'modelValue',
      'data',
      'nodeKey',
      'props',
      'checkStrictly',
      'defaultExpandAll',
      'clearable',
      'multiple',
      'placeholder',
      'disabled',
    ],
    emits: ['update:modelValue', 'change', 'visible-change'],
    template: '<div class="el-tree-select-stub" v-bind="$attrs"><slot name="prefix" /></div>',
  },
}

it('normalizes single clearable empty value to null', async () => {
  const wrapper = mount(AppTreeSelect, {
    props: {
      modelValue: '顶级分类',
      clearable: true,
      data: [{ label: '顶级分类', value: '顶级分类' }],
    },
    global: { stubs: treeSelectTestStubs },
  })

  wrapper.getComponent({ name: 'ElTreeSelect' }).vm.$emit('update:modelValue', '')
  expect(wrapper.emitted('update:modelValue')).toEqual([[null]])
})

it('keeps layout attrs on the root and ignores private popper overrides', async () => {
  const wrapper = mount(AppTreeSelect, {
    attrs: {
      class: 'tree-layout',
      style: 'width: 280px;',
      'data-testid': 'category-tree',
      popperClass: 'private-tree-popper',
    },
    props: {
      modelValue: null,
      data: [{ label: '顶级分类', value: '顶级分类' }],
    },
    global: { stubs: treeSelectTestStubs },
  })

  expect(wrapper.classes()).toContain('tree-layout')
  expect(wrapper.attributes('style')).toContain('width: 280px')
  const treeSelect = wrapper.getComponent({ name: 'ElTreeSelect' })
  expect(treeSelect.attributes('data-testid')).toBe('category-tree')
  expect(treeSelect.attributes('popper-class')).toBeUndefined()
})

it('forwards tree-select runtime props and only exposes the prefix slot', async () => {
  const wrapper = mount(AppTreeSelect, {
    props: {
      modelValue: null,
      data: [{ label: '顶级分类', value: '顶级分类' }],
      nodeKey: 'value',
      checkStrictly: true,
      defaultExpandAll: true,
      props: { label: 'label' },
      clearable: true,
      placeholder: '请选择父级分类',
    },
    global: { stubs: treeSelectTestStubs },
  })

  const treeSelect = wrapper.getComponent({ name: 'ElTreeSelect' })
  expect(treeSelect.props('nodeKey')).toBe('value')
  expect(treeSelect.props('checkStrictly')).toBe(true)
  expect(treeSelect.props('defaultExpandAll')).toBe(true)
  expect(treeSelect.props('clearable')).toBe(true)
  expect(treeSelect.props('placeholder')).toBe('请选择父级分类')
})

it('keeps multi-value clearable payloads untouched', async () => {
  const wrapper = mount(AppTreeSelect, {
    props: {
      modelValue: ['顶级分类'],
      multiple: true,
      clearable: true,
      data: [{ label: '顶级分类', value: '顶级分类' }],
    },
    global: { stubs: treeSelectTestStubs },
  })

  wrapper.getComponent({ name: 'ElTreeSelect' }).vm.$emit('update:modelValue', [])
  expect(wrapper.emitted('update:modelValue')).toEqual([[[]]])
})

it('renders a leading icon or prefix slot and does not expose node-content slots', async () => {
  const wrapper = mount(AppTreeSelect, {
    props: {
      modelValue: null,
      leadingIcon: Bell,
      data: [{ label: '顶级分类', value: '顶级分类' }],
    },
    global: { stubs: treeSelectTestStubs },
  })

  expect(wrapper.find('.app-select__prefix').exists()).toBe(true)
})
```

- [ ] **Step 2: 跑测试，确认先失败**

Run:

```bash
npm run test:unit -- run src/components/common/dropdown/__tests__/AppTreeSelect.spec.ts
```

Expected: FAIL，提示 `AppTreeSelect.vue` 缺失。

- [ ] **Step 3: 先写 `AppTreeSelect.vue` 的最小骨架与 `null` 归一逻辑**

```vue
<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import type { Component } from 'vue'

defineOptions({ inheritAttrs: false })

const incomingProps = defineProps<{
  modelValue?: unknown
  data: unknown[]
  nodeKey?: string
  props?: Record<string, unknown>
  checkStrictly?: boolean
  defaultExpandAll?: boolean
  leadingIcon?: Component
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
  multiple?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'change', 'visible-change'])
const attrs = useAttrs()
const isSingleMode = computed(() => !incomingProps.multiple)
const rootAttrs = computed(() => ({ class: attrs.class, style: attrs.style }))
const treeSelectAttrs = computed(() => {
  const nextAttrs = { ...attrs }
  delete nextAttrs.class
  delete nextAttrs.style
  delete nextAttrs['popper-class']
  delete nextAttrs.popperClass
  return nextAttrs
})

function normalizeValue(value: unknown) {
  if (isSingleMode.value && incomingProps.clearable && (value === '' || value === undefined)) {
    return null
  }
  return value
}
```

- [ ] **Step 4: 补模板并显式拦截 `popper-class`**

```vue
<div class="app-tree-select" v-bind="rootAttrs">
  <el-tree-select
    class="app-tree-select__control"
    :model-value="incomingProps.modelValue"
    :data="incomingProps.data"
    :node-key="incomingProps.nodeKey"
    :props="incomingProps.props"
    :check-strictly="incomingProps.checkStrictly"
    :default-expand-all="incomingProps.defaultExpandAll"
    :clearable="incomingProps.clearable"
    :multiple="incomingProps.multiple"
    :placeholder="incomingProps.placeholder"
    :disabled="incomingProps.disabled"
    v-bind="treeSelectAttrs"
    @update:model-value="(value) => emit('update:modelValue', normalizeValue(value))"
    @change="(value) => emit('change', value)"
    @visible-change="(visible) => emit('visible-change', visible)"
  >
    <template v-if="incomingProps.leadingIcon || $slots.prefix" #prefix>
      <slot name="prefix">
        <component :is="incomingProps.leadingIcon" class="app-select__prefix" />
      </slot>
    </template>
  </el-tree-select>
</div>
```

- [ ] **Step 5: 为 `AppTreeSelect.vue` 补中文注释，说明单选 clearable 归一为 `null` 与多选例外**

```ts
/**
 * AppTreeSelect 只在当前单选 clearable 场景里把空值归一成 null，
 * 多选值维持原始数组语义，避免误伤后续树选择能力。
 */
```

- [ ] **Step 6: 在 `AppTreeSelect.vue` 内补最小触发器样式，和 `AppSelect` 保持同一前缀布局语言**

```scss
.app-tree-select {
  display: block;
}

.app-tree-select :deep(.el-select__wrapper) {
  align-items: center;
  padding-inline-start: 12px;
}

.app-tree-select :deep(.el-select__placeholder),
.app-tree-select :deep(.el-select__selected-item),
.app-tree-select :deep(.el-select__tags) {
  margin-inline-start: 0;
}

.app-tree-select__control {
  width: 100%;
}
```

- [ ] **Step 7: 再补一条失败测试，锁定 `aria-*` / 事件透传行为**

```ts
it('forwards aria and component events to el-tree-select', async () => {
  const wrapper = mount(AppTreeSelect, {
    attrs: {
      'aria-label': '父级分类选择',
      onVisibleChange: vi.fn(),
    },
    props: {
      modelValue: null,
      data: [{ label: '顶级分类', value: '顶级分类' }],
    },
  })

  const treeSelect = wrapper.getComponent({ name: 'ElTreeSelect' })
  expect(treeSelect.attributes('aria-label')).toBe('父级分类选择')
})

it('keeps tree node styling on element-plus runtime classes only', async () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/components/common/dropdown/AppTreeSelect.vue'),
    'utf-8',
  )
  expect(source).not.toContain('app-tree-select__node')
  expect(source).toContain('.app-tree-select :deep(.el-select__wrapper)')
  expect(source).toContain('.app-tree-select :deep(.el-select__placeholder)')
  expect(source).toContain('.app-tree-select :deep(.el-select__selected-item)')
  expect(source).toContain('.app-tree-select :deep(.el-select__tags)')
  expect(source).toContain('padding-inline-start: 12px')
  expect(source).toContain('#prefix')
  expect(source).not.toContain('<slot />')
})
```

- [ ] **Step 8: 在 `AppTreeSelect.spec.ts` 中补通过断言，确认 `change` / `visible-change` 转发和节点相关 props 透传成立**

```ts
treeSelect.vm.$emit('change', '顶级分类')
treeSelect.vm.$emit('visible-change', true)
expect(wrapper.emitted('change')).toEqual([['顶级分类']])
expect(wrapper.emitted('visible-change')).toEqual([[true]])
```

- [ ] **Step 9: 跑测试，确认 `AppTreeSelect` 通过**

Run:

```bash
npm run test:unit -- run src/components/common/dropdown/__tests__/AppTreeSelect.spec.ts
```

Expected: PASS

---

### Task 5: 扩展全局样式契约并锁定源码级迁移回归

**Files:**

- Modify: `src/assets/styles/element-override.scss`
- Modify: `src/plugins/__tests__/elementPlus.spec.ts`

- [ ] **Step 1: 先写失败的样式契约测试**

```ts
expect(styleSource).toContain('.app-dropdown__item--active')
expect(styleSource).toContain('.app-dropdown__item--danger')
expect(styleSource).toContain('.app-dropdown__icon')
expect(styleSource).toContain('.app-dropdown__label')
expect(styleSource).toContain('.app-dropdown__meta')
expect(styleSource).not.toContain('.app-header__theme-option--active')
expect(styleSource).not.toContain('popper-class')
```

- [ ] **Step 2: 运行现有样式契约测试，确认它先失败**

Run:

```bash
npm run test:unit -- run src/plugins/__tests__/elementPlus.spec.ts
```

Expected: FAIL，提示全局 active / danger 契约尚未落地。

- [ ] **Step 3: 在 `element-override.scss` 中把头部私有 active 类替换成统一 dropdown 语义**

```scss
.el-dropdown-menu__item.app-dropdown__item--active,
.el-select-dropdown__item.is-selected {
  background: var(--app-tone-brand-surface);
  color: var(--app-tone-brand-text-strong);
}

.el-dropdown-menu__item.app-dropdown__item--danger {
  color: var(--app-tone-danger-text);
  background: var(--app-tone-danger-surface);
}

.el-dropdown-menu__item .app-dropdown__icon,
.el-dropdown-menu__item .app-dropdown__label,
.el-dropdown-menu__item .app-dropdown__meta {
  display: inline-flex;
  align-items: center;
}
```

- [ ] **Step 4: 补样式优先级注释，明确 danger 覆盖 active 的视觉规则**

```scss
// 危险动作优先表达风险，不再叠加 active 高亮，避免把“退出登录”误读成当前选项。
.el-dropdown-menu__item.app-dropdown__item--danger {
  color: var(--app-tone-danger-text);
  background: var(--app-tone-danger-surface);
}
```

- [ ] **Step 5: 跑样式契约测试，确认通过**

Run:

```bash
npm run test:unit -- run src/plugins/__tests__/elementPlus.spec.ts
```

Expected: PASS

并确认 `elementPlus.spec.ts` 同时覆盖：

```ts
expect(styleSource).not.toContain('.app-header__theme-option--active')
expect(styleSource).not.toContain('popper-class')
expect(styleSource).toContain('.el-dropdown-menu__item .app-dropdown__icon')
```

---

### Task 6: 迁移 `AppHeader` 到 `AppDropdown`

**Files:**

- Modify: `src/components/layout/AppHeader.vue`
- Modify: `src/components/layout/__tests__/AppHeader.spec.ts`

- [ ] **Step 1: 先补头部迁移失败测试**

```ts
expect(source).toContain('AppDropdown')
expect(source).not.toContain('<el-dropdown class="app-header__theme-dropdown"')
expect(source).not.toContain('app-header__theme-option--active')
```

- [ ] **Step 2: 跑头部测试，确认它先失败**

Run:

```bash
npm run test:unit -- run src/components/layout/__tests__/AppHeader.spec.ts
```

Expected: FAIL，提示 `AppDropdown` 尚未接入或箭头断言不成立。

- [ ] **Step 3: 在 `AppHeader.vue` 中接入 `AppDropdown`，并把原用户触发器 `<button>` 改成非交互内容插槽**

```vue
<AppDropdown
  data-testid="theme-entry"
  :data-theme-preference="appStore.themePreference"
  :data-resolved-theme="appStore.resolvedTheme"
  :items="themeDropdownItems"
  @select="handleThemeSelect"
>
  <template #trigger>
    <el-icon><component :is="currentThemeOption.icon" /></el-icon>
    <span class="app-header__theme-label">{{ currentThemeOption.label }}</span>
  </template>
</AppDropdown>
```

- [ ] **Step 4: 继续把用户菜单也迁移到 `AppDropdown`，去掉原生 `<button>` 触发器根节点**

```vue
<AppDropdown :items="userMenuItems" @select="handleUserMenuSelect">
  <template #trigger>
    <el-avatar class="app-header__avatar">{{ displayName.slice(0, 1) }}</el-avatar>
    <span>{{ displayName }}</span>
  </template>
</AppDropdown>
```

- [ ] **Step 5: 迁移主题菜单项与用户菜单项的测试锚点，确保现有 `data-testid` 和主题属性继续存在**

```ts
const themeDropdownItems = themeOptions.map((option) => ({
  key: option.preference,
  label: option.label,
  meta: option.preference === appStore.themePreference ? '当前' : undefined,
  active: option.preference === appStore.themePreference,
  testId: `theme-option-${option.preference}`,
}))

const userMenuItems = [
  { key: 'profile', label: '个人中心' },
  { key: 'password', label: '修改密码' },
  { key: 'logout', label: '退出登录', danger: true },
]
```

- [ ] **Step 6: 在 `AppHeader.vue` 中删除只服务于旧下拉结构的局部样式**

```scss
.app-header__theme-dropdown,
.app-header__user-trigger {
  /* 删除旧结构后同步清理，保留头部布局本身的 class */
}
```

- [ ] **Step 7: 在 `AppHeader.vue` 补中文注释，说明主题入口与用户菜单都统一复用包装层，避免头部继续维护私有下拉视觉**

```vue
<!-- 头部主题切换和用户菜单统一复用 AppDropdown，避免浅深主题和危险项语义继续分叉成头部私有实现。 -->
```

- [ ] **Step 8: 更新 `AppHeader.spec.ts` 的 stub，从 `ElDropdown` 改成可交互的 `AppDropdown` stub，并补用户菜单断言**

```ts
AppDropdown: {
  props: ['items'],
  emits: ['select'],
  data: () => ({ open: false }),
  template:
    '<div class="app-dropdown-stub">' +
    '<button class="app-dropdown-stub__trigger" v-bind="$attrs" @click="open = !open">' +
    '<slot name="trigger" />' +
    '<span class="app-dropdown-stub__arrow">arrow</span>' +
    '</button>' +
    '<div v-if="open" class="app-dropdown-stub__menu">' +
    '<button v-for="item in items" :key="item.key" :data-testid="item.testId" @click="$emit(\'select\', item)">{{ item.label }}</button>' +
    '</div>' +
    '</div>',
}
```

并补充断言：

```ts
expect(wrapper.get('[data-testid="theme-entry"]').attributes('data-theme-preference')).toBe(
  'system',
)
expect(wrapper.get('[data-testid="theme-option-system"]').exists()).toBe(true)
expect(wrapper.get('.app-dropdown-stub__trigger').find('.app-dropdown-stub__arrow').exists()).toBe(
  true,
)
expect(userMenuItems.find((item) => item.key === 'logout')?.danger).toBe(true)
```

- [ ] **Step 9: 跑头部测试，确认通过**

Run:

```bash
npm run test:unit -- run src/components/layout/__tests__/AppHeader.spec.ts
```

Expected: PASS

---

### Task 7: 迁移表单组件到 `AppSelect / AppTreeSelect`

**Files:**

- Modify: `src/components/form/DeviceForm.vue`
- Modify: `src/components/form/ReservationForm.vue`
- Modify: `src/components/form/CategoryForm.vue`
- Modify: `src/components/form/__tests__/DeviceForm.spec.ts`
- Modify: `src/components/form/__tests__/ReservationForm.spec.ts`
- Modify: `src/components/form/__tests__/CategoryForm.spec.ts`

- [ ] **Step 1: 先给三个表单测试补失败断言，要求源码已切到包装组件**

```ts
const reservationSource = readReservationFormSource()
const deviceSource = readDeviceFormSource()
const categorySource = readCategoryFormSource()

expect(reservationSource).toContain('AppSelect')
expect(deviceSource).toContain('AppTreeSelect')
expect(categorySource).toContain('AppTreeSelect')
expect(reservationSource).not.toContain(':deep(.el-select__wrapper)')
expect(deviceSource).not.toContain(':deep(.el-select__wrapper)')
expect(categorySource).not.toContain(':deep(.el-select__wrapper)')
```

- [ ] **Step 2: 跑三个表单测试，确认它们先失败**

Run:

```bash
npm run test:unit -- run src/components/form/__tests__/DeviceForm.spec.ts src/components/form/__tests__/ReservationForm.spec.ts src/components/form/__tests__/CategoryForm.spec.ts
```

Expected: FAIL，提示源码仍直接使用原生 `el-select` / `el-tree-select` 或局部补丁仍存在。

- [ ] **Step 3: 把三个表单分别改到包装组件**

```vue
<!-- DeviceForm.vue：分类树选择从 el-tree-select 改为 AppTreeSelect，保留 node-key / check-strictly / default-expand-all / placeholder。 -->
<AppTreeSelect
  v-model="formState.categoryName"
  class="device-form__category"
  :data="categoryOptions"
  node-key="value"
  check-strictly
  default-expand-all
  placeholder="请选择设备分类"
/>

<!-- ReservationForm.vue：设备选择从 el-select 改为 AppSelect，保留 deviceOptions 与 clear-conflict 触发链。 -->

<!-- CategoryForm.vue：父级分类树选择改为 AppTreeSelect；默认审批模式普通选择改为 AppSelect。 -->
<AppTreeSelect
  v-model="formState.parentName"
  class="category-form__parent"
  :data="parentCategoryOptions"
  node-key="value"
  check-strictly
  default-expand-all
  clearable
/>

<AppSelect
  v-model="formState.defaultApprovalMode"
  class="category-form__approval-mode"
  placeholder="请选择默认审批模式"
>
  <el-option
    v-for="mode in Object.values(ApprovalMode)"
    :key="mode"
    :label="ApprovalModeLabel[mode]"
    :value="mode"
  />
</AppSelect>
```

- [ ] **Step 4: 在三个表单补中文注释，说明为什么改为包装组件以及树选择清空语义**

```vue
<!-- 分类表单的父级分类必须走 AppTreeSelect，统一处理单选 clearable -> null，避免业务页各自兼容空值。 -->
```

- [ ] **Step 5: 更新表单测试 stub，从 `ElSelect / ElTreeSelect` 切到 `AppSelect / AppTreeSelect`**

```ts
ElOption: {
  props: ['label', 'value'],
  template: '<option :value="value">{{ label }}</option>',
}

AppSelect: {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<select :value="modelValue ?? \"\"" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
}

AppTreeSelect: {
  props: ['modelValue', 'data'],
  emits: ['update:modelValue'],
  template:
    '<select :value="modelValue ?? \"\"" @change="$emit(\'update:modelValue\', $event.target.value || null)">' +
    '<option value=""></option>' +
    '<option v-for="item in data" :key="item.value" :value="item.value">{{ item.label }}</option>' +
    '</select>',
}
```

- [ ] **Step 6: 删除三个表单里的局部下拉补丁，并明确样式责任边界**

```scss
// DeviceForm / ReservationForm / CategoryForm 继续保留 el-input、el-textarea、el-input-number 的卡片态背景和 hover 样式。
// 只删除 :deep(.el-select__wrapper) 一类下拉补丁，让 select/tree-select 外观完全由 AppSelect / AppTreeSelect 接管。
```

- [ ] **Step 7: 在 `CategoryForm.spec.ts` 中补一条通过断言，锁定 `parentName` 清空后仍为 `null`**

```ts
await wrapper.get('.category-form__parent select').setValue('')
expect(wrapper.emitted('submit')).toContainEqual([expect.objectContaining({ parentName: null })])
```

- [ ] **Step 8: 跑三个表单测试，确认通过**

Run:

```bash
npm run test:unit -- run src/components/form/__tests__/DeviceForm.spec.ts src/components/form/__tests__/ReservationForm.spec.ts src/components/form/__tests__/CategoryForm.spec.ts
```

Expected: PASS

---

### Task 8: 迁移页面直接使用的选择器并更新页面测试

**Files:**

- Modify: `src/views/user/RoleAssign.vue`
- Modify: `src/views/user/Freeze.vue`
- Modify: `src/views/notification/List.vue`
- Modify: `src/views/reservation/Create.vue`
- Modify: `src/views/user/__tests__/RoleAssign.spec.ts`
- Modify: `src/views/user/__tests__/Freeze.spec.ts`
- Modify: `src/views/notification/__tests__/List.spec.ts`
- Modify: `src/views/reservation/__tests__/Create.spec.ts`

- [ ] **Step 1: 先给页面测试补失败断言，要求源码已使用包装组件**

```ts
const roleAssignSource = readFileSync(
  resolve(process.cwd(), 'src/views/user/RoleAssign.vue'),
  'utf-8',
)
const freezeSource = readFileSync(resolve(process.cwd(), 'src/views/user/Freeze.vue'), 'utf-8')
const notificationSource = readFileSync(
  resolve(process.cwd(), 'src/views/notification/List.vue'),
  'utf-8',
)
const reservationCreateSource = readFileSync(
  resolve(process.cwd(), 'src/views/reservation/Create.vue'),
  'utf-8',
)

expect(roleAssignSource).toContain('AppSelect')
expect(freezeSource).toContain('AppSelect')
expect(notificationSource).toContain('AppSelect')
expect(reservationCreateSource).toContain('AppSelect')
expect(roleAssignSource).not.toContain('<el-select')
expect(freezeSource).not.toContain('<el-select')
expect(notificationSource).not.toContain('<el-select')
expect(reservationCreateSource).not.toContain('<el-select')
```

- [ ] **Step 2: 运行这 4 个页面测试，确认它们先失败**

Run:

```bash
npm run test:unit -- run src/views/user/__tests__/RoleAssign.spec.ts src/views/user/__tests__/Freeze.spec.ts src/views/notification/__tests__/List.spec.ts src/views/reservation/__tests__/Create.spec.ts
```

Expected: FAIL，提示源码仍直接使用原生 `el-select` 或测试 stub 锚点不匹配。

- [ ] **Step 3: 把页面源码切到包装组件，并保留原业务字段语义**

```vue
<!-- RoleAssign.vue / Freeze.vue / notification/List.vue 都替换为 AppSelect -->
<AppSelect
  v-model="selectedType"
  clearable
  placeholder="筛选通知类型"
  class="notification-list-view__select"
>
  <el-option v-for="option in notificationTypeOptions" :key="option.value" :label="option.label" :value="option.value" />
</AppSelect>

<!-- reservation/Create.vue 的系统管理员目标用户选择同样替换为 AppSelect，保持原本人预约 / 代预约切换逻辑 -->
```

- [ ] **Step 4: 更新页面测试 stub，改为 `AppSelect / AppTreeSelect`，保留业务行为与主题 token 断言**

```ts
ElOption: {
  props: ['label', 'value'],
  template: '<option :value="value">{{ label }}</option>',
}

AppSelect: {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<select data-testid="type-filter" :value="modelValue || undefined" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
}

AppTreeSelect: {
  props: ['modelValue', 'data'],
  emits: ['update:modelValue'],
  template:
    '<select :value="modelValue ?? \"\"" @change="$emit(\'update:modelValue\', $event.target.value || null)">' +
    '<option value=""></option>' +
    '<option v-for="item in data" :key="item.value" :value="item.value">{{ item.label }}</option>' +
    '</select>',
}
```

- [ ] **Step 5: 跑这 4 个页面测试，确认通过**

Run:

```bash
npm run test:unit -- run src/views/user/__tests__/RoleAssign.spec.ts src/views/user/__tests__/Freeze.spec.ts src/views/notification/__tests__/List.spec.ts src/views/reservation/__tests__/Create.spec.ts
```

Expected: PASS

---

### Task 9: 执行迁移完整性回归与全量验证

**Files:**

- Create: `src/components/common/dropdown/__tests__/dropdownMigrationContracts.spec.ts`
- Verify: `src/components/common/dropdown/__tests__/dropdownMigrationContracts.spec.ts`
- Verify: `src/plugins/__tests__/elementPlus.spec.ts`
- Verify: `src/components/layout/__tests__/AppHeader.spec.ts`
- Verify: `src/components/form/__tests__/DeviceForm.spec.ts`
- Verify: `src/components/form/__tests__/ReservationForm.spec.ts`
- Verify: `src/components/form/__tests__/CategoryForm.spec.ts`
- Verify: `src/views/user/__tests__/RoleAssign.spec.ts`
- Verify: `src/views/user/__tests__/Freeze.spec.ts`
- Verify: `src/views/notification/__tests__/List.spec.ts`
- Verify: `src/views/reservation/__tests__/Create.spec.ts`

- [ ] **Step 1: 先补迁移完整性的源码级回归测试**

```ts
const files = [
  'src/components/layout/AppHeader.vue',
  'src/components/form/DeviceForm.vue',
  'src/components/form/ReservationForm.vue',
  'src/components/form/CategoryForm.vue',
  'src/views/user/RoleAssign.vue',
  'src/views/user/Freeze.vue',
  'src/views/notification/List.vue',
  'src/views/reservation/Create.vue',
]

for (const file of files) {
  const source = readFileSync(resolve(process.cwd(), file), 'utf-8')
  expect(source).not.toContain('<el-select')
  expect(source).not.toContain('<el-tree-select')
  expect(source).not.toContain('<el-dropdown')
  expect(source).not.toContain(':deep(.el-select__wrapper)')
}

expect(
  readFileSync(resolve(process.cwd(), 'src/components/layout/AppHeader.vue'), 'utf-8'),
).not.toContain('app-header__theme-option--active')
```

- [ ] **Step 2: 先跑所有下拉相关测试集合**

Run:

```bash
rg '<(el-dropdown|el-select|el-tree-select|ElDropdown|ElSelect|ElTreeSelect)' src --glob '!src/components/common/dropdown/**'
```

Expected: 不应再命中 `AppHeader.vue`、表单和页面热点文件；若仍有命中，只允许出现在包装组件目录外的测试桩或明确保留的非运行时代码。

- [ ] **Step 3: 先跑所有下拉相关测试集合**

Run:

```bash
npm run test:unit -- run src/components/common/dropdown/__tests__/AppDropdown.spec.ts src/components/common/dropdown/__tests__/AppSelect.spec.ts src/components/common/dropdown/__tests__/AppTreeSelect.spec.ts src/components/common/dropdown/__tests__/dropdownMigrationContracts.spec.ts src/plugins/__tests__/elementPlus.spec.ts src/components/layout/__tests__/AppHeader.spec.ts src/components/form/__tests__/DeviceForm.spec.ts src/components/form/__tests__/ReservationForm.spec.ts src/components/form/__tests__/CategoryForm.spec.ts src/views/user/__tests__/RoleAssign.spec.ts src/views/user/__tests__/Freeze.spec.ts src/views/notification/__tests__/List.spec.ts src/views/reservation/__tests__/Create.spec.ts
```

Expected: PASS

- [ ] **Step 4: 再跑完整单测，确认没有影响仓库其余测试**

Run:

```bash
npm run test:unit
```

Expected: PASS

- [ ] **Step 5: 运行类型检查**

Run:

```bash
npm run type-check
```

Expected: PASS

- [ ] **Step 6: 运行完整构建**

Run:

```bash
npm run build
```

Expected: PASS

- [ ] **Step 7: 检查工作区改动并确认没有遗漏迁移点**

Run:

```bash
git status --short
```

Expected: 只包含计划中的包装组件、样式、头部、表单、页面与测试改动；不应出现额外无关文件。

- [ ] **Step 8: 形成提交检查点（仅在允许提交时执行）**

```bash
git add src/components/common/dropdown src/assets/styles/element-override.scss src/plugins/__tests__/elementPlus.spec.ts src/components/layout/AppHeader.vue src/components/layout/__tests__/AppHeader.spec.ts src/components/form src/views/user/RoleAssign.vue src/views/user/Freeze.vue src/views/notification/List.vue src/views/reservation/Create.vue src/views/user/__tests__/RoleAssign.spec.ts src/views/user/__tests__/Freeze.spec.ts src/views/notification/__tests__/List.spec.ts src/views/reservation/__tests__/Create.spec.ts
git commit -m "feat(common): 统一下拉按钮与菜单包装层"
```
