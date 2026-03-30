<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

import type { ApprovalMode as CategoryApprovalMode } from '@/api/categories'
import AppSelect from '@/components/common/dropdown/AppSelect.vue'
import AppTreeSelect from '@/components/common/dropdown/AppTreeSelect.vue'
import { ApprovalMode, ApprovalModeLabel } from '@/enums'

interface CategoryFormValue {
  name: string
  parentName: string | null
  sortOrder: number
  description: string
  defaultApprovalMode: CategoryApprovalMode
}

interface CategoryFormSourceValue {
  name: string
  parentName?: unknown
  sortOrder: number
  description: string
  defaultApprovalMode?: unknown
}

/**
 * 设备分类表单。
 * 分类提交值与后端 DTO 完全对齐，尤其 `parentName` 与 `defaultApprovalMode` 不能偷换成旧口径字段，否则会直接影响后续审批链快照。
 * 父级分类与审批模式统一改走包装下拉，后续分类、设备、预约表单才能收敛到同一套触发器与面板语义。
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

// 父级分类的合法值只能来自当前根分类选项；选项变化后，这里也会同步收敛历史脏值，避免表单继续保留已失效名称。
const rootCategoryValueSet = computed(() => new Set(props.categoryOptions.map((item) => item.value)))

/**
 * 父级分类仍只允许提交根分类名称：
 * 后端当前按根分类名称解析 `parentName`，这里继续裁掉子节点，避免树选择把不受支持的层级名称直接送进 DTO。
 */
const parentCategoryOptions = computed(() =>
  props.categoryOptions.map((item) => ({
    label: item.label,
    value: item.value,
  })),
)

/**
 * 父级分类必须继续走包装树选择器：
 * 一方面要和设备/预约表单共用同一套下拉触发器与面板契约，避免分类表单回到本地补旧 `el-tree-select` 样式；
 * 另一方面单选 clearable 的原始空值可能是空字符串或 `undefined`，这里统一归一为 `null`，守住顶级分类 DTO 的 `parentName: null` 语义。
 */
function normalizeParentName(value: unknown): string | null {
  if (typeof value !== 'string' || !value) {
    return null
  }

  return rootCategoryValueSet.value.has(value) ? value : null
}

/**
 * 审批模式也要在表单层做最后一道兜底：
 * 旧数据、联调脏值或类型逃逸都可能把非法字符串灌进来，这里统一回退到默认枚举，避免提交给后端不可识别的审批模式。
 */
function normalizeApprovalMode(value: unknown): CategoryApprovalMode {
  if (value === ApprovalMode.DEVICE_ONLY || value === ApprovalMode.DEVICE_THEN_SYSTEM) {
    return value as CategoryApprovalMode
  }

  return ApprovalMode.DEVICE_ONLY as CategoryApprovalMode
}

/**
 * 初始值同步、props 二次同步与提交前兜底都复用同一套归一逻辑，避免 `parentName` 和 `defaultApprovalMode`
 * 在不同入口出现不同语义，导致表单显示值和最终提交值再次分叉。
 */
function normalizeCategoryFormValue(value: CategoryFormSourceValue): CategoryFormValue {
  return {
    name: value.name,
    parentName: normalizeParentName(value.parentName),
    sortOrder: value.sortOrder,
    description: value.description,
    defaultApprovalMode: normalizeApprovalMode(value.defaultApprovalMode),
  }
}

function handleParentCategoryChange(value: unknown) {
  formState.parentName = normalizeParentName(value)
}

/**
 * 包装下拉对外暴露统一的 `unknown` 事件签名，表单层需要在这里收敛回审批模式枚举，避免状态被误写成任意字符串。
 */
function handleApprovalModeChange(value: unknown) {
  formState.defaultApprovalMode = normalizeApprovalMode(value)
}

watch(
  () => props.initialValue,
  (value) => {
    Object.assign(formState, normalizeCategoryFormValue(value))
  },
  { immediate: true, deep: true },
)

watch(
  rootCategoryValueSet,
  () => {
    // 根分类集合变化时只重新收敛当前父级分类，避免把用户已编辑的其他字段误重置回 initialValue。
    formState.parentName = normalizeParentName(formState.parentName)
  },
  { flush: 'sync' },
)

function handleSubmit() {
  if (!formState.name.trim()) {
    return
  }

  emit('submit', normalizeCategoryFormValue(formState))
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
        <!-- 父级分类继续走统一包装组件，既要复用同一套下拉语义，也要把 clearable 清空后的空值稳定收敛成 DTO 需要的 null。 -->
        <AppTreeSelect
          :model-value="formState.parentName"
          class="category-form__parent"
          :data="parentCategoryOptions"
          node-key="value"
          check-strictly
          default-expand-all
          clearable
          placeholder="不选择则创建为顶级分类"
          @update:modelValue="handleParentCategoryChange"
        />
      </el-form-item>

      <el-form-item label="排序">
        <el-input-number v-model="formState.sortOrder" class="category-form__sort-order" :min="1" />
      </el-form-item>

      <el-form-item label="默认审批模式">
        <AppSelect
          :model-value="formState.defaultApprovalMode"
          class="category-form__approval-mode"
          placeholder="请选择默认审批模式"
          @update:modelValue="handleApprovalModeChange"
        >
          <el-option
            v-for="mode in Object.values(ApprovalMode)"
            :key="mode"
            :label="ApprovalModeLabel[mode]"
            :value="mode"
          />
        </AppSelect>
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
  gap: 12px;
  padding: 24px;
  border: 1px solid var(--app-border-soft);
  border-radius: var(--app-radius-lg);
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-solid);
}

// 分类表单会同时承载树选择、数字输入和审批模式切换，统一输入语义后才能和设备/预约表单保持同一主题层级。
.category-form :deep(.el-input__wrapper),
.category-form :deep(.el-textarea__inner),
.category-form :deep(.el-input-number) {
  background: var(--app-surface-card-strong);
  box-shadow: inset 0 0 0 1px var(--app-border-soft);
}

.category-form :deep(.el-input__wrapper:hover),
.category-form :deep(.el-textarea__inner:hover),
.category-form :deep(.el-input-number:hover) {
  box-shadow: inset 0 0 0 1px var(--app-border-strong);
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
