<script setup lang="ts">
import { useId } from 'vue'

import ConsoleFilterPanel from '@/components/layout/ConsoleFilterPanel.vue'

/**
 * 通用轻量搜索栏。
 * 现在统一承接列表页顶部筛选卡片语义，保证标题、说明、字段区和操作区在不同业务页都复用同一层级，
 * 这样迁移到 ConsoleFilterPanel 后，页面文案、样式和自动化测试都能围绕稳定 DOM 结构演进。
 */
const props = withDefaults(
  defineProps<{
    modelValue: string
    title?: string
    description?: string
    eyebrow?: string
    placeholder?: string
    label?: string
  }>(),
  {
    title: '筛选条件',
    description: '调整条件后更新当前列表结果。',
    eyebrow: '筛选与操作',
    placeholder: '请输入关键字',
    label: '筛选条件',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [value: string]
  reset: []
}>()

// 顶部筛选卡片迁移后仍要保留基础可访问性，让可视标签能稳定关联到真实输入框。
const inputId = useId()

function handleSearch() {
  emit('search', props.modelValue)
}

function handleInput(value: string) {
  emit('update:modelValue', value)
}

function handleReset() {
  emit('update:modelValue', '')
  emit('reset')
}
</script>

<template>
  <ConsoleFilterPanel
    class="search-bar"
    :eyebrow="eyebrow"
    :title="title"
    :description="description"
  >
    <div class="search-bar__field">
      <label class="search-bar__label" :for="inputId">{{ label }}</label>
      <el-input
        :id="inputId"
        :model-value="modelValue"
        :placeholder="placeholder"
        clearable
        @update:modelValue="handleInput"
      />
    </div>

    <template #actions>
      <div class="search-bar__actions">
        <el-button class="search-bar__submit" type="primary" @click="handleSearch">查询</el-button>
        <el-button class="search-bar__reset" @click="handleReset">重置</el-button>
      </div>
    </template>
  </ConsoleFilterPanel>
</template>

<style scoped lang="scss">
.search-bar__field,
.search-bar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-bar__field {
  flex: 1;
}

.search-bar :deep(.console-filter-panel__fields) {
  min-width: min(100%, 480px);
}

.search-bar :deep(.el-input) {
  max-width: 320px;
}

// 搜索栏壳层可以保持玻璃感，但输入区必须切到实体 token，避免深色主题下留下发灰的浅色输入底。
.search-bar :deep(.el-input__wrapper) {
  background: var(--app-surface-card-strong);
  box-shadow: inset 0 0 0 1px var(--app-border-soft);
}

.search-bar :deep(.el-input__wrapper:hover) {
  box-shadow: inset 0 0 0 1px var(--app-border-strong);
}

.search-bar__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-secondary);
  white-space: nowrap;
}

@media (max-width: 1366px) {
  .search-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-bar__actions {
    justify-content: flex-end;
    flex-wrap: wrap;
  }
}
</style>
