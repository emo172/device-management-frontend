<script setup lang="ts">
import type { ApprovalMode as CategoryApprovalMode } from '@/api/categories'
import CategoryForm from '@/components/form/CategoryForm.vue'
import ConsoleFeedbackSurface from '@/components/layout/ConsoleFeedbackSurface.vue'
import { ApprovalMode } from '@/enums'

interface CategoryFormValue {
  name: string
  parentName: string | null
  sortOrder: number
  description: string
  defaultApprovalMode: CategoryApprovalMode
}

/**
 * 分类管理弹窗。
 * 分类页的新增入口统一通过该弹窗承接，避免在树形列表页里直接堆叠过多表单字段影响浏览密度。
 */
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    categoryOptions: Array<{ label: string; value: string; children?: unknown[] }>
    submitting?: boolean
  }>(),
  {
    submitting: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [value: CategoryFormValue]
}>()

const initialValue: CategoryFormValue = {
  name: '',
  parentName: null,
  sortOrder: 1,
  description: '',
  defaultApprovalMode: ApprovalMode.DEVICE_ONLY,
}

function handleSubmit(payload: CategoryFormValue) {
  emit('submit', payload)
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="新建设备分类"
    width="640px"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <ConsoleFeedbackSurface class="manage-category-dialog__surface" state="confirm">
      <template #confirm>
        <CategoryForm
          :initial-value="initialValue"
          :category-options="categoryOptions"
          :submitting="submitting"
          @submit="handleSubmit"
        />
      </template>
    </ConsoleFeedbackSurface>
  </el-dialog>
</template>

<style scoped lang="scss">
.manage-category-dialog__surface {
  min-height: auto;
  align-items: stretch;
  text-align: left;
}
</style>
