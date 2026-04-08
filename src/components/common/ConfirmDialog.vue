<script setup lang="ts">
import ConsoleFeedbackSurface from '@/components/layout/ConsoleFeedbackSurface.vue'

type ConfirmButtonType = 'primary' | 'success' | 'warning' | 'danger' | 'info'

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
    /**
     * 父层可在提交完成前继续锁住确认机会，覆盖弹窗关闭过渡期里按钮仍短暂可见的场景。
     */
    confirmDisabled?: boolean
    /** 高风险操作可显式切到 danger，普通确认保持 primary。 */
    confirmType?: ConfirmButtonType
  }>(),
  {
    confirmText: '确认',
    cancelText: '取消',
    loading: false,
    confirmDisabled: false,
    confirmType: 'primary',
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

function handleConfirm(loading: boolean, confirmDisabled: boolean) {
  if (loading || confirmDisabled) {
    return
  }

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
    <ConsoleFeedbackSurface class="confirm-dialog__surface" state="confirm">
      <template #confirm>
        <p class="confirm-dialog__message">{{ message }}</p>
      </template>
    </ConsoleFeedbackSurface>

    <template #footer>
      <div class="confirm-dialog__footer">
        <el-button class="confirm-dialog__cancel" @click="handleCancel">{{ cancelText }}</el-button>
        <el-button
          class="confirm-dialog__confirm"
          :type="confirmType"
          :loading="loading"
          :disabled="loading || confirmDisabled"
          @click="handleConfirm(loading, confirmDisabled)"
        >
          {{ confirmText }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.confirm-dialog__surface {
  min-height: auto;
  align-items: stretch;
  text-align: left;
}

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

// 危险确认操作保持更强实体感，避免和取消按钮一样轻，降低误判操作层级。
.confirm-dialog__confirm {
  font-weight: 600;
}
</style>
