<script setup lang="ts">
import { reactive, watch } from 'vue'

import type { CategoryTreeResponse } from '@/api/categories'

type DeviceFormMode = 'create' | 'edit'

interface DeviceFormValue {
  name: string
  deviceNumber: string
  categoryName: string
  location: string
  description: string
}

/**
 * 设备表单组件。
 * 创建设备与编辑设备共用一套字段结构，但编辑模式必须锁定设备编号，防止前端误改后破坏后端的唯一识别口径。
 */
const props = withDefaults(
  defineProps<{
    mode: DeviceFormMode
    initialValue: DeviceFormValue
    categoryOptions: Array<
      Pick<CategoryTreeResponse, 'name'> | { label: string; value: string; children?: unknown[] }
    >
    submitting?: boolean
  }>(),
  {
    submitting: false,
  },
)

const emit = defineEmits<{
  submit: [value: DeviceFormValue]
}>()

const formState = reactive<DeviceFormValue>({
  name: '',
  deviceNumber: '',
  categoryName: '',
  location: '',
  description: '',
})

watch(
  () => props.initialValue,
  (value) => {
    Object.assign(formState, value)
  },
  { immediate: true, deep: true },
)

function handleSubmit() {
  if (!formState.name.trim() || !formState.deviceNumber.trim()) {
    return
  }

  emit('submit', { ...formState })
}
</script>

<template>
  <el-form label-position="top" class="device-form">
    <div class="device-form__grid">
      <el-form-item label="设备名称">
        <el-input v-model="formState.name" class="device-form__name" placeholder="请输入设备名称" />
      </el-form-item>

      <el-form-item label="设备编号">
        <!-- 编辑模式下禁止修改设备编号，避免把设备档案与借还记录的唯一识别码改乱。 -->
        <el-input
          v-model="formState.deviceNumber"
          class="device-form__number"
          :disabled="mode === 'edit'"
          placeholder="请输入设备编号"
        />
      </el-form-item>

      <el-form-item label="分类">
        <el-tree-select
          v-model="formState.categoryName"
          class="device-form__category"
          :data="categoryOptions"
          node-key="value"
          check-strictly
          default-expand-all
          placeholder="请选择设备分类"
        />
      </el-form-item>

      <el-form-item label="位置">
        <el-input
          v-model="formState.location"
          class="device-form__location"
          placeholder="请输入存放位置"
        />
      </el-form-item>

      <el-form-item label="设备描述" class="device-form__description-item">
        <el-input
          v-model="formState.description"
          class="device-form__description"
          type="textarea"
          :rows="4"
          placeholder="请输入设备描述"
        />
      </el-form-item>
    </div>

    <div class="device-form__actions">
      <el-button
        class="device-form__submit"
        type="primary"
        :loading="submitting"
        @click="handleSubmit"
      >
        {{ mode === 'create' ? '创建设备' : '保存变更' }}
      </el-button>
    </div>
  </el-form>
</template>

<style scoped lang="scss">
.device-form {
  padding: 24px;
  border: 1px solid var(--app-border-soft);
  border-radius: var(--app-radius-lg);
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-solid);
}

// 设备表单包含输入、树选择与多行描述，统一抬到实体表面后深色主题才不会留下发灰的浅色控件底。
.device-form :deep(.el-input__wrapper),
.device-form :deep(.el-select__wrapper),
.device-form :deep(.el-textarea__inner),
.device-form :deep(.el-input-number) {
  background: var(--app-surface-card-strong);
  box-shadow: inset 0 0 0 1px var(--app-border-soft);
}

.device-form :deep(.el-input__wrapper:hover),
.device-form :deep(.el-select__wrapper:hover),
.device-form :deep(.el-textarea__inner:hover),
.device-form :deep(.el-input-number:hover) {
  box-shadow: inset 0 0 0 1px var(--app-border-strong);
}

.device-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 18px;
}

.device-form__description-item {
  grid-column: 1 / -1;
}

.device-form__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>
