<script setup lang="ts">
/**
 * 通用确认弹窗。
 * 删除、状态变更等高风险操作统一走该弹窗，确保页面层能复用一致的确认语义与关闭时机。
 */
withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    loading?: boolean
  }>(),
  {
    confirmText: '确认',
    cancelText: '取消',
    loading: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

function handleCancel() {
  emit('cancel')
  emit('update:modelValue', false)
}

function handleConfirm() {
  emit('confirm')
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="420px"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <p class="confirm-dialog__message">{{ message }}</p>

    <template #footer>
      <div class="confirm-dialog__footer">
        <el-button class="confirm-dialog__cancel" @click="handleCancel">{{ cancelText }}</el-button>
        <el-button
          class="confirm-dialog__confirm"
          type="primary"
          :loading="loading"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.confirm-dialog__message {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--app-text-secondary);
}

.confirm-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
