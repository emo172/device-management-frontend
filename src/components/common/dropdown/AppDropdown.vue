<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue'

import type { AppDropdownItem } from './types'

defineOptions({
  inheritAttrs: false,
})

/**
 * AppDropdown 统一按钮型下拉的交互边界：
 * 业务插槽只能补充按钮或菜单项内部内容，不能替换外层原生 button 与菜单项语义，
 * 这样主题切换、用户菜单等场景才能共享同一套可访问性和危险项约束。
 */
const props = withDefaults(
  defineProps<{
    items: AppDropdownItem[]
    disabled?: boolean
    trigger?: 'click' | 'hover' | 'contextmenu'
    placement?: string
    teleported?: boolean
    showArrow?: boolean
  }>(),
  {
    trigger: 'click',
    placement: 'bottom-end',
    teleported: true,
    showArrow: true,
  },
)

const emit = defineEmits<{
  select: [item: AppDropdownItem]
  'visible-change': [visible: boolean]
}>()

const attrs = useAttrs()
const visible = ref(false)

// class/style 继续留在根节点，保证父层仍能像布局容器一样控制下拉占位。
const rootAttrs = computed(() => ({
  class: attrs.class,
  style: attrs.style,
}))

function isTriggerDomListener(key: string) {
  return /^on[A-Z]/.test(key) && key !== 'onVisibleChange' && key !== 'onSelect'
}

function isRootLayoutAttr(key: string) {
  return key === 'class' || key === 'style'
}

// 除根节点布局 attrs 外，其余原生按钮属性默认交给触发器，避免 id、title 等可访问性语义被包装层吞掉。
const triggerAttrs = computed(() =>
  Object.fromEntries(
    Object.entries(attrs).filter(
      ([key]) => !isRootLayoutAttr(key) && (isTriggerDomListener(key) || !/^on[A-Z]/.test(key)),
    ),
  ),
)

function getItemClass(item: AppDropdownItem) {
  return [
    'app-dropdown__item',
    item.active && !item.danger ? 'app-dropdown__item--active' : undefined,
    item.danger ? 'app-dropdown__item--danger' : undefined,
  ]
}

function handleVisibleChange(nextVisible: boolean) {
  visible.value = nextVisible
  emit('visible-change', nextVisible)
}

function handleItemSelect(item: AppDropdownItem) {
  if (item.disabled) {
    return
  }

  emit('select', item)
}
</script>

<template>
  <div class="app-dropdown" v-bind="rootAttrs">
    <el-dropdown
      :disabled="props.disabled"
      :trigger="props.trigger"
      :placement="props.placement"
      :teleported="props.teleported"
      @visible-change="handleVisibleChange"
    >
      <button
        type="button"
        class="app-dropdown__trigger"
        v-bind="triggerAttrs"
        :disabled="props.disabled"
        aria-haspopup="menu"
        :aria-expanded="visible"
      >
        <!-- trigger 插槽只承接按钮内部内容，真正的可点击壳层始终由包装组件统一提供。 -->
        <slot name="trigger" />
        <span v-if="props.showArrow" class="app-dropdown__arrow" aria-hidden="true" />
      </button>

      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="item in props.items"
            :key="item.key"
            :class="getItemClass(item)"
            :data-testid="item.testId"
            :disabled="item.disabled"
            :divided="item.divided"
            @click="handleItemSelect(item)"
          >
            <!-- item 插槽只接管菜单项内部排版，禁用态、危险态和外层 class 仍由包装组件统一收口。 -->
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
</template>

<style scoped lang="scss">
.app-dropdown {
  display: inline-flex;
}

.app-dropdown__trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid var(--app-border-soft, rgba(15, 23, 42, 0.12));
  border-radius: 999px;
  background: var(--app-surface-glass-strong, rgba(255, 255, 255, 0.92));
  box-shadow: var(--app-shadow-solid, 0 10px 30px rgba(15, 23, 42, 0.08));
  color: inherit;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.app-dropdown__trigger:hover {
  border-color: var(--app-border-strong, rgba(59, 130, 246, 0.5));
}

.app-dropdown__trigger:focus-visible {
  outline: none;
  box-shadow: var(--app-focus-ring, 0 0 0 3px rgba(59, 130, 246, 0.18));
}

.app-dropdown__trigger:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.app-dropdown__arrow {
  display: inline-flex;
  inline-size: 8px;
  block-size: 8px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg) translateY(-1px);
}

.app-dropdown__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  inline-size: 100%;
}

.app-dropdown__item--active {
  color: var(--el-color-primary, #409eff);
}

.app-dropdown__item--danger {
  color: var(--el-color-danger, #f56c6c);
}

.app-dropdown__icon,
.app-dropdown__label,
.app-dropdown__meta {
  display: inline-flex;
  align-items: center;
}

.app-dropdown__label {
  flex: 1;
}

.app-dropdown__meta {
  color: var(--el-text-color-secondary, #909399);
  font-size: 12px;
}
</style>
