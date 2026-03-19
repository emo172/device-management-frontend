<script setup lang="ts">
import ConsoleToolbarShell from '@/components/layout/ConsoleToolbarShell.vue'

/**
 * 通用轻量搜索栏。
 * 当前主要承接设备列表按分类名称筛选，采用最小输入模型，便于其他列表页后续复用同一交互骨架。
 */
const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    label?: string
  }>(),
  {
    placeholder: '请输入关键字',
    label: '筛选条件',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [value: string]
  reset: []
}>()

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
  <ConsoleToolbarShell class="search-bar search-bar__surface">
    <div class="search-bar__field">
      <span class="search-bar__label">{{ label }}</span>
      <el-input
        :model-value="modelValue"
        :placeholder="placeholder"
        clearable
        @update:modelValue="handleInput"
      />
    </div>

    <div class="search-bar__actions">
      <el-button class="search-bar__submit" type="primary" @click="handleSearch">查询</el-button>
      <el-button class="search-bar__reset" @click="handleReset">重置</el-button>
    </div>
  </ConsoleToolbarShell>
</template>

<style scoped lang="scss">
.search-bar {
  justify-content: space-between;
}

.search-bar__field,
.search-bar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-bar__field {
  flex: 1;
}

.search-bar :deep(.el-input) {
  max-width: 320px;
}

// 工具条壳层更轻玻璃，但输入内容区要更稳，避免筛选词在高亮背景里发虚。
.search-bar :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.94);
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
