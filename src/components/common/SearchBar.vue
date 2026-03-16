<script setup lang="ts">
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
  <div class="search-bar">
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
      <el-button class="search-bar__submit" type="primary" @click="handleSearch"> 查询 </el-button>
      <el-button class="search-bar__reset" @click="handleReset">重置</el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.search-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border: 1px solid var(--app-border-color);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.88);
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

.search-bar__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-secondary);
  white-space: nowrap;
}
</style>
