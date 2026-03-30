<script setup lang="ts">
import { computed, useAttrs, useSlots } from 'vue'
import type { Component } from 'vue'

defineOptions({
  inheritAttrs: false,
})

/**
 * AppSelect 只收口表单型选择器的触发器与 attrs 边界：
 * `class/style` 留给根节点承接布局，`data-* / aria-* / 其余非布局 attrs` 继续透传给内部 `el-select`，
 * `change / visible-change` 则由包装层统一转发，避免业务页重新感知 Element Plus 的私有入口细节。
 * clearable 在单选场景下清空后产生的原始空值必须保持不变，避免包装层擅自改成 `null` 破坏既有表单语义。
 */
const incomingProps = defineProps<{
  modelValue?: unknown
  leadingIcon?: Component
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: unknown]
  change: [value: unknown]
  'visible-change': [visible: boolean]
}>()

const attrs = useAttrs()
const slots = useSlots()

// 根节点只接布局职责，避免父层 class/style 被误落到 Element Plus 触发器上打乱表单对齐。
const rootAttrs = computed(() => ({
  class: attrs.class,
  style: attrs.style,
}))

// 显式屏蔽 popper 私有入口，防止业务页再次绕过统一面板契约；其余 attrs 继续交给内部 el-select。
const selectAttrs = computed(() => {
  const nextAttrs = { ...attrs }

  delete nextAttrs.class
  delete nextAttrs.style
  delete nextAttrs['popper-class']
  delete nextAttrs.popperClass

  return nextAttrs
})

const hasPrefix = computed(() => Boolean(incomingProps.leadingIcon || slots.prefix))

function handleModelValueChange(value: unknown) {
  // AppSelect 不做空值归一，Element Plus 返回什么值就原样交回业务层。
  emit('update:modelValue', value)
}

function handleChange(value: unknown) {
  emit('change', value)
}

function handleVisibleChange(visible: boolean) {
  emit('visible-change', visible)
}
</script>

<template>
  <div class="app-select" v-bind="rootAttrs">
    <el-select
      class="app-select__control"
      :model-value="incomingProps.modelValue"
      :placeholder="incomingProps.placeholder"
      :disabled="incomingProps.disabled"
      v-bind="selectAttrs"
      @update:modelValue="handleModelValueChange"
      @change="handleChange"
      @visible-change="handleVisibleChange"
    >
      <!-- 只有存在图标或 prefix 插槽时才渲染前置区，避免无图标时留下空白占位。 -->
      <template v-if="hasPrefix" #prefix>
        <span class="app-select__prefix">
          <slot name="prefix">
            <component :is="incomingProps.leadingIcon" />
          </slot>
        </span>
      </template>

      <slot />
    </el-select>
  </div>
</template>

<style scoped lang="scss">
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
  color: var(--app-text-secondary, var(--el-text-color-secondary, #909399));
}
</style>
