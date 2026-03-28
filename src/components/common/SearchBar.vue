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
