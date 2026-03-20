<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

import type { ApprovalMode as CategoryApprovalMode } from '@/api/categories'
import { ApprovalMode, ApprovalModeLabel } from '@/enums'

interface CategoryFormValue {
  name: string
  parentName: string | null
  sortOrder: number
  description: string
  defaultApprovalMode: CategoryApprovalMode
}

/**
 * 设备分类表单。
 * 分类提交值与后端 DTO 完全对齐，尤其 `parentName` 与 `defaultApprovalMode` 不能偷换成旧口径字段，否则会直接影响后续审批链快照。
 */
const props = defineProps<{
  initialValue: CategoryFormValue
  categoryOptions: Array<{ label: string; value: string; children?: unknown[] }>
  submitting?: boolean
}>()

const emit = defineEmits<{
  submit: [value: CategoryFormValue]
}>()

const formState = reactive<CategoryFormValue>({
  name: '',
  parentName: null,
  sortOrder: 1,
  description: '',
  defaultApprovalMode: ApprovalMode.DEVICE_ONLY as CategoryApprovalMode,
})

const parentCategoryOptions = computed(() =>
  props.categoryOptions.map((item) => ({
    label: item.label,
    value: item.value,
  })),
)

watch(
  () => props.initialValue,
  (value) => {
    Object.assign(formState, value)
  },
  { immediate: true, deep: true },
)

function handleSubmit() {
  if (!formState.name.trim()) {
    return
  }

  emit('submit', { ...formState })
}
</script>

<template>
  <el-form label-position="top" class="category-form">
    <div class="category-form__grid">
      <el-form-item label="分类名称">
        <el-input
          v-model="formState.name"
          class="category-form__name"
          placeholder="请输入分类名称"
        />
      </el-form-item>

      <el-form-item label="父级分类">
        <!-- 后端当前只支持用根分类名称关联父级，因此这里主动裁掉子节点，避免用户选到服务端无法识别的非根分类。 -->
        <el-tree-select
          v-model="formState.parentName"
          class="category-form__parent"
          :data="parentCategoryOptions"
          node-key="value"
          check-strictly
          default-expand-all
          clearable
          placeholder="不选择则创建为顶级分类"
        />
      </el-form-item>

      <el-form-item label="排序">
        <el-input-number v-model="formState.sortOrder" class="category-form__sort-order" :min="1" />
      </el-form-item>

      <el-form-item label="默认审批模式">
        <el-select
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
        </el-select>
      </el-form-item>

      <el-form-item label="分类描述" class="category-form__description-item">
        <el-input
          v-model="formState.description"
          class="category-form__description"
          type="textarea"
          :rows="4"
          placeholder="请输入分类描述"
        />
      </el-form-item>
    </div>

    <div class="category-form__actions">
      <el-button
        class="category-form__submit"
        type="primary"
        :loading="submitting"
        @click="handleSubmit"
      >
        保存分类
      </el-button>
    </div>
  </el-form>
</template>

<style scoped lang="scss">
.category-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 18px;
}

.category-form__description-item {
  grid-column: 1 / -1;
}

.category-form__actions {
  display: flex;
  justify-content: flex-end;
}
</style>
