<script setup lang="ts">
import { computed, useAttrs, useSlots } from 'vue'
import type { Component } from 'vue'

defineOptions({
  inheritAttrs: false,
})

/**
 * AppTreeSelect 只负责收口树选择器的触发器语义与 attrs 边界：
 * `class/style` 留给根节点承接布局，`data-* / aria-* / 其余非布局 attrs` 继续透传给内部 `el-tree-select`，
 * 同时只开放统一前置区 `#prefix`，避免业务页重新打开默认 slot 或节点内容自定义，破坏下拉体系的一致交互。
 * 单选 clearable 清空时，Element Plus 可能回传空字符串或 `undefined`，这里统一归一为 `null`；
 * 多选仍保留数组语义，不能被包装层擅自改成 `null`。
 */
const incomingProps = defineProps<{
  modelValue?: unknown
  data?: unknown[]
  props?: Record<string, unknown>
  leadingIcon?: Component
  nodeKey?: string
  checkStrictly?: boolean
  defaultExpandAll?: boolean
  clearable?: boolean
  placeholder?: string
  disabled?: boolean
  multiple?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: unknown]
  change: [value: unknown]
  'visible-change': [visible: boolean]
}>()

const attrs = useAttrs()
const slots = useSlots()

// 根节点只接布局职责，避免父层 class/style 直接落到 Element Plus 触发器后打乱表单对齐。
const rootAttrs = computed(() => ({
  class: attrs.class,
  style: attrs.style,
}))

// 显式屏蔽 popper 私有入口，保持树选择面板继续走统一下拉面板契约。
const treeSelectAttrs = computed(() => {
  const nextAttrs = { ...attrs }

  delete nextAttrs.class
  delete nextAttrs.style
  delete nextAttrs['popper-class']
  delete nextAttrs.popperClass

  return nextAttrs
})

const hasPrefix = computed(() => Boolean(incomingProps.leadingIcon || slots.prefix))

function normalizeModelValue(value: unknown) {
  if (incomingProps.multiple) {
    return value
  }

  if (incomingProps.clearable && (value === '' || value === undefined)) {
    return null
  }

  return value
}

function handleModelValueChange(value: unknown) {
  emit('update:modelValue', normalizeModelValue(value))
}

function handleChange(value: unknown) {
  emit('change', normalizeModelValue(value))
}

function handleVisibleChange(visible: boolean) {
  emit('visible-change', visible)
}
</script>

<template>
  <div class="app-tree-select" v-bind="rootAttrs">
    <el-tree-select
      class="app-tree-select__control"
      :model-value="incomingProps.modelValue"
      :data="incomingProps.data"
      :props="incomingProps.props"
      :node-key="incomingProps.nodeKey"
      :check-strictly="incomingProps.checkStrictly"
      :default-expand-all="incomingProps.defaultExpandAll"
      :clearable="incomingProps.clearable"
      :placeholder="incomingProps.placeholder"
      :disabled="incomingProps.disabled"
      :multiple="incomingProps.multiple"
      v-bind="treeSelectAttrs"
      @update:modelValue="handleModelValueChange"
      @change="handleChange"
      @visible-change="handleVisibleChange"
    >
      <!-- 只有存在图标或 prefix 插槽时才渲染前置区，避免与 AppSelect 共用视觉语言时出现空白占位。 -->
      <template v-if="hasPrefix" #prefix>
        <span class="app-tree-select__prefix">
          <slot name="prefix">
            <component :is="incomingProps.leadingIcon" />
          </slot>
        </span>
      </template>
    </el-tree-select>
  </div>
</template>

<style scoped lang="scss">
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

.app-tree-select__prefix {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 16px;
  margin-right: 6px;
  color: var(--app-text-secondary, var(--el-text-color-secondary, #909399));
}
</style>
