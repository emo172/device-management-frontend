<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { ManualProcessRequest, ReservationListItemResponse } from '@/api/reservations'

/**
 * 人工处理弹窗。
 * 设备管理员在预约进入 `PENDING_MANUAL` 后，需要明确做出“确认借用”或“取消预约”的最终裁决，
 * 因此这里把两种动作收敛到一个弹窗里，避免页面层自行拼装不同按钮导致口径分散。
 */
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    reservation?: ReservationListItemResponse | null
    loading?: boolean
  }>(),
  {
    reservation: null,
    loading: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: ManualProcessRequest]
}>()

const remark = ref('')
const reservationName = computed(() => props.reservation?.deviceName || '当前预约')
const canSubmit = computed(() => remark.value.trim().length > 0)

watch(
  () => props.modelValue,
  (opened) => {
    if (!opened) {
      remark.value = ''
    }
  },
)

function handleClose() {
  emit('update:modelValue', false)
}

function handleSubmit(approved: boolean) {
  if (!canSubmit.value) {
    return
  }

  emit('submit', {
    approved,
    remark: remark.value.trim(),
  })
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="人工处理"
    width="520px"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="manual-process-dialog">
      <p class="manual-process-dialog__description">
        {{ reservationName }} 已进入待人工处理阶段，请根据现场交接结果确认借用或取消预约。
      </p>

      <el-form label-position="top">
        <el-form-item label="处理说明">
          <el-input
            v-model="remark"
            type="textarea"
            :rows="4"
            maxlength="120"
            show-word-limit
            placeholder="请输入处理说明，例如：设备已现场交接 / 用户未到场，取消预约"
          />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="manual-process-dialog__footer">
        <el-button @click="handleClose">返回</el-button>
        <el-button
          data-testid="manual-process-reject"
          type="danger"
          :disabled="!canSubmit"
          :loading="loading"
          @click="handleSubmit(false)"
        >
          取消预约
        </el-button>
        <el-button
          data-testid="manual-process-approve"
          type="primary"
          :disabled="!canSubmit"
          :loading="loading"
          @click="handleSubmit(true)"
        >
          确认借用
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.manual-process-dialog__description {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--app-text-secondary);
}

.manual-process-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
